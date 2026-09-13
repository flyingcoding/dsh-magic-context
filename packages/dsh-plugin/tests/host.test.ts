import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { agentEvents } from "@deepseek-ai/dsh-agent";
import { createUserMessage, ToolCallId } from "@deepseek-ai/dsh-llm";
import { Session, type SessionEvent, SessionId, SessionLogOffset } from "@deepseek-ai/dsh-session";
import { renderSnapshot } from "../src/recall.ts";
import { workspaceKey } from "../src/scope.ts";
import { estimateTokens } from "../src/tokenize.ts";
import { caller, fixturePaths, host, requestText } from "./helpers.ts";

const agentOptions = { provider: "fixture", model: "memory-fixture" };

/** Identify this plugin's committed content without touching non-memory messages. */
function snapshots(events: readonly SessionEvent[]) {
  return events.filter(
    (event) =>
      event.type === "user/message" &&
      event.data.source.kind === "plugin" &&
      event.data.source.plugin === "magic-memory-recall",
  );
}

test("Session A writes through the real native tool path and fresh Session B recalls its fact", async () => {
  const paths = fixturePaths();
  const { ctx, adapter, harness } = await host(paths.databasePath);
  try {
    adapter.script.push([
      { type: "block-start", index: 0, blockType: "tool-call" },
      {
        type: "block-end",
        index: 0,
        block: {
          type: "tool-call",
          id: ToolCallId("remember-call"),
          name: "memory_remember",
          arguments: JSON.stringify({
            content: "Project release codename is 翠竹739",
            category: "PROJECT_RULES",
          }),
        },
      },
      { type: "finish", reason: { kind: "tool-calls" } },
    ]);
    const a = await harness.create(SessionId("writer"), agentOptions, { cwd: paths.workspace });
    a.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "Remember the confirmed release codename." }],
      }),
    );
    await a.whenIdle();
    const toolResult = a.session.snapshotEvents().find((event) => event.type === "tool/result");
    assert.ok(toolResult && toolResult.type === "tool/result");
    assert.equal(toolResult.data.message.content[0].isError, false);
    assert.match(JSON.stringify(toolResult.data), /翠竹739/);
    const b = await harness.create(SessionId("reader"), agentOptions, { cwd: paths.workspace });
    b.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "What is the confirmed codename?" }],
      }),
    );
    await b.whenIdle();
    assert.match(requestText(adapter.requests[adapter.requests.length - 1]), /翠竹739/);
    assert.equal(snapshots(b.session.snapshotEvents()).length, 1);
    const saved = ctx.magicMemory.store.recent(workspaceKey(paths.workspace), false, 5)[0];
    assert.equal(saved.provenance.sessionId, "writer");
    assert.equal(saved.provenance.callId, "remember-call");
    const c = await harness.create(SessionId("isolated-reader"), agentOptions, {
      cwd: paths.other,
    });
    c.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "What is the codename?" }],
      }),
    );
    await c.whenIdle();
    assert.doesNotMatch(requestText(adapter.requests[adapter.requests.length - 1]), /翠竹739/);
  } finally {
    await ctx.fiber.dispose();
  }
});

test("pre-admission cancellation records no delivery and the next accepted request retries", async () => {
  const paths = fixturePaths();
  const { ctx, adapter, harness } = await host(paths.databasePath);
  try {
    const author = caller(paths.workspace);
    const first = ctx.magicMemory.store.remember(author, {
      requestId: "old",
      content: "value-before-cancellation",
      category: "CONFIG_VALUES",
      scope: "workspace",
    });
    const agent = await harness.create(SessionId("cancel-reader"), agentOptions, {
      cwd: paths.workspace,
    });
    let reached!: () => void;
    const preparing = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const dispose = ctx.on("agent/request", async ({ signal }, next) => {
      reached();
      if (!signal.aborted)
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => resolve(), { once: true }),
        );
      return next();
    });
    agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "cancel this" }],
      }),
    );
    await preparing;
    agent.cancel({ kind: "user" });
    await agent.whenIdle();
    await dispose();
    assert.equal(adapter.requests.length, 0);
    assert.equal(snapshots(agent.session.snapshotEvents()).length, 0);
    assert.equal(
      ctx.sessionProjections.stateOf(agent.session, "magicMemorySnapshot")?.messageId,
      null,
    );
    ctx.magicMemory.store.update(author, {
      id: first.record.id,
      expectedRevision: 1,
      requestId: "new",
      scope: "workspace",
      category: "CONFIG_VALUES",
      content: "value-after-cancellation",
    });
    agent.followup(
      createUserMessage({ source: { kind: "user" }, content: [{ type: "text", text: "retry" }] }),
    );
    await agent.whenIdle();
    assert.equal(snapshots(agent.session.snapshotEvents()).length, 1);
    assert.match(requestText(adapter.requests[0]), /value-after-cancellation/);
    assert.doesNotMatch(requestText(adapter.requests[0]), /value-before-cancellation/);
  } finally {
    await ctx.fiber.dispose();
  }
});

