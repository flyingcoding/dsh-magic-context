import { type GenerateOptions, LlmAdapter, type StreamChunk } from "@deepseek-ai/dsh-llm";

/** A keyless provider records exactly the model requests emitted by the production AgentLoop. */
export class RecordingAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = [];
  readonly script: StreamChunk[][] = [];

  /** Give native token metering a concrete context capacity without contacting a provider. */
  override async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model, context: { contextWindow: 100000 } };
  }

  /** Consume scripted tool calls or return a deterministic answer with no network request. */
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options);
    yield* this.script.shift() ?? [
      { type: "block-start", index: 0, blockType: "text" },
      { type: "block-end", index: 0, block: { type: "text", text: "fixture answer" } },
      { type: "finish", reason: { kind: "stop" } },
    ];
  }
}
