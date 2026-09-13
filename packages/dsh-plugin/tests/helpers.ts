import { Context } from "@deepseek-ai/cordis";
import {
  mountAgentLoopTestDependencies,
  mountAgentLoopTestHarness,
} from "@deepseek-ai/dsh-agent-loop-testkit";
import type { GenerateOptions } from "@deepseek-ai/dsh-llm";
import Provider from "../src/index.ts";
import * as recall from "../src/recall.ts";
import * as tools from "../src/tools.ts";
import { RecordingAdapter } from "./recording-adapter.ts";

export { caller, fixturePaths } from "./fixtures.ts";
export { RecordingAdapter } from "./recording-adapter.ts";

/** Mount actual published DSH services, then the adapter, before creating any Agent. */
export async function host(databasePath: string, config: recall.Config = {}) {
  const ctx = new Context();
  await mountAgentLoopTestDependencies(ctx);
  await ctx.plugin(Provider, { databasePath });
  await ctx.plugin(tools);
  await ctx.plugin(recall, config);
  const adapter = new RecordingAdapter();
  ctx.llm.registerAdapter(["fixture"], adapter);
  const harness = await mountAgentLoopTestHarness(ctx);
  return { ctx, adapter, harness };
}

/** Join only model-visible text blocks, retaining their original ordering. */
export function requestText(request: GenerateOptions): string {
  return request.messages
    .flatMap((message) => message.content)
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
