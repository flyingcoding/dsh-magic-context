import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const current = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/** Identify exact source and built inputs without including generated timestamps or directory names. */
function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Apply the existing numeric gates to each independent artifact measurement. */
function verifyGates(measured, gates) {
  for (const key of [
    "storeOpenMs",
    "queryP95Ms",
    "snapshotP95Ms",
    "snapshotEstimatedTokens",
    "additionalRssMiB",
    "retainedSnapshotStateBytes",
  ]) {
    assert.ok(measured[key] <= gates[key], `${key}: ${measured[key]} exceeds ${gates[key]}`);
  }
  assert.equal(measured.auxiliaryModelCalls, gates.auxiliaryModelCalls);
  assert.equal(measured.additionalProcesses, gates.additionalProcesses);
}

/** Run unchanged workers from both packages under one cwd so snapshot path lengths are identical. */
function compare() {
  assert.ok(
    process.argv[2],
    "Pass the baseline package directory with dependencies and its accepted dist artifact",
  );
  const baseline = realpathSync(process.argv[2]);
  assert.notEqual(baseline, realpathSync(current));
  const budgets = JSON.parse(
    readFileSync(resolve(current, "../../docs/dsh/resource-budgets.json"), "utf8"),
  );
  const workloadHashes = {};
  for (const file of [
    "scripts/benchmark-worker.ts",
    "tests/fixtures.ts",
    "tests/recording-adapter.ts",
  ]) {
    workloadHashes[file] = hash(resolve(current, file));
    assert.equal(hash(resolve(baseline, file)), workloadHashes[file], `changed workload: ${file}`);
  }
  const workDirectory = mkdtempSync(resolve(tmpdir(), "dsh-memory-benchmark-"));
  const measurements = { before: [], after: [] };
  const artifacts = {};
  for (const [label, packageRoot] of [
    ["before", baseline],
    ["after", current],
  ]) {
    artifacts[label] = Object.fromEntries(
      ["index", "store", "tools", "recall"].map((name) => [
        name,
        hash(resolve(packageRoot, `dist/${name}.js`)),
      ]),
    );
  }
  for (const size of budgets.corpusSizes) {
    for (const [label, packageRoot] of [
      ["before", baseline],
      ["after", current],
    ]) {
      const processResult = spawnSync(
        process.execPath,
        [
          "--expose-gc",
          "--import",
          require.resolve("tsx"),
          resolve(packageRoot, "scripts/benchmark-worker.ts"),
          String(size),
          String(budgets.querySamples),
        ],
        { cwd: workDirectory, encoding: "utf8" },
      );
      assert.equal(processResult.status, 0, processResult.stderr || processResult.stdout);
      const measured = JSON.parse(processResult.stdout);
      verifyGates(measured, budgets.gates);
      measurements[label].push(measured);
    }
    assert.equal(
      measurements.before.at(-1).snapshotEstimatedTokens,
      measurements.after.at(-1).snapshotEstimatedTokens,
      "snapshot framing must be comparable",
    );
  }
  const report = {
    measuredAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    baseline,
    current,
    workDirectory,
    workloadHashes,
    artifacts,
    budgets,
    measurements,
  };
  mkdirSync(resolve(current, ".cache"), { recursive: true });
  writeFileSync(
    resolve(current, ".cache/benchmark-comparison.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
}

compare();
