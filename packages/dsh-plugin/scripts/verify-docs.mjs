import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const pairs = [
  ["README.md", "README.zh.md"],
  ["ARCHITECTURE.md", "ARCHITECTURE.zh.md"],
  ["STRUCTURE.md", "STRUCTURE.zh.md"],
  ["UPSTREAM.md", "UPSTREAM.zh.md"],
  ["docs/dsh/README.md", "docs/dsh/README.zh.md"],
  ["docs/dsh/migration-plan.md", "docs/dsh/migration-plan.zh.md"],
  ["docs/dsh/dsh-only-plan.md", "docs/dsh/dsh-only-plan.zh.md"],
  ["docs/dsh/compatibility.md", "docs/dsh/compatibility.zh.md"],
  ["packages/dsh-plugin/README.md", "packages/dsh-plugin/README.zh.md"],
];

/** Collect explicit anchors and ordinary GitHub-style heading anchors. */
function anchors(text) {
  const values = new Set([...text.matchAll(/<a\s+id="([^"]+)"/g)].map((match) => match[1]));
  for (const match of text.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    values.add(
      match[1]
        .toLowerCase()
        .replace(/[`*_~]/g, "")
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-"),
    );
  }
  return values;
}

/** Check local targets, anchors, and the required single trailing newline. */
function verify(path) {
  const absolute = resolve(root, path);
  const text = readFileSync(absolute, "utf8");
  assert.ok(text.endsWith("\n") && !text.endsWith("\n\n"), `${path}: trailing newline`);
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1].replace(/^<|>$/g, "");
    if (/^[a-z][a-z\d+.-]*:/i.test(link)) continue;
    const [target, anchor] = link.split("#");
    const destination = target ? resolve(dirname(absolute), decodeURIComponent(target)) : absolute;
    assert.ok(existsSync(destination), `${path}: missing ${link}`);
    if (anchor && destination.endsWith(".md"))
      assert.ok(
        anchors(readFileSync(destination, "utf8")).has(anchor),
        `${path}: missing anchor ${link}`,
      );
  }
  return text;
}

for (const [english, chinese] of pairs) {
  const a = verify(english);
  const b = verify(chinese);
  assert.equal(a.split("\n").length, b.split("\n").length, `${english}: paired line structure`);
  const blocks = (text) =>
    [...text.matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((match) => match[1]);
  assert.deepEqual(blocks(a), blocks(b), `${english}: paired executable examples`);
}
verify("AGENTS.md");
const checksums = readFileSync(resolve(root, "docs/dsh/migration-plan.i18n.yaml"), "utf8");
for (const file of ["migration-plan.md", "migration-plan.zh.md"]) {
  const hash = execFileSync("git", ["hash-object", `docs/dsh/${file}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  assert.ok(checksums.includes(`${file}: ${hash}`), `${file}: stale paired checksum`);
}
console.log(
  "DSH documentation pairs, local links, anchors, examples, and migration checksums passed",
);
