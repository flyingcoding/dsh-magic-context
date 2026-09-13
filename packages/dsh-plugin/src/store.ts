import { createHash, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { Database, type Statement } from "../../plugin/src/shared/sqlite.ts";
import { boundedInteger } from "./config.ts";
import { searchTokens, toFtsQuery } from "./tokenize.ts";
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
  WriteRequest,
  WriteResult,
} from "./types.ts";
import { CATEGORIES } from "./types.ts";

const APPLICATION_ID = 0x44534d43;
const SCHEMA_VERSION = 1;
const recordSchema = z
  .object({
    id: z.string().min(1),
    scope: z.enum(["workspace", "global"]),
    workspaceKey: z.string(),
    category: z.enum(CATEGORIES),
    content: z.string().min(1),
    revision: z.number().int().positive(),
    status: z.enum(["active", "superseded", "archived"]),
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
    provenance: z.discriminatedUnion("source", [
      z.object({
        harness: z.literal("dsh"),
        source: z.literal("tool"),
        sessionId: z.string().min(1),
        callId: z.string().min(1),
        eventSeq: z.number().int().nonnegative().nullable(),
      }),
      z.object({
        harness: z.literal("dsh"),
        source: z.literal("user"),
        sessionId: z.null(),
        callId: z.string().min(1),
        eventSeq: z.null(),
      }),
    ]),
  })
  .strict();

/** Decode persisted JSON at the storage boundary instead of trusting a TypeScript cast. */
function decodeRecord(value: string): MemoryRecord {
  const record = recordSchema.parse(JSON.parse(value));
  if ((record.scope === "global") !== (record.workspaceKey === "")) {
    throw new Error("Invalid stored memory scope");
  }
  return record as MemoryRecord;
}

/** Normalize whitespace without merging case-sensitive code identifiers or configuration values. */
function contentHash(content: string): string {
  return createHash("sha256").update(content.replace(/\s+/g, " ").trim()).digest("hex");
}

/** Separate global data from workspace data without accepting a caller-supplied target path. */
function scopeKey(workspace: WorkspaceKey, scope: MemoryScope): string {
  return scope === "global" ? "" : workspace;
}

/** One SQLite owner with atomic revisions, scoped dedupe, and durable operation receipts. */
export class MemoryStore {
  private readonly db: Database;
  private closed = false;
  private readonly statements = new Map<string, Statement>();

