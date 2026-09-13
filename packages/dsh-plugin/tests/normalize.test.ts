import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeMemoryContent } from "../src/normalize.ts";
import { searchTokens, toFtsQuery } from "../src/tokenize.ts";

// Normalization regression retained from upstream memory/normalize-hash.test.ts
// at 6f718ff019bf327a0b291a8510dfb42f91b65921 (MIT). The unused MD5 helper is retired.
test("keyword normalization preserves the upstream whitespace and case contract", () => {
  assert.equal(normalizeMemoryContent("  Keep   This\nVALUE\tStable  "), "keep this value stable");
  assert.equal(normalizeMemoryContent("  四川生产库\nAPI_KEY  "), "四川生产库 api_key");
});

test("Chinese and mixed queries retain literal terms across normalization", () => {
  assert.deepEqual(searchTokens("生产库 API_KEY"), searchTokens("  生产库\tapi_key  "));
  const indexed = new Set(
    searchTokens("四川生产库 uses getUserById in /src/Storage.ts: ECONNRESET"),
  );
  for (const term of searchTokens("生产库 getUserById Storage.ts ECONNRESET")) {
    assert.ok(indexed.has(term), `missing literal term ${term}`);
  }
  assert.equal(toFtsQuery('" OR * ()'), '"w6f72"');
  assert.equal(toFtsQuery(" \t\n "), "");
});
