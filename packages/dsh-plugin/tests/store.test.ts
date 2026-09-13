import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { resolveConfig } from "../src/config.ts";
import { MemoryStore } from "../src/store.ts";
import type { RememberRequest } from "../src/types.ts";
import { caller, fixturePaths } from "./fixtures.ts";

/** A concise reusable note with an explicit stable retry key. */
function note(content: string, requestId = "write-1"): RememberRequest {
  return { content, requestId, scope: "workspace", category: "CONSTRAINTS" };
}

test("writes survive restart and retain exact retry receipts", () => {
  const paths = fixturePaths();
  const author = caller(paths.workspace);
  const first = new MemoryStore(resolveConfig(paths));
  const written = first.remember(author, note("四川生产库使用独立只读账号"));
  first.close();
  const second = new MemoryStore(resolveConfig(paths));
  try {
    assert.deepEqual(second.remember(author, note("四川生产库使用独立只读账号")), written);
    assert.equal(
      second.recall(author.workspace, { query: "生产库", includeGlobal: false, limit: 5 }).length,
      1,
    );
    assert.throws(() => second.remember(author, note("different arguments")), /reused/);
    const duplicate = second.remember(author, note("四川生产库使用独立只读账号", "new-call"));
    assert.equal(duplicate.outcome, "existing");
    assert.equal(duplicate.record.id, written.record.id);
  } finally {
    second.close();
  }
});

test("deduplication preserves case-sensitive identifiers and SQLite sidecars stay private", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const author = caller(paths.workspace);
  try {
    const upper = store.remember(author, note("Config key API_KEY is required", "upper"));
    const lower = store.remember(author, note("Config key api_key is required", "lower"));
    assert.notEqual(upper.record.id, lower.record.id);
    const duplicate = store.remember(author, note("Config  key API_KEY\n is required", "spaces"));
    assert.equal(duplicate.record.id, upper.record.id);
    for (const suffix of ["", "-wal", "-shm"]) {
      assert.equal(statSync(paths.databasePath + suffix).mode & 0o777, 0o600);
    }
  } finally {
    store.close();
  }
});

test("workspace isolation and explicit global writes survive dedupe and direct id access", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const a = caller(paths.workspace);
  const b = caller(paths.other);
  try {
    const first = store.remember(a, note("only-this-workspace"));
    assert.deepEqual(
      store.recall(b.workspace, { query: "only-this-workspace", includeGlobal: true, limit: 5 }),
      [],
    );
    assert.throws(() => store.get(b.workspace, "workspace", first.record.id), /not found/);
    const other = store.remember(b, note("only-this-workspace"));
    assert.notEqual(first.record.id, other.record.id);
    const global = store.remember(a, {
      ...note("回答使用中文", "global-1"),
      scope: "global",
      category: "USER_PREFERENCES",
    });
    assert.equal(
      store.recall(b.workspace, { query: "中文", includeGlobal: true, limit: 5 })[0]?.id,
      global.record.id,
    );
    assert.deepEqual(
      store.recall(b.workspace, { query: "中文", includeGlobal: false, limit: 5 }),
      [],
    );
    assert.throws(
      () =>
        store.forget(b, {
          id: global.record.id,
          expectedRevision: 1,
          scope: "workspace",
          requestId: "wrong-scope",
        }),
      /not found/,
    );
  } finally {
    store.close();
  }
});

test("corrections use compare-and-swap and never search superseded or archived content", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const otherConnection = new MemoryStore(resolveConfig(paths));
  const author = caller(paths.workspace);
  try {
    const first = store.remember(author, note("endpoint uses old-value"));
    const update = {
      ...note("endpoint uses new-value", "edit-1"),
      id: first.record.id,
      expectedRevision: 1,
    };
    const second = store.update(author, update);
    assert.equal(second.record.revision, 2);
    assert.deepEqual(store.update(author, update), second);
    assert.throws(
      () => otherConnection.update(author, { ...update, requestId: "racing-edit" }),
      /revision conflict/,
    );
    assert.deepEqual(
      store.recall(author.workspace, { query: "old-value", includeGlobal: true, limit: 5 }),
      [],
    );
    assert.equal(
      store.history(author.workspace, "workspace", first.record.id)[1]?.status,
      "superseded",
    );
    const archive = {
      id: first.record.id,
      expectedRevision: 2,
      scope: "workspace" as const,
      requestId: "archive",
    };
    const archived = store.forget(author, archive);
    assert.equal(archived.record.status, "archived");
    assert.deepEqual(store.forget(author, archive), archived);
    assert.deepEqual(
      store.recall(author.workspace, { query: "new-value", includeGlobal: true, limit: 5 }),
      [],
    );
    assert.throws(
      () => store.update(author, { ...update, expectedRevision: 3, requestId: "restore" }),
      /Archived/,
    );
    assert.equal(store.get(author.workspace, "workspace", first.record.id).status, "archived");
  } finally {
    otherConnection.close();
    store.close();
  }
});

