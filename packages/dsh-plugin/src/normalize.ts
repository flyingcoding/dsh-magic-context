// Adapted from packages/plugin/src/features/magic-context/memory/normalize-hash.ts
// in cortexkit/magic-context at 6f718ff019bf327a0b291a8510dfb42f91b65921 (MIT).

/** Normalize keyword-search text; write deduplication deliberately preserves case. */
export function normalizeMemoryContent(content: string): string {
  return content.toLowerCase().replace(/\s+/g, " ").trim();
}
