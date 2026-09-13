import { realpathSync } from "node:fs";
import { isAbsolute } from "node:path";
import type { Agent } from "@deepseek-ai/dsh-agent";
import type { ToolRunContext } from "@deepseek-ai/dsh-tools";
import type { MemoryCaller, WorkspaceKey } from "./types.ts";

/** Canonicalize a host-validated workspace; clones and worktrees remain isolated. */
export function workspaceKey(cwd: string): WorkspaceKey {
  if (!isAbsolute(cwd)) throw new TypeError("Memory requires an absolute workspace directory");
  return realpathSync(cwd) as WorkspaceKey;
}

/** Refuse model access when the Session does not identify a trusted workspace. */
export function agentWorkspace(agent: Agent): WorkspaceKey {
  const cwd = agent.session.header.cwd;
  if (!cwd)
    throw new Error("Memory requires a Session workspace; no process-wide fallback is used");
  return workspaceKey(cwd);
}

/** Derive write provenance from the dispatch, using its stable call id for replay correlation. */
export function callerFor(exec: ToolRunContext): MemoryCaller {
  if (!exec.agent) throw new Error("Memory tools require an Agent-owned call");
  return {
    workspace: agentWorkspace(exec.agent),
    provenance: {
      harness: "dsh",
      source: "tool",
      sessionId: exec.agent.session.id,
      callId: exec.callId,
      eventSeq: null,
    },
  };
}
