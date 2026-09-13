import type { MemoryCategory as UpstreamCategory } from "../../plugin/src/features/magic-context/memory/types.ts";

/** Stable logical record identity; revisions retain the same id. */
export type MemoryId = string & { readonly __memoryId: unique symbol };
/** Canonical real workspace path; never accepted from a model argument. */
export type WorkspaceKey = string & { readonly __workspaceKey: unique symbol };
/** Global writes always require an explicit scope selection. */
export type MemoryScope = "workspace" | "global";
/** The small supported subset of Magic's category vocabulary. */
export type MemoryCategory = Extract<
  UpstreamCategory,
  | "PROJECT_RULES"
  | "ARCHITECTURE"
  | "CONFIG_VALUES"
  | "CONSTRAINTS"
  | "NAMING"
  | "USER_PREFERENCES"
  | "KNOWN_ISSUES"
>;
export const CATEGORIES: readonly MemoryCategory[] = [
  "PROJECT_RULES",
  "ARCHITECTURE",
  "CONFIG_VALUES",
  "CONSTRAINTS",
  "NAMING",
  "USER_PREFERENCES",
  "KNOWN_ISSUES",
];

/** Tool writes cite their actual Session; direct settings edits are explicitly user-authored. */
export type Provenance = {
  harness: "dsh";
  callId: string;
} & (
  | { source: "tool"; sessionId: string; eventSeq: number | null }
  | { source: "user"; sessionId: null; eventSeq: null }
);

/** One current logical record or an immutable prior revision. */
export interface MemoryRecord {
  id: MemoryId;
  scope: MemoryScope;
  workspaceKey: WorkspaceKey | "";
  category: MemoryCategory;
  content: string;
  revision: number;
  status: "active" | "superseded" | "archived";
  createdAt: number;
  updatedAt: number;
  provenance: Provenance;
}

/** Trusted caller identity, built from the current Agent rather than tool JSON. */
export interface MemoryCaller {
  workspace: WorkspaceKey;
  provenance: Provenance;
}

/** Stable request identity makes successful writes recoverable after a lost response. */
export interface WriteRequest {
  requestId: string;
  scope: MemoryScope;
}

export interface RememberRequest extends WriteRequest {
  category: MemoryCategory;
  content: string;
}

export interface UpdateRequest extends RememberRequest {
  id: MemoryId;
  expectedRevision: number;
}

export interface ForgetRequest extends WriteRequest {
  id: MemoryId;
  expectedRevision: number;
}

/** Persisted result is returned unchanged for an idempotent retry. */
export interface WriteResult {
  record: MemoryRecord;
  outcome: "created" | "existing" | "updated" | "archived";
}

export interface RecallRequest {
  query: string;
  includeGlobal: boolean;
  limit: number;
}

/** Deployment limits are resolved once before opening a database. */
export interface StoreOptions {
  databasePath: string;
  cacheSizeMiB: number;
  busyTimeoutMs: number;
  maxContentChars: number;
  maxQueryChars: number;
  maxResults: number;
}