test("committed snapshots replay byte-for-byte after database corrections and are inherited once by a fork", async () => {
  const paths = fixturePaths();
  const original = await host(paths.databasePath);
  const author = caller(paths.workspace);
  let events: readonly SessionEvent[];
  try {
    const first = original.ctx.magicMemory.store.remember(author, {
      requestId: "initial",
      content: "frozen-original-value",
      category: "CONFIG_VALUES",
      scope: "workspace",
    });
    const agent = await original.harness.create(SessionId("original"), agentOptions, {
      cwd: paths.workspace,
    });
    agent.followup(
      createUserMessage({ source: { kind: "user" }, content: [{ type: "text", text: "begin" }] }),
    );
    await agent.whenIdle();
    events = agent.session.snapshotEvents();
    const header = agent.session.header;
    writeFileSync(resolve(paths.root, "recorded-session.json"), JSON.stringify({ header, events }));
    original.ctx.magicMemory.store.update(author, {
      id: first.record.id,
      expectedRevision: 1,
      requestId: "correct",
      scope: "workspace",
      category: "CONFIG_VALUES",
      content: "new-current-value",
    });
  } finally {
    await original.ctx.fiber.dispose();
  }
  const restarted = await host(paths.databasePath);
  try {
    const recorded = JSON.parse(readFileSync(resolve(paths.root, "recorded-session.json"), "utf8"));
    const restored = Session.create(SessionId("original"), recorded.events, recorded.header);
    assert.deepEqual(snapshots(restored.snapshotEvents()), snapshots(events));
    assert.ok(restarted.ctx.sessionProjections.stateOf(restored, "magicMemorySnapshot")?.messageId);
    const fork = await restarted.ctx.agents.create({
      sessionId: SessionId("fork"),
      seed: recorded.events,
      agentOptions,
      inheritedEventCount: SessionLogOffset(recorded.events.length),
      meta: { cwd: paths.workspace, parentSession: SessionId("original"), isSeeded: true },
    });
    fork.agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "continue" }],
      }),
    );
    await fork.agent.whenIdle();
    const text = requestText(restarted.adapter.requests[0]);
    assert.match(text, /frozen-original-value/);
    assert.doesNotMatch(text, /new-current-value/);
    assert.equal(snapshots(fork.agent.session.snapshotEvents()).length, 1);
    assert.equal(restarted.ctx.magicMemory.store.list(author.workspace, "workspace").length, 1);
    assert.equal(
      restarted.ctx.magicMemory.store.recall(author.workspace, {
        query: "new-current-value",
        includeGlobal: true,
        limit: 5,
      }).length,
      1,
    );
  } finally {
    await restarted.ctx.fiber.dispose();
  }
});

test("rejected admission preserves the request-series marker and does not freeze an undelivered snapshot", async () => {
  const paths = fixturePaths();
  const { ctx, harness } = await host(paths.databasePath);
  try {
    const agent = await harness.create(SessionId("decisions"), agentOptions, {
      cwd: paths.workspace,
    });
    const message = createUserMessage({
      source: { kind: "user" },
      content: [{ type: "text", text: "hello" }],
    });
    const payload = { messages: [message], turn: 1, step: 1, signal: new AbortController().signal };
    const rejected = await agentEvents(ctx, agent).waterfall(
      "agent/pre-step",
      payload,
      async () => ({ kind: "reject" as const }),
    );
    assert.deepEqual(rejected, { kind: "reject" });
    const accepted = await agentEvents(ctx, agent).waterfall(
      "agent/pre-step",
      payload,
      async () => ({
        kind: "enter" as const,
        messages: [message],
        startsRequestSeries: true as const,
      }),
    );
    assert.equal(accepted.kind, "enter");
    if (accepted.kind === "enter") assert.equal(accepted.startsRequestSeries, true);
    assert.equal(
      ctx.sessionProjections.stateOf(agent.session, "magicMemorySnapshot")?.messageId,
      null,
    );
  } finally {
    await ctx.fiber.dispose();
  }
});

test("the framed injection respects its budget and provider disposal closes the connection", async () => {
  const paths = fixturePaths();
  const { ctx } = await host(paths.databasePath);
  const store = ctx.magicMemory.store;
  const author = caller(paths.workspace);
  for (let i = 0; i < 5; i++)
    store.remember(author, {
      requestId: `note-${i}`,
      content: `事实${i} ${"边界".repeat(500)}`,
      category: "CONSTRAINTS",
      scope: "workspace",
    });
  const text = renderSnapshot(store.recent(author.workspace, false, 5), 1000);
  assert.ok(estimateTokens(text) <= 1000);
  await ctx.fiber.dispose();
  assert.throws(() => store.recent(author.workspace, false, 5), /disposed/);
});
