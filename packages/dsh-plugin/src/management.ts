import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { TypertRegistry } from "@deepseek-ai/dsh-typert-registry";
import { z } from "zod";
import { MANAGEMENT_HOST, type MemoryPage } from "./management-wire.ts";
import type { MemoryRepository } from "./service.ts";
import type { MemoryCaller, MemoryId, WorkspaceKey } from "./types.ts";

const selection = { workspace: z.string().max(4096), scope: z.enum(["workspace", "global"]) };
const edit = {
  ...selection,
  id: z.string().min(1).max(128),
  expectedRevision: z.number().int().positive(),
  requestId: z.string().min(1).max(512),
};
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("workspaces"), after: z.string().max(4096).optional() }).strict(),
  z
    .object({ action: z.literal("list"), ...selection, after: z.string().max(128).optional() })
    .strict(),
  z
    .object({ action: z.literal("update"), ...edit, content: z.string().min(1).max(16000) })
    .strict(),
  z.object({ action: z.literal("archive"), ...edit }).strict(),
]);

/** Human management face; authorization is inherited from the DSH settings gateway. */
export class MemoryManagementService extends TypertRemoteService {
  /** Keep the receiver scoped to the provider's actual store, with no second connection. */
  constructor(
    ctx: Context,
    private readonly store: MemoryRepository,
  ) {
    super(ctx, "magicMemoryManager", { namespace: "magicMemoryManager" });
  }

  /** Validate a bounded settings action and preserve human provenance on every revision. */
  async dispatch(request: string): Promise<string> {
    if (request.length > 20000) throw new Error("Memory management request is too large");
    const input = requestSchema.parse(JSON.parse(request));
    if (input.action === "workspaces") return JSON.stringify(this.store.workspaces(input.after));
    const workspace =
      input.scope === "global" ? ("" as WorkspaceKey) : this.store.knownWorkspace(input.workspace);
    if (input.action === "list") {
      const records = this.store.list(
        workspace,
        input.scope,
        input.after,
        this.store.options.maxResults,
      );
      const result: MemoryPage = {
        records,
        next:
          records.length === this.store.options.maxResults ? (records.at(-1)?.id ?? null) : null,
        maxContentChars: this.store.options.maxContentChars,
      };
      return JSON.stringify(result);
    }
    const caller: MemoryCaller = {
      workspace,
      provenance: {
        harness: "dsh",
        source: "user",
        sessionId: null,
        callId: input.requestId,
        eventSeq: null,
      },
    };
    const current = this.store.get(workspace, input.scope, input.id as MemoryId);
    const edit = {
      id: current.id,
      expectedRevision: input.expectedRevision,
      scope: input.scope,
      requestId: input.requestId,
    };
    return JSON.stringify(
      input.action === "archive"
        ? this.store.forget(caller, edit)
        : this.store.update(caller, {
            ...edit,
            content: input.content,
            category: current.category,
          }),
    );
  }
}

/** Register the receiver and strict shared descriptor only when the Host provides Typert. */
export function installManagement(ctx: Context, store: MemoryRepository): void {
  new MemoryManagementService(ctx, store);
  const registry = ctx.typert as TypertRegistry;
  ctx.effect(() => registry.register(MANAGEMENT_HOST));
}
