import assert from "node:assert/strict";
import { test } from "node:test";
import BasicCompaction from "@deepseek-ai/dsh-compaction-basic";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import TokenMeter from "@deepseek-ai/dsh-token-meter";
import { caller, fixturePaths, host, requestText } from "./helpers.ts";

test("native DSH compaction replaces history while preserving the logged memory delivery receipt", async () => {
  const paths = fixturePaths();
  const { ctx, adapter, harness } = await host(paths.databasePath);
  try {
    await ctx.plugin(TokenMeter);
    await ctx.plugin(BasicCompaction, { auto: false, retainTokens: 0 });
    const author = caller(paths.workspace);
    const fact = "The verified release marker is compact-memory-829";
    ctx.magicMemory.store.remember(author, {
      scope: "workspace",
      requestId: "seed",
      content: fact,
      category: "CONSTRAINTS",
    });
    const agent = await harness.create(
      SessionId("compact-memory"),
      { provider: "fixture", model: "keyless" },
      { cwd: paths.workspace },
    );
    for (let turn = 0; turn < 3; turn++) {
      agent.followup(
        createUserMessage({
          source: { kind: "user" },
          content: [
            { type: "text", text: `Turn ${turn}: ${"verified progress details ".repeat(100)}` },
          ],
        }),
      );
      await agent.whenIdle();
    }
    const receipt = ctx.sessionProjections.stateOf(agent.session, "magicMemorySnapshot");
    adapter.script.push([
      { type: "block-start", index: 0, blockType: "text" },
      { type: "block-end", index: 0, block: { type: "text", text: fact } },
      { type: "finish", reason: { kind: "stop" } },
    ]);
    const compacted = await ctx.compaction.compactNow(agent, new AbortController().signal);
    assert.ok(compacted);
    assert.ok(compacted.shadowedSeqs.length > 0);
    const events = agent.session.snapshotEvents();
    assert.equal(events.filter((event) => event.type === "compaction/summary").length, 1);
    assert.equal(events.filter((event) => event.type === "compaction/end").length, 1);
    assert.deepEqual(ctx.sessionProjections.stateOf(agent.session, "magicMemorySnapshot"), receipt);
    agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "Continue after native compaction." }],
      }),
    );
    await agent.whenIdle();
    assert.match(requestText(adapter.requests[adapter.requests.length - 1]), /compact-memory-829/);
    assert.equal(
      agent.session
        .snapshotEvents()
        .filter(
          (event) =>
            event.type === "user/message" &&
            event.data.source.kind === "plugin" &&
            event.data.source.plugin === "magic-memory-recall",
        ).length,
      1,
    );
    assert.equal(ctx.magicMemory.store.list(author.workspace, "workspace").length, 1);
  } finally {
    await ctx.fiber.dispose();
  }
});
