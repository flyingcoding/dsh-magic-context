import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import JsonlPersistence from "@deepseek-ai/dsh-session-persistence-jsonl";
import { caller, fixturePaths, host, requestText } from "./helpers.ts";

test("a real persisted DSH Session resumes its admitted snapshot after the memory database changes", async () => {
  const paths = fixturePaths();
  const source = await host(paths.databasePath);
  const author = caller(paths.workspace);
  const sessionId = SessionId("durable-reader");
  try {
    await source.ctx.plugin(JsonlPersistence, {
      root: resolve(paths.root, "sessions"),
      compression: "none",
    });
    const memory = source.ctx.magicMemory.store.remember(author, {
      scope: "workspace",
      requestId: "original",
      category: "CONSTRAINTS",
      content: "original-persisted-snapshot",
    });
    const handle = await source.ctx.agents.create({
      sessionId,
      agentOptions: { provider: "fixture", model: "keyless" },
      meta: { cwd: paths.workspace },
    });
    handle.agent.followup(
      createUserMessage({ source: { kind: "user" }, content: [{ type: "text", text: "begin" }] }),
    );
    await handle.agent.whenIdle();
    await source.ctx.sessions.flush(handle.agent.session);
    source.ctx.magicMemory.store.update(author, {
      scope: "workspace",
      requestId: "correct",
      id: memory.record.id,
      expectedRevision: 1,
      category: "CONSTRAINTS",
      content: "corrected-current-database",
    });
    await handle.dispose();
  } finally {
    await source.ctx.fiber.dispose();
  }
  const restarted = await host(paths.databasePath);
  try {
    await restarted.ctx.plugin(JsonlPersistence, {
      root: resolve(paths.root, "sessions"),
      compression: "none",
    });
    const handle = await restarted.ctx.agents.resume({
      resumeSessionId: sessionId,
      agentOptions: { provider: "fixture", model: "keyless" },
    });
    handle.agent.followup(
      createUserMessage({
        source: { kind: "user" },
        content: [{ type: "text", text: "continue" }],
      }),
    );
    await handle.agent.whenIdle();
    const text = requestText(restarted.adapter.requests[0]);
    assert.match(text, /original-persisted-snapshot/);
    assert.doesNotMatch(text, /corrected-current-database/);
    assert.ok(
      restarted.ctx.sessionProjections.stateOf(handle.agent.session, "magicMemorySnapshot")
        ?.messageId,
    );
    await handle.dispose();
  } finally {
    await restarted.ctx.fiber.dispose();
  }
});
