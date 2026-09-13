import { normalizeMemoryContent } from "./normalize.ts";

/** Split Han text into indexed bigrams and singleton tokens without a model or dictionary. */
export function searchTokens(text: string): string[] {
  const tokens = new Set<string>();
  const splitCase = text.replace(/([a-z\d])([A-Z])/g, "$1 $2");
  for (const version of [text, splitCase]) {
    for (const word of normalizeMemoryContent(version.normalize("NFKC")).match(
      /[\p{L}\p{N}_]+/gu,
    ) ?? []) {
      for (const part of word.match(/[\p{Script=Han}]+|[^\p{Script=Han}]+/gu) ?? []) {
        if (/\p{Script=Han}/u.test(part)) {
          const chars = [...part];
          for (let i = 0; i < chars.length; i++) {
            tokens.add(`c${chars[i].codePointAt(0)?.toString(16)}`);
            if (i + 1 < chars.length) {
              tokens.add(
                `b${chars[i].codePointAt(0)?.toString(16)}x${chars[i + 1].codePointAt(0)?.toString(16)}`,
              );
            }
          }
        } else {
          tokens.add(`w${Buffer.from(part).toString("hex")}`);
        }
      }
    }
  }
  return [...tokens];
}

/** Encode literal terms as safe FTS5 conjunctions; no query operators are accepted. */
export function toFtsQuery(text: string): string {
  return searchTokens(text)
    .map((token) => `"${token}"`)
    .join(" AND ");
}

/** Conservative UTF-8 estimate, not a model-specific tokenizer or measured token bill. */
export function estimateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, "utf8") / 3);
}