test("failed receipt persistence rolls back both the record and its FTS entry", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const connection = new DatabaseSync(paths.databasePath);
  const author = caller(paths.workspace);
  try {
    connection.exec(
      "CREATE TRIGGER fail_receipt BEFORE INSERT ON memory_operations BEGIN SELECT RAISE(ABORT, 'receipt failure'); END",
    );
    assert.throws(() => store.remember(author, note("atomic-marker")), /receipt failure/);
    assert.deepEqual(store.list(author.workspace, "workspace"), []);
    assert.deepEqual(
      store.recall(author.workspace, { query: "atomic-marker", includeGlobal: true, limit: 5 }),
      [],
    );
    connection.exec("DROP TRIGGER fail_receipt");
    assert.equal(store.remember(author, note("atomic-marker")).outcome, "created");
  } finally {
    connection.close();
    store.close();
  }
});

test("a contending writer fails without a receipt and the same request can retry after the lock clears", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig({ ...paths, busyTimeoutMs: 10 }));
  const blocker = new DatabaseSync(paths.databasePath);
  const author = caller(paths.workspace);
  try {
    blocker.exec("BEGIN IMMEDIATE");
    assert.throws(() => store.remember(author, note("contended-write")), /locked|busy/i);
    blocker.exec("ROLLBACK");
    assert.deepEqual(store.list(author.workspace, "workspace"), []);
    assert.equal(store.remember(author, note("contended-write")).outcome, "created");
    assert.equal(store.list(author.workspace, "workspace").length, 1);
  } finally {
    blocker.close();
    store.close();
  }
});

test("Chinese substrings, camel-case symbols, paths, and literal error strings are searchable", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const author = caller(paths.workspace);
  try {
    store.remember(
      author,
      note(
        "四川生产库连接超时；在 /src/memory/store.ts 中检查 getUserById 返回的 ECONNRESET",
        "mixed",
      ),
    );
    for (const query of [
      "生产库",
      "连接超时",
      "/src/memory/store.ts",
      "getUserById",
      "ECONNRESET",
      "生产库 ECONNRESET",
    ]) {
      assert.equal(
        store.recall(author.workspace, { query, includeGlobal: true, limit: 5 }).length,
        1,
        query,
      );
    }
    for (const query of ["irrelevant aardvark", "根本不存在", '" OR *', ""]) {
      assert.deepEqual(
        store.recall(author.workspace, { query, includeGlobal: true, limit: 5 }),
        [],
        query,
      );
    }
  } finally {
    store.close();
  }
});

test("invalid input and foreign databases fail before any successful mutation", () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const author = caller(paths.workspace);
  assert.throws(() => store.remember(author, note("  ")), /content/);
  assert.throws(() => store.remember(author, note("x".repeat(4001))), /content/);
  assert.throws(
    () => store.recall(author.workspace, { query: "x", includeGlobal: true, limit: 21 }),
    /limit/,
  );
  store.close();
  assert.throws(() => store.list(author.workspace, "workspace"), /disposed/);
  const foreign = fixturePaths();
  const connection = new DatabaseSync(foreign.databasePath);
  connection.exec("CREATE TABLE unrelated (value TEXT); INSERT INTO unrelated VALUES ('keep-me')");
  assert.throws(() => new MemoryStore(resolveConfig(foreign)), /Refusing foreign/);
  assert.equal(
    (connection.prepare("SELECT value FROM unrelated").get() as { value: string }).value,
    "keep-me",
  );
  connection.close();
});

test("a committed write recovers after abrupt process death without duplicate records", () => {
  const paths = fixturePaths();
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "tests/write-crash.ts", paths.databasePath, paths.workspace],
    { encoding: "utf8" },
  );
  assert.equal(result.signal, "SIGKILL", result.stderr);
  const store = new MemoryStore(resolveConfig(paths));
  try {
    const author = caller(paths.workspace);
    const retry = store.remember(author, note("crash-durable-marker"));
    assert.equal(retry.outcome, "created");
    assert.equal(store.list(author.workspace, "workspace").length, 1);
  } finally {
    store.close();
  }
});
