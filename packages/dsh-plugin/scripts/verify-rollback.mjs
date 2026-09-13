import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { MemoryStore } from "../dist/store.js";

/** Exercise both artifact versions against a fresh synthetic database without migrating its schema. */
async function verifyRollback() {
  const supplied = process.env.DSH_MEMORY_BASELINE_STORE;
  assert.ok(
    supplied,
    "Set DSH_MEMORY_BASELINE_STORE to the accepted artifact's installed dist/store.js",
  );
  const baselinePath = resolve(supplied);
  const { MemoryStore: BaselineStore } = await import(pathToFileURL(baselinePath).href);
  const root = mkdtempSync(resolve(tmpdir(), "dsh-memory-rollback-"));
  const options = {
    databasePath: resolve(root, "memory.sqlite"),
    cacheSizeMiB: 8,
    busyTimeoutMs: 100,
    maxContentChars: 4000,
    maxQueryChars: 512,
    maxResults: 20,
  };
  const author = {
    workspace: root,
    provenance: {
      harness: "dsh",
      source: "tool",
      sessionId: "rollback-probe",
      callId: "probe",
      eventSeq: null,
    },
  };
  const request = {
    requestId: "original-write",
    scope: "workspace",
    category: "CONSTRAINTS",
    content: "原有事实 releaseCheck API_KEY",
  };
  const before = new BaselineStore(options);
  let original;
  let archived;
  try {
    original = before.remember(author, request);
    archived = before.remember(author, {
      ...request,
      requestId: "archived-write",
      content: "旧归档事实",
    });
    before.forget(author, {
      requestId: "old-archive",
      scope: "workspace",
      id: archived.record.id,
      expectedRevision: 1,
    });
  } finally {
    before.close();
  }
  const current = new MemoryStore(options);
  let edited;
  let added;
  try {
    assert.deepEqual(current.remember(author, request), original);
    assert.equal(
      current.recall(root, { query: "原有事实 releaseCheck", includeGlobal: false, limit: 5 })[0]
        ?.id,
      original.record.id,
    );
    assert.deepEqual(
      current.recall(root, { query: "旧归档事实", includeGlobal: false, limit: 5 }),
      [],
    );
    edited = current.update(author, {
      ...request,
      requestId: "new-edit",
      id: original.record.id,
      expectedRevision: 1,
      content: "修正事实 getUserById /src/storage.ts",
    });
    added = current.remember(author, {
      ...request,
      requestId: "new-global",
      scope: "global",
      category: "USER_PREFERENCES",
      content: "全局偏好 GLOBAL-rollback",
    });
  } finally {
    current.close();
  }
  const rollback = new BaselineStore(options);
  try {
    assert.deepEqual(rollback.get(root, "workspace", original.record.id), edited.record);
    assert.deepEqual(rollback.remember(author, request), original);
    assert.equal(rollback.get(root, "workspace", archived.record.id).status, "archived");
    assert.equal(
      rollback.recall(root, { query: "修正事实 getUserById", includeGlobal: false, limit: 5 })[0]
        ?.revision,
      2,
    );
    assert.equal(
      rollback.recall(root, { query: "全局偏好 GLOBAL-rollback", includeGlobal: true, limit: 5 })[0]
        ?.id,
      added.record.id,
    );
    rollback.forget(author, {
      requestId: "rollback-archive",
      scope: "workspace",
      id: original.record.id,
      expectedRevision: 2,
    });
  } finally {
    rollback.close();
  }
  const reopened = new MemoryStore(options);
  try {
    assert.equal(reopened.get(root, "workspace", original.record.id).revision, 3);
    assert.equal(reopened.get(root, "workspace", original.record.id).status, "archived");
  } finally {
    reopened.close();
  }
  const database = new DatabaseSync(options.databasePath, { readOnly: true });
  try {
    assert.equal(database.prepare("PRAGMA application_id").get().application_id, 0x44534d43);
    assert.equal(database.prepare("PRAGMA user_version").get().user_version, 1);
  } finally {
    database.close();
  }
  const result = {
    testedAt: new Date().toISOString(),
    node: process.version,
    baselineStoreSha256: createHash("sha256").update(readFileSync(baselinePath)).digest("hex"),
    currentStoreSha256: createHash("sha256")
      .update(readFileSync(new URL("../dist/store.js", import.meta.url)))
      .digest("hex"),
    sequence: [
      "accepted artifact writes",
      "specialized artifact reads and revises",
      "accepted artifact reads and archives",
      "specialized artifact reopens",
    ],
    stableIdsAndReceipts: true,
    revisionsAndArchive: true,
    literalAndGlobalRecall: true,
    schemaVersion: 1,
    dataConversionRequired: false,
  };
  mkdirSync(".cache", { recursive: true });
  writeFileSync(".cache/rollback.json", `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

await verifyRollback();
