import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const workspace = "packages/dsh-plugin";

/** Parse generated JSONC without rewriting dependency resolutions or integrity hashes. */
function readJson(path) {
  const result = ts.parseConfigFileTextToJson(path, readFileSync(resolve(root, path), "utf8"));
  assert.equal(result.error, undefined, `${path}: invalid JSON`);
  return result.config;
}

/** Refuse repository inputs that restore an adapter or its former command owner. */
function verifyProject() {
  const manifest = readJson("package.json");
  const plugin = readJson(`${workspace}/package.json`);
  const lock = readJson("bun.lock");
  assert.equal(manifest.private, true);
  assert.deepEqual(manifest.workspaces, [workspace]);
  assert.deepEqual(
    readdirSync(resolve(root, "packages"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort(),
    ["dsh-plugin"],
  );
  assert.deepEqual(Object.keys(lock.workspaces).sort(), ["", workspace]);
  assert.equal(plugin.name, "@flyingcoding/dsh-magic-context");
  assert.equal(plugin.private, true);
  assert.equal(plugin.engines.node, ">=24");
  assert.deepEqual(plugin.dsh.bundle, { patch: "./cordis.patch.yml" });
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    assert.deepEqual(lock.workspaces[workspace][field], plugin[field], `stale lockfile ${field}`);
  }
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (entry[0].startsWith("workspace:")) {
      assert.equal(name, plugin.name, `retired workspace in lockfile: ${name}`);
      assert.equal(entry[0], `workspace:${workspace}`);
    }
  }
  for (const path of [
    "Cargo.toml",
    "Cargo.lock",
    "pnpm-lock.yaml",
    "bunfig.toml",
    "crates",
    "tests/docker",
    "scripts",
  ]) {
    assert.equal(existsSync(resolve(root, path)), false, `retired root input: ${path}`);
  }
  const retired =
    /packages\/(?:plugin|pi-plugin|cli|dashboard|docs|e2e-tests|retina-local-fs)(?:\/|\b)|\bcargo\b|@cortexkit\/|\.\.\/deepseek-harness/;
  for (const [name, command] of Object.entries({ ...manifest.scripts, ...plugin.scripts })) {
    assert.doesNotMatch(command, retired, `retired script owner: ${name}`);
  }
  assert.deepEqual(readdirSync(resolve(root, ".github/workflows")), ["dsh.yml"]);
  assert.doesNotMatch(readFileSync(resolve(root, ".github/workflows/dsh.yml"), "utf8"), retired);
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const name of Object.keys(plugin[field])) {
      assert.doesNotMatch(
        name,
        /better-sqlite3|@cortexkit\/|@opencode-ai\/|onnxruntime|@huggingface\//,
      );
    }
  }
  const build = readJson(`${workspace}/tsconfig.build.json`);
  assert.equal(build.compilerOptions.rootDir, "src");
  assert.equal(build.compilerOptions.outDir, "dist/types");
  console.log(
    `DSH-only ownership and lockfile passed (${Object.keys(lock.packages).length} resolved package entries)`,
  );
}

verifyProject();
