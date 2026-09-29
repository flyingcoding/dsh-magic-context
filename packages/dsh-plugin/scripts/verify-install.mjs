import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const root = mkdtempSync(resolve(tmpdir(), "dsh-memory-install-"));
const profile = resolve(root, "home/profiles/memory-probe");
mkdirSync(profile, { recursive: true, mode: 0o700 });
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", root], {
    cwd: packageRoot,
    encoding: "utf8",
  }),
)[0];
assert.ok(packed.files.some((file) => file.path === "dist/index.js"));
assert.ok(packed.files.some((file) => file.path === "dist/client.js"));
assert.ok(packed.files.some((file) => file.path === "cordis.patch.yml"));
assert.ok(
  !packed.files.some(
    (file) => /(^|\/)src\/.*\.(ts|tsx)$/.test(file.path) && !file.path.endsWith(".d.ts"),
  ),
  "artifact must not rely on uncompiled source",
);
const dependencies = Object.fromEntries(
  Object.entries(manifest.peerDependencies).filter(
    ([name]) => !manifest.peerDependenciesMeta?.[name]?.optional,
  ),
);
dependencies[manifest.name] = `file:${resolve(root, packed.filename)}`;
const hostVersion = dependencies["@deepseek-ai/dsh-agent"];
dependencies["@deepseek-ai/dsh-agent-loop-testkit"] = hostVersion;
dependencies["@deepseek-ai/dsh-agent-loop"] = hostVersion;
// npm can select a newer prerelease for transitive peers despite exact direct pins.
const hostOverrides = Object.fromEntries(
  [
    ...Object.keys(manifest.devDependencies).filter((name) => name.startsWith("@deepseek-ai/dsh-")),
    "@deepseek-ai/dsh-brand",
    "@deepseek-ai/dsh-code-runtime",
    "@deepseek-ai/dsh-deque",
    "@deepseek-ai/dsh-invariants",
    "@deepseek-ai/dsh-scope",
    "@deepseek-ai/dsh-settings",
    "@deepseek-ai/dsh-timeout",
    "@deepseek-ai/dsh-user-approval",
    "@deepseek-ai/dsh-util-crypto",
    "@deepseek-ai/dsh-util-values",
  ].map((name) => [name, hostVersion]),
);
writeFileSync(
  resolve(profile, "package.json"),
  `${JSON.stringify(
    {
      name: "dsh-memory-install-probe",
      private: true,
      type: "module",
      dependencies,
      overrides: hostOverrides,
      dsh: {
        profile: { bundles: ["@deepseek-ai/dsh-base", manifest.name], patchReload: "startup" },
      },
    },
    null,
    2,
  )}\n`,
);
writeFileSync(resolve(profile, "cordis.patch.yml"), "[]\n");
const env = { ...process.env, NODE_PATH: "", DSH_HOME: resolve(root, "home") };
console.log(`Installing tarball outside the checkout: ${profile}`);
execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: profile,
  env,
  stdio: "pipe",
  timeout: 300000,
});
const installed = JSON.parse(
  execFileSync("npm", ["ls", "--all", "--json"], {
    cwd: profile,
    env,
    encoding: "utf8",
    timeout: 30000,
  }),
);
/** Refuse a mixed DSH prerelease graph even when npm finds a formally valid peer range. */
function assertHostVersions(entries) {
  for (const [name, entry] of Object.entries(entries ?? {})) {
    if (name.startsWith("@deepseek-ai/dsh-") && entry.version !== undefined) {
      assert.equal(entry.version, hostVersion, `mismatched installed DSH package: ${name}`);
    }
    assertHostVersions(entry.dependencies);
  }
}
assertHostVersions(installed.dependencies);
copyFileSync(resolve(packageRoot, "scripts/install-probe.mjs"), resolve(profile, "probe.mjs"));
const result = JSON.parse(
  execFileSync(process.execPath, ["probe.mjs"], {
    cwd: profile,
    env,
    encoding: "utf8",
    timeout: 30000,
  }),
);
const installedRoot = resolve(profile, "node_modules", manifest.name);
const declarationPaths = packed.files.filter((file) => file.path.endsWith(".d.ts"));
for (const value of Object.values(manifest.exports)) {
  if (typeof value === "object") {
    assert.ok(
      existsSync(resolve(installedRoot, value.types)),
      `missing public types: ${value.types}`,
    );
  }
}
for (const { path } of declarationPaths) {
  const file = resolve(installedRoot, path);
  const source = readFileSync(file, "utf8");
  const imports = ts.preProcessFile(source).importedFiles;
  for (const { fileName: specifier } of imports) {
    if (!specifier.startsWith(".")) continue;
    const resolved = ts.resolveModuleName(
      specifier,
      file,
      { moduleResolution: ts.ModuleResolutionKind.Bundler },
      ts.sys,
    ).resolvedModule;
    assert.ok(resolved, `${path}: unresolved declaration ${specifier}`);
    assert.ok(
      !relative(installedRoot, resolved.resolvedFileName).startsWith(".."),
      `${path}: declaration escapes package`,
    );
  }
  assert.doesNotMatch(source, /better-sqlite3|@magic-context\/core|(?:\.\.\/)+plugin\//);
}
result.declarationFiles = declarationPaths.length;
result.declarationClosure = "passed";
const launcher = spawnSync("dsh", ["--version"], {
  cwd: profile,
  env,
  encoding: "utf8",
  timeout: 60000,
});
if (launcher.error?.code === "ENOENT") {
  result.profileComposition = "not run: dsh CLI unavailable";
} else {
  assert.equal(launcher.status, 0, launcher.stderr);
  const launcherVersion = launcher.stdout.trim();
  if (launcherVersion !== hostVersion) {
    result.profileComposition = `not run: dsh CLI ${launcherVersion} differs from ${hostVersion}`;
  } else {
    const composition = spawnSync("dsh", ["--profile", "memory-probe", "--dump-config"], {
      cwd: profile,
      env,
      encoding: "utf8",
      timeout: 60000,
    });
    assert.equal(composition.status, 0, composition.stderr);
    for (const id of ["magic-memory-store", "magic-memory-tools", "magic-memory-recall"])
      assert.ok(composition.stdout.includes(id), `missing bundle row ${id}`);
    assert.match(composition.stdout, /compaction/);
    result.profileComposition = "passed";
  }
}
result.tarball = resolve(root, packed.filename);
result.sha256 = createHash("sha256").update(readFileSync(result.tarball)).digest("hex");
result.profile = profile;
result.compressedBytes = packed.size;
result.unpackedBytes = packed.unpackedSize;
mkdirSync(resolve(packageRoot, ".cache"), { recursive: true });
writeFileSync(resolve(packageRoot, ".cache/install.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
