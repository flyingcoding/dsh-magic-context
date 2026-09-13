import type {
  InvocationDescriptor,
  RemoteResult,
  TypertRemoteContribution,
  TypertSchema,
} from "@deepseek-ai/dsh-typert-protocol";
import type { MemoryRecord, MemoryScope } from "./types.ts";

export const PACKAGE_NAME = "@flyingcoding/dsh-magic-context";

/** Bounded page served through the existing authenticated DSH gateway. */
export interface MemoryPage {
  records: MemoryRecord[];
  next: string | null;
  maxContentChars: number;
}

export type ManagementRequest =
  | { action: "workspaces"; after?: string }
  | { action: "list"; workspace: string; scope: MemoryScope; after?: string }
  | {
      action: "update";
      workspace: string;
      scope: MemoryScope;
      id: string;
      expectedRevision: number;
      content: string;
      requestId: string;
    }
  | {
      action: "archive";
      workspace: string;
      scope: MemoryScope;
      id: string;
      expectedRevision: number;
      requestId: string;
    };

/** Reject non-text or oversized wire values before parsing action-specific JSON. */
const jsonText: TypertSchema<string> = {
  parse(value: unknown): string {
    if (typeof value !== "string" || value.length > 2_000_000)
      throw new TypeError("Invalid memory management payload");
    return value;
  },
};

export const MANAGEMENT_DESCRIPTOR: InvocationDescriptor = {
  id: `${PACKAGE_NAME}#magicMemoryManager/dispatch`,
  service: "magicMemoryManager",
  namespace: "magicMemoryManager",
  method: "dispatch",
  invocation: { kind: "direct" },
  parameters: [
    {
      name: "request",
      wire: "request",
      source: "json",
      codec: { mode: "strict", typeSymbol: "string", schema: jsonText },
    },
  ],
  result: { mode: "strict", typeSymbol: "string", schema: jsonText },
};

export const MANAGEMENT_HOST = {
  package: PACKAGE_NAME,
  face: "host" as const,
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: [MANAGEMENT_DESCRIPTOR],
};

export const MANAGEMENT_CLIENT: TypertRemoteContribution = {
  package: PACKAGE_NAME,
  descriptors: [MANAGEMENT_DESCRIPTOR],
};

declare module "@deepseek-ai/dsh-typert-protocol" {
  interface TypertRemoteMap {
    "magicMemoryManager/dispatch": (request: string) => Promise<RemoteResult<string>>;
  }
  interface TypertRemoteNamespaceMap {
    magicMemoryManager: { dispatch(request: string): Promise<RemoteResult<string>> };
  }
}
