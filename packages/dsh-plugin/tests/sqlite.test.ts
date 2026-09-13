import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { Database } from "../src/sqlite.ts";
import { fixturePaths } from "./fixtures.ts";

// Retains the DSH-relevant cases from upstream scripts/smoke-node-sqlite.ts at
// 6f718ff019bf327a0b291a8510dfb42f91b65921 (MIT), extended for nested modes and errors.

test("Node statements preserve positional, array, named, binary, and empty bindings", () => {
  const db = new Database();
  try {
    assert.ok(db instanceof DatabaseSync);
    db.exec("CREATE TABLE values_test(id INTEGER PRIMARY KEY, value TEXT UNIQUE, flag INTEGER)");
    const insert = db.prepare("INSERT INTO values_test(value, flag) VALUES (?, ?)");
    const written = insert.run("first", 1);
    assert.equal(written.changes, 1);
    assert.equal(Number(written.lastInsertRowid), 1);
    insert.run(["second", 2]);
    db.prepare("INSERT INTO values_test(value, flag) VALUES ($value, ?)").run(
      { value: "third" },
      3,
    );
    assert.equal(
      db.prepare("SELECT value FROM values_test WHERE flag=?").get([2])?.value,
      "second",
    );
    assert.deepEqual(
      db
        .prepare("SELECT value FROM values_test WHERE flag>? ORDER BY id")
        .all([1])
        .map((row) => row.value),
      ["second", "third"],
    );
    assert.equal(
      db.prepare("SELECT value FROM values_test WHERE flag=$flag").get({ flag: 3 })?.value,
      "third",
    );
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM values_test").get()?.count, 3);
    assert.equal(db.prepare("SELECT hex(?) AS value").get(Buffer.from([1, 255]))?.value, "01FF");
    assert.equal(db.prepare("SELECT ? AS value").get(null)?.value, null);
    assert.equal(db.prepare("SELECT ? AS value").get(42n)?.value, 42);
    assert.throws(() => insert.run("first", 4), /UNIQUE/);
    assert.throws(() => db.prepare("SELECT * FROM missing_table"), /no such table/);
  } finally {
    db.close();
  }
});

test("transaction modes preserve receiver, arguments, return values, and thrown errors", () => {
  const db = new Database();
  try {
    db.exec("CREATE TABLE records(value TEXT)");
    const insert = db.prepare("INSERT INTO records VALUES (?)");
    const operation = db.transaction(function (this: { prefix: string }, suffix: string) {
      assert.equal(db.isTransaction, true);
      insert.run(this.prefix + suffix);
      return this.prefix + suffix;
    });
    for (const [index, execute] of [
      operation,
      operation.default,
      operation.deferred,
      operation.immediate,
      operation.exclusive,
    ].entries()) {
      assert.equal(execute.call({ prefix: "row-" }, String(index)), `row-${index}`);
      assert.equal(db.isTransaction, false);
    }
    const failure = new Error("operation failed");
    assert.throws(
      () =>
        db
          .transaction(() => {
            insert.run("discard");
            throw failure;
          })
          .immediate(),
      (error) => error === failure,
    );
    assert.equal(db.isTransaction, false);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM records").get()?.count, 5);
  } finally {
    db.close();
  }
});

test("nested savepoints isolate failures inside a manually opened immediate transaction", () => {
  const db = new Database();
  try {
    db.exec("CREATE TABLE records(value TEXT); BEGIN IMMEDIATE");
    const insert = db.prepare("INSERT INTO records VALUES (?)");
    insert.run("manual");
    db.transaction(() => {
      insert.run("outer");
      assert.throws(
        () =>
          db
            .transaction(() => {
              insert.run("inner-discard");
              db.transaction(() => insert.run("deep-discard")).exclusive();
              throw new Error("inner failure");
            })
            .immediate(),
        /inner failure/,
      );
      db.transaction(() => insert.run("inner-keep")).deferred();
    })();
    assert.equal(db.isTransaction, true);
    assert.deepEqual(
      db
        .prepare("SELECT value FROM records")
        .all()
        .map((row) => row.value),
      ["manual", "outer", "inner-keep"],
    );
    db.exec("ROLLBACK");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM records").get()?.count, 0);
    db.transaction(() => insert.run("after-rollback"))();
    assert.equal(db.prepare("SELECT value FROM records").get()?.value, "after-rollback");
  } finally {
    db.close();
  }
});

test("a failed commit rolls back its writes and releases the transaction", () => {
  const db = new Database();
  try {
    db.exec(`CREATE TABLE parent(id INTEGER PRIMARY KEY);
      CREATE TABLE child(id INTEGER REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED)`);
    assert.throws(
      () => db.transaction(() => db.prepare("INSERT INTO child VALUES (?)").run(1)).immediate(),
      /FOREIGN KEY/,
    );
    assert.equal(db.isTransaction, false);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM child").get()?.count, 0);
    db.transaction(() => {
      db.prepare("INSERT INTO parent VALUES (?)").run(1);
      db.prepare("INSERT INTO child VALUES (?)").run(1);
    }).immediate();
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM child").get()?.count, 1);
  } finally {
    db.close();
  }
});

test("readonly reopening preserves data and closed connections cannot execute statements", () => {
  const { databasePath } = fixturePaths();
  const writable = new Database(databasePath);
  writable.exec("CREATE TABLE records(value TEXT); INSERT INTO records VALUES ('persisted')");
  const statement = writable.prepare("SELECT value FROM records");
  writable.close();
  assert.throws(() => statement.get());
  assert.throws(() => writable.prepare("SELECT 1"));
  for (const options of [{ readonly: true }, { readOnly: true }]) {
    const reader = new Database(databasePath, options);
    try {
      assert.equal(reader.prepare("SELECT value FROM records").get()?.value, "persisted");
      assert.throws(() => reader.exec("INSERT INTO records VALUES ('blocked')"), /readonly/);
    } finally {
      reader.close();
    }
  }
});
