import { mkdirSync, mkdtempSync } from "node:fs";
import { resolve } from "node:path";
import { workspaceKey } from "../src/scope.ts";
import type { MemoryCaller } from "../src/types.ts";

/** Keep isolated artifacts under the ignored test cache for reproducible failure inspection. */
export function fixturePaths(): {
  root: string;
  workspace: string;
  other: string;
  databasePath: string;
} {
  const cache = resolve(".cache/tests");
  mkdirSync(cache, { recursive: true });
  const root = mkdtempSync(`${cache}/memory-`);
  const workspace = resolve(root, "workspace");
  const other = resolve(root, "other");
  mkdirSync(workspace);
  mkdirSync(other);
  return { root, workspace, other, databasePath: resolve(root, "memory.sqlite") };
}

/** Build trusted fixture provenance without reading a real user Session. */
export function caller(workspace: string, sessionId = "fixture-session"): MemoryCaller {
  return {
    workspace: workspaceKey(workspace),
    provenance: {
      harness: "dsh",
      source: "tool",
      sessionId,
      callId: "fixture-call",
      eventSeq: null,
    },
  };
}
