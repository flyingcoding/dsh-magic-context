import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId, SessionLogOffset } from "@deepseek-ai/dsh-session";
import { caller, fixturePaths, host, requestText } from "./helpers.ts";

test("the committed Session fixture retains its exact memory text under a new database and lifecycle", async () => {
  const fixture = JSON.parse(
    readFileSync(new URL("./fixtures/memory-session.v3.json", import.meta.url), "utf8"),
  );
  const paths = fixturePaths();
  const { ctx, adapter } = await host(paths.databasePath);
  try {
    ctx.magicMemory.store.remember(caller(paths.workspace), {
      scope: "workspace",
      requestId: "new-state",
      category: "CONFIG_VALUES",
      content: "today-the-value-is-different",
    });
    const handle = await ctx.agents.create({
      sessionId: SessionId("recorded-replay"),
      seed: fixture.events,
      inheritedEventCount: SessionLogOffset(fixture.events.length),
      agentOptions: { provider: "fixture", model: "memory-fixture" },
      meta: { cwd: paths.workspace, isSeeded: true, parentSession: SessionId(fixture.header.id) },
    });
    handle.agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "Continue the recorded conversation." }],
      }),
    );
    await handle.agent.whenIdle();
    const text = requestText(adapter.requests[0]);
    assert.match(text, /frozen-original-value/);
    assert.match(text, /\/memory-fixture\/workspace/);
    assert.doesNotMatch(text, /today-the-value-is-different/);
    const recordedMemory = fixture.events.find(
      (event: { type: string; data: { source?: { plugin?: string } } }) =>
        event.type === "user/message" && event.data.source?.plugin === "magic-memory-recall",
    );
    const delivered = adapter.requests[0].messages.find(
      (message) => message.id === recordedMemory.data.id,
    );
    assert.deepEqual(delivered?.content, recordedMemory.data.content);
    await handle.dispose();
  } finally {
    await ctx.fiber.dispose();
  }
});