  /** Open only an adapter-owned database and refuse unknown or newer schemas before writes. */
  constructor(readonly options: StoreOptions) {
    mkdirSync(dirname(options.databasePath), { recursive: true, mode: 0o700 });
    this.db = new Database(options.databasePath);
    try {
      this.db.exec(`PRAGMA busy_timeout = ${options.busyTimeoutMs}`);
      this.verifyOwner();
      // SQLite inherits this mode when it creates the WAL and shared-memory files.
      chmodSync(options.databasePath, 0o600);
      this.db.exec(`PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;
        PRAGMA synchronous = FULL; PRAGMA cache_size = -${options.cacheSizeMiB * 1024};
        PRAGMA mmap_size = 0`);
      this.db
        .transaction(() => {
          this.verifyOwner();
          this.db.exec(`
          CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY, workspace_key TEXT NOT NULL, scope TEXT NOT NULL,
            normalized_hash TEXT NOT NULL, category TEXT NOT NULL, status TEXT NOT NULL,
            revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, record_json TEXT NOT NULL
          );
          CREATE UNIQUE INDEX IF NOT EXISTS memory_active_hash
            ON memories(workspace_key, scope, normalized_hash) WHERE status = 'active';
          CREATE INDEX IF NOT EXISTS memory_scope_recent
            ON memories(workspace_key, scope, status, updated_at DESC, id);
          CREATE TABLE IF NOT EXISTS memory_revisions (
            id TEXT NOT NULL REFERENCES memories(id), revision INTEGER NOT NULL,
            record_json TEXT NOT NULL, PRIMARY KEY(id, revision)
          );
          CREATE TABLE IF NOT EXISTS memory_operations (
            workspace_key TEXT NOT NULL, session_id TEXT NOT NULL, request_id TEXT NOT NULL,
            fingerprint TEXT NOT NULL, result_json TEXT NOT NULL,
            PRIMARY KEY(workspace_key, session_id, request_id)
          );
          CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, tokens);
          PRAGMA application_id = ${APPLICATION_ID};
          PRAGMA user_version = ${SCHEMA_VERSION};
        `);
        })
        .immediate();
      chmodSync(options.databasePath, 0o600);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  /** Reject an upstream Magic database, an unrelated database, or a future migration. */
  private verifyOwner(): void {
    const owner = this.prepare("PRAGMA application_id").get() as { application_id: number };
    const version = this.prepare("PRAGMA user_version").get() as { user_version: number };
    if (owner.application_id === APPLICATION_ID && version.user_version === SCHEMA_VERSION) return;
    const existing = this.prepare(
      "SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' LIMIT 1",
    ).get();
    if (owner.application_id !== 0 || version.user_version !== 0 || existing) {
      throw new Error(
        `Refusing foreign or unsupported memory database (application=${owner.application_id}, schema=${version.user_version})`,
      );
    }
  }

  /** Reuse the fixed set of SQL statements; user queries never become cache keys. */
  private prepare(sql: string): Statement {
    let statement = this.statements.get(sql);
    if (!statement) {
      statement = this.db.prepare(sql);
      this.statements.set(sql, statement);
    }
    return statement;
  }

  /** List a bounded page of stored workspace identities for the authenticated settings surface. */
  workspaces(after = ""): string[] {
    this.assertOpen();
    const rows = this.prepare(
      "SELECT DISTINCT workspace_key FROM memories WHERE scope='workspace' AND workspace_key>? ORDER BY workspace_key LIMIT ?",
    ).all(after, this.options.maxResults) as { workspace_key: string }[];
    return rows.map((row) => row.workspace_key);
  }

  /** Require a settings-selected workspace to already own memory; never resolve arbitrary filesystem input. */
  knownWorkspace(value: string): WorkspaceKey {
    this.assertOpen();
    if (
      !this.prepare(
        "SELECT 1 FROM memories WHERE scope='workspace' AND workspace_key=? LIMIT 1",
      ).get(value)
    ) {
      throw new Error("Unknown memory workspace");
    }
    return value as WorkspaceKey;
  }

  /** Fail calls after provider disposal rather than retaining a reopened connection. */
  private assertOpen(): void {
    if (this.closed) throw new Error("Memory store is disposed");
  }

  /** Close exactly this owner's connection; uninstall never removes memory files. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.statements.clear();
    this.db.close();
  }

  /** Enforce storage and prompt-size limits before entering a write transaction. */
  private validatedContent(request: RememberRequest): string {
    const content = request.content.trim();
    if (!content || content.length > this.options.maxContentChars) {
      throw new Error(`Memory content must contain 1–${this.options.maxContentChars} characters`);
    }
    if (!CATEGORIES.includes(request.category)) throw new Error("Unsupported memory category");
    return content;
  }

  /** Commit the operation and its retry receipt together before reporting success. */
  private write(
    caller: MemoryCaller,
    request: WriteRequest,
    identity: readonly unknown[],
    operation: () => WriteResult,
  ): WriteResult {
    this.assertOpen();
    if (!request.requestId.trim() || request.requestId.length > 512)
      throw new Error("Invalid memory request id");
    const fingerprint = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
    return this.db
      .transaction(() => {
        const prior = this.prepare(`SELECT fingerprint, result_json FROM memory_operations
        WHERE workspace_key = ? AND session_id = ? AND request_id = ?`).get(
          caller.workspace,
          caller.provenance.source === "user" ? "ui" : `session:${caller.provenance.sessionId}`,
          request.requestId,
        ) as { fingerprint: string; result_json: string } | undefined;
        if (prior) {
          if (prior.fingerprint !== fingerprint)
            throw new Error("Memory request id was reused with different arguments");
          const result = z
            .object({
              record: recordSchema,
              outcome: z.enum(["created", "existing", "updated", "archived"]),
            })
            .parse(JSON.parse(prior.result_json));
          return { ...result, record: decodeRecord(JSON.stringify(result.record)) };
        }
        const result = operation();
        this.prepare("INSERT INTO memory_operations VALUES (?, ?, ?, ?, ?)").run(
          caller.workspace,
          caller.provenance.source === "user" ? "ui" : `session:${caller.provenance.sessionId}`,
          request.requestId,
          fingerprint,
          JSON.stringify(result),
        );
        return result;
      })
      .immediate();
  }

  /** Create a scoped memory, or return the active normalized duplicate without rewriting provenance. */
  remember(caller: MemoryCaller, request: RememberRequest): WriteResult {
    const content = this.validatedContent(request);
    return this.write(
      caller,
      request,
      ["remember", request.scope, request.category, content],
      () => {
        const key = scopeKey(caller.workspace, request.scope);
        const duplicate = this.prepare(`SELECT record_json FROM memories
        WHERE workspace_key = ? AND scope = ? AND normalized_hash = ? AND status = 'active'`).get(
          key,
          request.scope,
          contentHash(content),
        ) as { record_json: string } | undefined;
        if (duplicate) return { outcome: "existing", record: decodeRecord(duplicate.record_json) };
        const now = Date.now();
        const record: MemoryRecord = {
          id: randomUUID() as MemoryId,
          scope: request.scope,
          workspaceKey: key as WorkspaceKey | "",
          category: request.category,
          content,
          revision: 1,
          status: "active",
          createdAt: now,
          updatedAt: now,
          provenance: { ...caller.provenance },
        };
        this.persist(record);
        return { outcome: "created", record };
      },
    );
  }

  /** Resolve a record only inside the explicitly selected caller scope. */
  get(workspace: WorkspaceKey, scope: MemoryScope, id: MemoryId): MemoryRecord {
    this.assertOpen();
    const row = this.prepare(
      "SELECT record_json FROM memories WHERE id = ? AND workspace_key = ? AND scope = ?",
    ).get(id, scopeKey(workspace, scope), scope) as { record_json: string } | undefined;
    if (!row) throw new Error("Memory was not found in the selected scope");
    return decodeRecord(row.record_json);
  }

  /** Reject stale edits and preserve the superseded revision before replacing current content. */
  update(caller: MemoryCaller, request: UpdateRequest): WriteResult {
    const content = this.validatedContent(request);
    return this.write(
      caller,
      request,
      ["update", request.scope, request.id, request.expectedRevision, request.category, content],
      () => {
        const previous = this.editable(caller.workspace, request);
        this.saveRevision(previous);
        const record: MemoryRecord = {
          ...previous,
          content,
          category: request.category,
          revision: previous.revision + 1,
          updatedAt: Date.now(),
          provenance: { ...caller.provenance },
        };
        this.persist(record);
        return { outcome: "updated", record };
      },
    );
  }

  /** Archive a memory without deleting its evidence or allowing dedupe to reactivate it. */
  forget(caller: MemoryCaller, request: ForgetRequest): WriteResult {
    return this.write(
      caller,
      request,
      ["forget", request.scope, request.id, request.expectedRevision],
      () => {
        const previous = this.editable(caller.workspace, request);
        this.saveRevision(previous);
        const record: MemoryRecord = {
          ...previous,
          status: "archived",
          revision: previous.revision + 1,
          updatedAt: Date.now(),
          provenance: { ...caller.provenance },
        };
        this.persist(record);
        return { outcome: "archived", record };
      },
    );
  }

  /** Check revision and lifecycle under the same immediate transaction that will commit the edit. */
  private editable(workspace: WorkspaceKey, request: ForgetRequest): MemoryRecord {
    boundedInteger("expectedRevision", request.expectedRevision, 1, Number.MAX_SAFE_INTEGER);
    const record = this.get(workspace, request.scope, request.id);
    if (record.revision !== request.expectedRevision)
      throw new Error(`Memory revision conflict: current revision is ${record.revision}`);
    if (record.status !== "active")
      throw new Error("Archived memories cannot be edited or implicitly restored");
    return record;
  }

  /** Retain prior content with an explicit superseded lifecycle state. */
  private saveRevision(record: MemoryRecord): void {
    this.prepare("INSERT INTO memory_revisions VALUES (?, ?, ?)").run(
      record.id,
      record.revision,
      JSON.stringify({ ...record, status: "superseded" }),
    );
  }

  /** Update the current row and its search document atomically with the enclosing receipt. */
  private persist(record: MemoryRecord): void {
    this.prepare(`INSERT INTO memories VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET normalized_hash=excluded.normalized_hash,
      category=excluded.category, status=excluded.status, revision=excluded.revision,
      updated_at=excluded.updated_at, record_json=excluded.record_json`).run(
      record.id,
      record.workspaceKey,
      record.scope,
      contentHash(record.content),
      record.category,
      record.status,
      record.revision,
      record.updatedAt,
      JSON.stringify(record),
    );
    this.prepare("DELETE FROM memory_fts WHERE id = ?").run(record.id);
    if (record.status === "active") {
      this.prepare("INSERT INTO memory_fts(id, tokens) VALUES (?, ?)").run(
        record.id,
        searchTokens(record.content).join(" "),
      );
    }
  }

  /** Search current records only; unrelated terms return no fallback memories. */
  recall(workspace: WorkspaceKey, request: RecallRequest): MemoryRecord[] {
    this.assertOpen();
    boundedInteger("limit", request.limit, 1, this.options.maxResults);
    if (request.query.length > this.options.maxQueryChars)
      throw new Error(`Query exceeds ${this.options.maxQueryChars} characters`);
    const query = toFtsQuery(request.query);
    if (!query) return [];
    const rows = this.prepare(`SELECT m.record_json FROM memory_fts f JOIN memories m ON m.id=f.id
      WHERE memory_fts MATCH ? AND m.status = 'active'
      AND ((m.scope = 'workspace' AND m.workspace_key = ?) OR (? = 1 AND m.scope = 'global' AND m.workspace_key = ''))
      ORDER BY bm25(memory_fts), m.updated_at DESC, m.id LIMIT ?`).all(
      query,
      workspace,
      Number(request.includeGlobal),
      request.limit,
    ) as {
      record_json: string;
    }[];
    return rows.map((row) => decodeRecord(row.record_json));
  }

  /** Select a small recent snapshot with global preferences explicitly enabled by the consumer. */
  recent(workspace: WorkspaceKey, includeGlobal: boolean, limit: number): MemoryRecord[] {
    this.assertOpen();
    boundedInteger("limit", limit, 1, this.options.maxResults);
    const rows = this.prepare(`SELECT record_json FROM memories WHERE status='active'
      AND ((scope='workspace' AND workspace_key=?) OR (?=1 AND scope='global' AND workspace_key=''))
      ORDER BY updated_at DESC, id LIMIT ?`).all(workspace, Number(includeGlobal), limit) as {
      record_json: string;
    }[];
    return rows.map((row) => decodeRecord(row.record_json));
  }

  /** Page one authorized scope for management/export without materializing the whole database. */
  list(workspace: WorkspaceKey, scope: MemoryScope, after = "", limit = 20): MemoryRecord[] {
    this.assertOpen();
    boundedInteger("limit", limit, 1, this.options.maxResults);
    const rows =
      this.prepare(`SELECT record_json FROM memories WHERE workspace_key=? AND scope=? AND id>?
      ORDER BY id LIMIT ?`).all(scopeKey(workspace, scope), scope, after, limit) as {
        record_json: string;
      }[];
    return rows.map((row) => decodeRecord(row.record_json));
  }

  /** Read the latest bounded revision history after checking the current record's scope. */
  history(workspace: WorkspaceKey, scope: MemoryScope, id: MemoryId, limit = 20): MemoryRecord[] {
    const current = this.get(workspace, scope, id);
    boundedInteger("limit", limit, 1, this.options.maxResults);
    const prior = this.prepare(
      "SELECT record_json FROM memory_revisions WHERE id=? ORDER BY revision DESC LIMIT ?",
    ).all(id, limit - 1) as { record_json: string }[];
    return [current, ...prior.map((row) => decodeRecord(row.record_json))];
  }
}
