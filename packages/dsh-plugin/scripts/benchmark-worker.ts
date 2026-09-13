import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { Context } from "@deepseek-ai/cordis";
import { agentEvents } from "@deepseek-ai/dsh-agent";
import {
  mountAgentLoopTestDependencies,
  mountAgentLoopTestHarness,
} from "@deepseek-ai/dsh-agent-loop-testkit";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import { estimateTokens } from "../src/tokenize.ts";
import { caller, fixturePaths } from "../tests/fixtures.ts";
import { RecordingAdapter } from "../tests/recording-adapter.ts";

declare module "@deepseek-ai/dsh-session/types" {
  interface SessionEventMap {
    "memory-benchmark/noop": { index: number };
  }
}

/** Select a percentile from sorted wall-clock samples. */
function percentile(samples: number[], ratio: number): number {
  return samples.toSorted((a, b) => a - b)[Math.ceil(samples.length * ratio) - 1];
}

/** Count retained direct children while excluding the observer process itself. */
function childProcesses(): number {
  const lines = execFileSync("ps", ["-ax", "-o", "pid=,ppid=,comm="], { encoding: "utf8" });
  return lines
    .trim()
    .split("\n")
    .filter((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.+)$/);
      return match && Number(match[2]) === process.pid && !/(^|\/)ps$/.test(match[3]);
    }).length;
}

/** Measure storage and the production pre-step consumer without any paid provider or live profile. */
async function measure(): Promise<void> {
  const count = Number(process.argv[2]);
  const samples = Number(process.argv[3]);
  const ctx = new Context();
  await mountAgentLoopTestDependencies(ctx);
  const paths = fixturePaths();
  const adapter = new RecordingAdapter();
  ctx.llm.registerAdapter(["fixture"], adapter);
  const harness = await mountAgentLoopTestHarness(ctx);
  const historyAgents = [];
  for (const length of [100, 10000]) {
    const agent = await harness.create(
      SessionId(`history-${length}`),
      { provider: "fixture", model: "keyless" },
      { cwd: paths.workspace },
    );
    for (let index = 0; index < length; index++)
      agent.session.append("memory-benchmark/noop", { index });
    agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "baseline without memory" }],
      }),
    );
    await agent.whenIdle();
    historyAgents.push({ agent, length });
  }
  global.gc?.();
  const baselineRss = process.memoryUsage().rss;
  const baselineChildProcesses = childProcesses();
  const { default: Provider } = (await import(
    new URL("../dist/index.js", import.meta.url).href
  )) as typeof import("../src/index.ts");
  const recall = (await import(
    new URL("../dist/recall.js", import.meta.url).href
  )) as typeof import("../src/recall.ts");
  const tools = (await import(
    new URL("../dist/tools.js", import.meta.url).href
  )) as typeof import("../src/tools.ts");
  const started = performance.now();
  await ctx.plugin(Provider, { databasePath: paths.databasePath });
  const storeOpenMs = performance.now() - started;
  await ctx.plugin(recall);
  await ctx.plugin(tools);
  const prompt = await ctx.systemPrompt.assemble();
  const standingGuidanceEstimatedTokens = estimateTokens(
    prompt.sections.find((section) => section.name === "magic-memory:tools")?.text ?? "",
  );
  const toolSchemasEstimatedTokens = estimateTokens(JSON.stringify(ctx.tools.schemas()));
  const author = caller(paths.workspace);
  const idleRss = process.memoryUsage().rss;
  let peakRss = idleRss;
  for (let index = 0; index < count; index++) {
    ctx.magicMemory.store.remember(author, {
      requestId: `row-${index}`,
      scope: "workspace",
      category: "CONSTRAINTS",
      content: `四川生产库 shard${index} uses /src/storage${index}.ts; getUserById records ECONNRESET only after confirmed failure.`,
    });
    if (index % 100 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  const queryTimes: number[] = [];
  const snapshotTimes: number[] = [];
  let snapshotEstimatedTokens = 0;
  for (let index = 0; index < samples; index++) {
    const beforeQuery = performance.now();
    ctx.magicMemory.store.recall(author.workspace, {
      query: `生产库 shard${index % count}`,
      includeGlobal: true,
      limit: 5,
    });
    queryTimes.push(performance.now() - beforeQuery);
    const beforeSnapshot = performance.now();
    const text = recall.renderSnapshot(
      ctx.magicMemory.store.recent(author.workspace, true, 5),
      1000,
    );
    snapshotTimes.push(performance.now() - beforeSnapshot);
    snapshotEstimatedTokens = Math.max(snapshotEstimatedTokens, estimateTokens(text));
  }
  const history: { events: number; preStepP95Ms: number }[] = [];
  let retainedSnapshotStateBytes = 0;
  for (const { agent, length } of historyAgents) {
    agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "memory probe" }],
      }),
    );
    await agent.whenIdle();
    const state = ctx.sessionProjections.stateOf(agent.session, "magicMemorySnapshot");
    retainedSnapshotStateBytes = Math.max(
      retainedSnapshotStateBytes,
      Buffer.byteLength(JSON.stringify(state)),
    );
    const times: number[] = [];
    const message = createUserMessage({
      source: { kind: "user" },
      content: [{ type: "text", text: "next probe" }],
    });
    for (let index = 0; index < samples; index++) {
      const begin = performance.now();
      await agentEvents(ctx, agent).waterfall(
        "agent/pre-step",
        { messages: [message], turn: 2, step: 1, signal: new AbortController().signal },
        async () => ({ kind: "enter" as const, messages: [message] }),
      );
      times.push(performance.now() - begin);
    }
    history.push({ events: length, preStepP95Ms: percentile(times, 0.95) });
  }
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const walBytes = statSync(`${paths.databasePath}-wal`).size;
  const databaseBytes = statSync(paths.databasePath).size;
  const additionalProcesses = childProcesses() - baselineChildProcesses;
  await ctx.fiber.dispose();
  console.log(
    JSON.stringify({
      records: count,
      storeOpenMs,
      queryP50Ms: percentile(queryTimes, 0.5),
      queryP95Ms: percentile(queryTimes, 0.95),
      snapshotP95Ms: percentile(snapshotTimes, 0.95),
      snapshotEstimatedTokens,
      baselineRssMiB: baselineRss / 1048576,
      idleRssMiB: idleRss / 1048576,
      peakRssMiB: peakRss / 1048576,
      additionalRssMiB: (peakRss - baselineRss) / 1048576,
      databaseBytes,
      walBytes,
      retainedSnapshotStateBytes,
      additionalProcesses,
      framingEstimatedTokens: estimateTokens(recall.renderSnapshot([], 1000)),
      standingGuidanceEstimatedTokens,
      toolSchemasEstimatedTokens,
      history,
      auxiliaryModelCalls: adapter.requests.length - 4,
    }),
  );
}

await measure();
