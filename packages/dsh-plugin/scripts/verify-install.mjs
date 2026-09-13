import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
dependencies["@deepseek-ai/dsh-agent-loop-testkit"] = "0.1.5-rc.2";
dependencies["@deepseek-ai/dsh-agent-loop"] = "0.1.5-rc.2";
writeFileSync(
  resolve(profile, "package.json"),
  `${JSON.stringify(
    {
      name: "dsh-memory-install-probe",
      private: true,
      type: "module",
      dependencies,
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
copyFileSync(resolve(packageRoot, "scripts/install-probe.mjs"), resolve(profile, "probe.mjs"));
const result = JSON.parse(
  execFileSync(process.execPath, ["probe.mjs"], {
    cwd: profile,
    env,
    encoding: "utf8",
    timeout: 30000,
  }),
);
const composition = spawnSync("dsh", ["--profile", "memory-probe", "--dump-config"], {
  cwd: profile,
  env,
  encoding: "utf8",
  timeout: 60000,
});
if (composition.error?.code !== "ENOENT") {
  assert.equal(composition.status, 0, composition.stderr);
  for (const id of ["magic-memory-store", "magic-memory-tools", "magic-memory-recall"])
    assert.ok(composition.stdout.includes(id), `missing bundle row ${id}`);
  assert.match(composition.stdout, /compaction/);
  result.profileComposition = "passed";
} else {
  result.profileComposition = "not run: dsh CLI unavailable";
}
result.tarball = resolve(root, packed.filename);
result.profile = profile;
result.compressedBytes = packed.size;
result.unpackedBytes = packed.unpackedSize;
mkdirSync(resolve(packageRoot, ".cache"), { recursive: true });
writeFileSync(resolve(packageRoot, ".cache/install.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
