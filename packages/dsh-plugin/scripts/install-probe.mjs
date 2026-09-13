import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { Context } from "@deepseek-ai/cordis";
import {
  mountAgentLoopTestDependencies,
  mountAgentLoopTestHarness,
} from "@deepseek-ai/dsh-agent-loop-testkit";
import { createUserMessage, LlmAdapter } from "@deepseek-ai/dsh-llm";
import { SessionId } from "@deepseek-ai/dsh-session";
import Provider from "@flyingcoding/dsh-magic-context";
import * as recall from "@flyingcoding/dsh-magic-context/recall";
import * as tools from "@flyingcoding/dsh-magic-context/tools";

const require = createRequire(import.meta.url);
const packageFile = require.resolve("@flyingcoding/dsh-magic-context/package.json");
const manifest = JSON.parse(readFileSync(packageFile, "utf8"));
assert.ok(manifest.dsh.bundle.patch);
assert.ok(manifest.dsh.client);
let registered;
runInNewContext(readFileSync(require.resolve("@flyingcoding/dsh-magic-context/client"), "utf8"), {
  window: {
    __ModuleLoader__: {
      load: (registration) => {
        registered = registration;
      },
    },
  },
});
assert.equal(registered.id, manifest.name);
assert.equal(typeof registered.factory, "function");
const clientExports = registered.factory((name) => {
  assert.ok(["react", "react/jsx-runtime"].includes(name), `unseeded client dependency: ${name}`);
  return {};
});
assert.equal(typeof clientExports.apply, "function");

/** Record real AgentLoop input using a keyless model adapter in the clean installation. */
class ProbeAdapter extends LlmAdapter {
  requests = [];
  async *stream(options) {
    this.requests.push(options);
    yield { type: "block-start", index: 0, blockType: "text" };
    yield {
      type: "block-end",
      index: 0,
      block: { type: "text", text: "artifact probe completed" },
    };
    yield { type: "finish", reason: { kind: "stop" } };
  }
}

const ctx = new Context();
await mountAgentLoopTestDependencies(ctx);
await ctx.plugin(Provider, { databasePath: resolve("memory.sqlite") });
await ctx.plugin(tools);
await ctx.plugin(recall);
const adapter = new ProbeAdapter();
ctx.llm.registerAdapter(["probe"], adapter);
const harness = await mountAgentLoopTestHarness(ctx);
const workspace = process.cwd();
ctx.magicMemory.store.remember(
  {
    workspace,
    provenance: {
      harness: "dsh",
      source: "tool",
      sessionId: "artifact-writer",
      callId: "artifact-call",
      eventSeq: null,
    },
  },
  {
    content: "artifact-memory-青松527",
    category: "CONSTRAINTS",
    scope: "workspace",
    requestId: "write",
  },
);
const agent = await harness.create(
  SessionId("artifact-reader"),
  { provider: "probe", model: "keyless" },
  { cwd: workspace },
);
agent.followup(
  createUserMessage({ source: { kind: "user" }, content: [{ type: "text", text: "recall" }] }),
);
await agent.whenIdle();
assert.equal(adapter.requests.length, 1);
assert.match(JSON.stringify(adapter.requests[0].messages), /artifact-memory-青松527/);
assert.match(JSON.stringify(agent.session.snapshotEvents()), /artifact-memory-青松527/);
const store = ctx.magicMemory.store;
await ctx.fiber.dispose();
assert.throws(() => store.recent(workspace, false, 5), /disposed/);
console.log(
  JSON.stringify({
    package: manifest.name,
    version: manifest.version,
    node: process.version,
    hostVersion: JSON.parse(
      readFileSync(require.resolve("@deepseek-ai/dsh-agent/package.json"), "utf8"),
    ).version,
    runtime: "node:sqlite",
    nativeTools: 4,
    modelCalls: adapter.requests.length,
    clientLoader: "registered",
    cleanInstall: true,
  }),
);
