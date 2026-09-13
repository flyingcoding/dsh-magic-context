import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(root, "src");

/** Enumerate only the retained package source, independent of other workspace trees. */
function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test("runtime and type imports stay inside the DSH source or its declared dependencies", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const declared = new Set([
    ...Object.keys(manifest.dependencies),
    ...Object.keys(manifest.peerDependencies),
  ]);
  const development = new Set(Object.keys(manifest.devDependencies));
  for (const path of sourceFiles(sourceRoot)) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(
      /\b(?:import|export)\s+(type\s+)?(?:[^;"']*?\sfrom\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/g,
    )) {
      const specifier = match[2] ?? match[3];
      if (specifier.startsWith("node:")) continue;
      if (specifier.startsWith(".")) {
        const target = resolve(dirname(path), specifier);
        assert.ok(
          !relative(sourceRoot, target).startsWith(".."),
          `${path}: external source ${specifier}`,
        );
        assert.ok(existsSync(target), `${path}: missing source ${specifier}`);
      } else {
        const name = specifier
          .split("/")
          .slice(0, specifier.startsWith("@") ? 2 : 1)
          .join("/");
        assert.ok(
          declared.has(name) || (match[1] && development.has(name)),
          `${path}: undeclared dependency ${specifier}`,
        );
      }
    }
  }
});

test("DSH call sites use spread SQLite binds and the SQLite leaf has no relative imports", () => {
  for (const path of sourceFiles(sourceRoot)) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /(?<!Promise)\.(?:run|get|all)\(\s*\[/, path);
  }
  assert.doesNotMatch(readFileSync(resolve(sourceRoot, "sqlite.ts"), "utf8"), /\bfrom\s+["']\./);
});
