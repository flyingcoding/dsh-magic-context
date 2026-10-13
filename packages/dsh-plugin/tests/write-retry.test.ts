import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { resolveConfig } from "../src/config.ts";
import { MemoryStore, MemoryWriteBusyError } from "../src/store.ts";
import type { RememberRequest } from "../src/types.ts";
import { caller, fixturePaths } from "./fixtures.ts";

/** Exercise two actual SQLite connections rather than simulating acquisition contention. */
function lockedStore() {
  const paths = fixturePaths();
  const store = new MemoryStore({ ...resolveConfig(paths), busyTimeoutMs: 1000 });
  const locker = new DatabaseSync(paths.databasePath);
  locker.exec("BEGIN IMMEDIATE");
  return { store, locker, author: caller(paths.workspace) };
}

/** Keep repeated attempts byte-identical so committed receipts must deduplicate them. */
function note(requestId = "retry"): RememberRequest {
  return {
    requestId,
    content: `lock contention ${requestId}`,
    category: "CONSTRAINTS",
    scope: "workspace",
  };
}

test("async writes yield during real contention and preserve successful retry receipts", async () => {
  const { store, locker, author } = lockedStore();
  try {
    const pending = store.rememberAsync(author, note(), { budgetMs: 500 });
    // The same event loop must run this release; a synchronous lock wait would stall it.
    await delay(35);
    locker.exec("ROLLBACK");
    const result = await pending;
    assert.deepEqual(await store.rememberAsync(author, note()), result);
    assert.equal(store.list(author.workspace, "workspace").length, 1);
    const updated = await store.updateAsync(author, {
      ...note("update"),
      id: result.record.id,
      expectedRevision: 1,
    });
    assert.equal(updated.record.revision, 2);
    const archived = await store.forgetAsync(author, {
      requestId: "archive",
      scope: "workspace",
      id: result.record.id,
      expectedRevision: 2,
    });
    assert.equal(archived.record.status, "archived");
  } finally {
    locker.close();
    store.close();
  }
});

test("deadline exhaustion leaves no write or receipt and restores synchronous busy timeout", async () => {
  const { store, locker, author } = lockedStore();
  try {
    const started = performance.now();
    await assert.rejects(
      store.rememberAsync(author, note(), { budgetMs: 40 }),
      MemoryWriteBusyError,
    );
    assert.ok(
      performance.now() - started < 800,
      "attempts must not inherit the 1000ms native lock wait",
    );
    const db = (store as unknown as { db: DatabaseSync }).db;
    assert.equal(db.prepare("PRAGMA busy_timeout").get()?.timeout, 1000);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM memory_operations").get()?.n, 0);
    locker.exec("ROLLBACK");
    assert.equal((await store.rememberAsync(author, note())).outcome, "created");
  } finally {
    locker.close();
    store.close();
  }
});

test("caller cancellation and provider disposal stop waiting without successful mutations", async () => {
  for (const disposed of [false, true]) {
    const { store, locker, author } = lockedStore();
    const controller = new AbortController();
    try {
      const pending = store.rememberAsync(author, note(), { signal: controller.signal });
      const rejected = assert.rejects(pending, /abort|disposed/i);
      if (disposed) store.close();
      else controller.abort(new Error("caller abort"));
      await rejected;
      locker.exec("ROLLBACK");
      assert.equal(locker.prepare("SELECT COUNT(*) AS n FROM memory_operations").get()?.n, 0);
      assert.equal(locker.prepare("SELECT COUNT(*) AS n FROM memories").get()?.n, 0);
      if (!disposed) assert.equal((await store.rememberAsync(author, note())).outcome, "created");
    } finally {
      locker.close();
      store.close();
    }
  }
});

test("pending writes are bounded and capacity is released after completion", async () => {
  const { store, locker, author } = lockedStore();
  try {
    const pending = Array.from({ length: 32 }, (_, index) =>
      store.rememberAsync(author, note(`capacity-${index}`)),
    );
    await assert.rejects(store.rememberAsync(author, note("overflow")), /capacity/);
    locker.exec("ROLLBACK");
    await Promise.all(pending);
    assert.equal((await store.rememberAsync(author, note("after-capacity"))).outcome, "created");
  } finally {
    locker.close();
    store.close();
  }
});

test("a busy-shaped callback error is rolled back once and never retried", async () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const db = (store as unknown as { db: DatabaseSync }).db;
  const prepare = db.prepare.bind(db);
  let callbacks = 0;
  const failure = Object.assign(new Error("database is locked inside callback"), { errcode: 5 });
  db.prepare = (sql: string) => {
    if (sql.startsWith("INSERT INTO memory_operations")) {
      callbacks++;
      throw failure;
    }
    return prepare(sql);
  };
  try {
    await assert.rejects(
      store.rememberAsync(caller(paths.workspace), note()),
      (error) => error === failure,
    );
    assert.equal(callbacks, 1);
    assert.equal(db.isTransaction, false);
    assert.equal(store.recent(caller(paths.workspace).workspace, false, 5).length, 0);
    assert.equal(prepare("SELECT COUNT(*) AS n FROM memory_operations").get()?.n, 0);
  } finally {
    store.close();
  }
});

test("waiting updates recheck current revision after another writer commits", async () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const author = caller(paths.workspace);
  const original = store.remember(author, note("original"));
  const competitor = new MemoryStore(resolveConfig(paths));
  const locker = new DatabaseSync(paths.databasePath);
  try {
    locker.exec("BEGIN IMMEDIATE");
    const pending = store.updateAsync(author, {
      ...note("waiting"),
      id: original.record.id,
      expectedRevision: 1,
    });
    const rejection = assert.rejects(pending, /revision conflict/);
    locker.exec("ROLLBACK");
    competitor.update(author, {
      ...note("competitor"),
      id: original.record.id,
      expectedRevision: 1,
    });
    await rejection;
    assert.equal(
      store.get(author.workspace, "workspace", original.record.id).content,
      "lock contention competitor",
    );
    assert.equal(
      locker.prepare("SELECT COUNT(*) AS n FROM memory_operations WHERE request_id='waiting'").get()
        ?.n,
      0,
    );
  } finally {
    locker.close();
    competitor.close();
    store.close();
  }
});

test("zero retry budget and pre-aborted requests leave no durable success", async () => {
  const { store, locker, author } = lockedStore();
  try {
    await assert.rejects(
      store.rememberAsync(author, note(), { budgetMs: 0 }),
      MemoryWriteBusyError,
    );
    const controller = new AbortController();
    const reason = new Error("already cancelled");
    controller.abort(reason);
    await assert.rejects(
      store.rememberAsync(author, note(), { signal: controller.signal }),
      (error) => error === reason,
    );
    assert.equal(locker.prepare("SELECT COUNT(*) AS n FROM memory_operations").get()?.n, 0);
    locker.exec("ROLLBACK");
    const result = await store.rememberAsync(author, note());
    controller.abort();
    assert.deepEqual(await store.rememberAsync(author, note()), result);
  } finally {
    locker.close();
    store.close();
  }
});
