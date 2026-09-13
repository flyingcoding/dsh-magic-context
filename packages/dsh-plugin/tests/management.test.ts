import assert from "node:assert/strict";
import { test } from "node:test";
import { Context } from "@deepseek-ai/cordis";
import TypertRegistry from "@deepseek-ai/dsh-typert-registry";
import { resolveConfig } from "../src/config.ts";
import { installManagement, type MemoryManagementService } from "../src/management.ts";
import { MANAGEMENT_DESCRIPTOR, PACKAGE_NAME } from "../src/management-wire.ts";
import { MemoryStore } from "../src/store.ts";
import { caller, fixturePaths } from "./fixtures.ts";

test("management shares the store, preserves user provenance, and rejects unregistered workspaces", async () => {
  const paths = fixturePaths();
  const store = new MemoryStore(resolveConfig(paths));
  const ctx = new Context();
  await ctx.plugin(TypertRegistry);
  installManagement(ctx, store);
  try {
    const receiver = ctx.get("magicMemoryManager") as MemoryManagementService;
    const author = caller(paths.workspace);
    const memory = store.remember(author, {
      scope: "workspace",
      requestId: "original",
      content: "before correction",
      category: "CONSTRAINTS",
    });
    assert.ok(ctx.typert.getPackage(PACKAGE_NAME, "host"));
    assert.equal(MANAGEMENT_DESCRIPTOR.namespace, "magicMemoryManager");
    const request = {
      action: "update",
      workspace: author.workspace,
      scope: "workspace",
      id: memory.record.id,
      expectedRevision: 1,
      content: "after correction",
      requestId: "user-edit",
    };
    const edited = JSON.parse(await receiver.dispatch(JSON.stringify(request)));
    assert.equal(edited.record.provenance.source, "user");
    assert.equal(edited.record.provenance.sessionId, null);
    assert.deepEqual(JSON.parse(await receiver.dispatch(JSON.stringify(request))), edited);
    assert.equal(
      store.history(author.workspace, "workspace", memory.record.id)[1]?.provenance.source,
      "tool",
    );
    await assert.rejects(
      receiver.dispatch(
        JSON.stringify({
          action: "list",
          workspace: "/not/a/stored/workspace",
          scope: "workspace",
        }),
      ),
      /Unknown/,
    );
    await assert.rejects(
      receiver.dispatch(JSON.stringify({ ...request, requestId: "stale" })),
      /revision conflict/,
    );
    await assert.rejects(
      receiver.dispatch(JSON.stringify({ ...request, category: "OVERRIDE" })),
      /Unrecognized/,
    );
    await receiver.dispatch(
      JSON.stringify({
        action: "archive",
        workspace: author.workspace,
        scope: "workspace",
        id: memory.record.id,
        expectedRevision: 2,
        requestId: "user-archive",
      }),
    );
    const page = JSON.parse(
      await receiver.dispatch(
        JSON.stringify({ action: "list", workspace: author.workspace, scope: "workspace" }),
      ),
    );
    assert.equal(page.records[0].status, "archived");
    assert.deepEqual(
      store.recall(author.workspace, { query: "after correction", includeGlobal: false, limit: 5 }),
      [],
    );
  } finally {
    await ctx.fiber.dispose();
    store.close();
  }
});
