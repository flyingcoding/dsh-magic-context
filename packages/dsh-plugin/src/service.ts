import { type Context, Service } from "@deepseek-ai/cordis";
import type {
  ForgetRequest,
  MemoryCaller,
  MemoryId,
  MemoryRecord,
  MemoryScope,
  RecallRequest,
  RememberRequest,
  StoreOptions,
  UpdateRequest,
  WorkspaceKey,
  WriteResult,
} from "./types.ts";

/** Storage operations consumed by DSH; providers do not expose a database handle. */
export interface MemoryRepository {
  readonly options: Pick<StoreOptions, "maxResults" | "maxContentChars" | "maxQueryChars">;
  /** Persist a fact with a scoped retry receipt. */
  remember(caller: MemoryCaller, request: RememberRequest): WriteResult;
  /** Correct one active revision atomically. */
  update(caller: MemoryCaller, request: UpdateRequest): WriteResult;
  /** Archive one active revision atomically. */
  forget(caller: MemoryCaller, request: ForgetRequest): WriteResult;
  /** Retrieve current matching records inside the caller's scope. */
  recall(workspace: WorkspaceKey, request: RecallRequest): MemoryRecord[];
  /** Select a bounded set of recent active facts. */
  recent(workspace: WorkspaceKey, includeGlobal: boolean, limit: number): MemoryRecord[];
  /** Resolve one record after an exact scope check. */
  get(workspace: WorkspaceKey, scope: MemoryScope, id: MemoryId): MemoryRecord;
  /** Page a scope for human management. */
  list(workspace: WorkspaceKey, scope: MemoryScope, after?: string, limit?: number): MemoryRecord[];
  /** Return a bounded revision history after checking the current scope. */
  history(
    workspace: WorkspaceKey,
    scope: MemoryScope,
    id: MemoryId,
    limit?: number,
  ): MemoryRecord[];
  /** Page known identities for the authenticated management surface. */
  workspaces(after?: string): string[];
  /** Validate a selected stored identity without reading arbitrary filesystem paths. */
  knownWorkspace(value: string): WorkspaceKey;
}

declare module "@deepseek-ai/cordis" {
  interface Context {
    magicMemory: MemoryService;
  }
}

/** Provider-independent local-memory capability; consumers own tools and prompt policy. */
export abstract class MemoryService extends Service {
  abstract readonly store: MemoryRepository;

  /** Register the single memory capability in the owning Cordis scope. */
  constructor(ctx: Context) {
    super(ctx, "magicMemory");
  }
}
