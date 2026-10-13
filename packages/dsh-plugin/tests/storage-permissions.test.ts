import assert from "node:assert/strict";
import { chmodSync, lstatSync, mkdirSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { resolveConfig } from "../src/config.ts";
import { MemoryStore } from "../src/store.ts";
import { caller, fixturePaths } from "./fixtures.ts";

test("restored database and live sidecars become private without touching a custom parent", {
  skip: process.platform === "win32",
}, () => {
  const paths = fixturePaths();
  const author = caller(paths.workspace);
  const first = new MemoryStore(resolveConfig(paths));
  first.remember(author, {
    content: "private restored memory",
    category: "CONSTRAINTS",
    scope: "workspace",
    requestId: "restore",
  });
  const parent = dirname(paths.databasePath);
  const unrelated = resolve(parent, "unrelated.txt");
  writeFileSync(unrelated, "unrelated", { mode: 0o644 });
  chmodSync(parent, 0o755);
  for (const suffix of ["", "-wal", "-shm"]) chmodSync(paths.databasePath + suffix, 0o644);
  const second = new MemoryStore(resolveConfig(paths));
  try {
    for (const suffix of ["", "-wal", "-shm"])
      assert.equal(statSync(paths.databasePath + suffix).mode & 0o777, 0o600);
    assert.equal(statSync(parent).mode & 0o777, 0o755);
    assert.equal(statSync(unrelated).mode & 0o777, 0o644);
    assert.equal(second.recent(author.workspace, false, 5).length, 1);
  } finally {
    second.close();
    first.close();
  }
  const owned = new MemoryStore({ ...resolveConfig(paths), privateDirectory: true });
  owned.close();
  assert.equal(statSync(parent).mode & 0o777, 0o700);
});

test("database and sidecar links are refused without changing their targets", {
  skip: process.platform === "win32",
}, () => {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const paths = fixturePaths();
    const target = resolve(paths.root, "target.sqlite");
    const db = new DatabaseSync(target);
    db.exec("CREATE TABLE unrelated(value TEXT)");
    db.close();
    chmodSync(target, 0o644);
    symlinkSync(target, paths.databasePath + suffix);
    assert.throws(() => new MemoryStore(resolveConfig(paths)), /unlinked regular file/);
    assert.ok(lstatSync(paths.databasePath + suffix).isSymbolicLink());
    assert.equal(statSync(target).mode & 0o777, 0o644);
  }
  const paths = fixturePaths();
  const target = resolve(paths.root, "linked-directory");
  mkdirSync(target);
  const linked = resolve(paths.root, "storage-link");
  symlinkSync(target, linked);
  assert.throws(
    () =>
      new MemoryStore({
        ...resolveConfig(paths),
        databasePath: resolve(linked, "memory.sqlite"),
        privateDirectory: true,
      }),
    /symbolic link/,
  );
});

test("foreign database permissions are unchanged when ownership is refused", {
  skip: process.platform === "win32",
}, () => {
  const paths = fixturePaths();
  const db = new DatabaseSync(paths.databasePath);
  db.exec("CREATE TABLE foreign_data(value TEXT)");
  db.close();
  chmodSync(paths.databasePath, 0o644);
  assert.throws(() => new MemoryStore(resolveConfig(paths)), /Refusing foreign/);
  assert.equal(statSync(paths.databasePath).mode & 0o777, 0o644);
});
