import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/** Run each corpus in a fresh process so one measurement cannot inherit another's heap. */
function benchmark(): void {
  const budgets = JSON.parse(readFileSync("../../docs/dsh/resource-budgets.json", "utf8"));
  const measurements: unknown[] = [];
  for (const size of budgets.corpusSizes) {
    const result = spawnSync(
      process.execPath,
      [
        "--expose-gc",
        "--import",
        "tsx",
        "scripts/benchmark-worker.ts",
        String(size),
        String(budgets.querySamples),
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const measured = JSON.parse(result.stdout);
    const gates = budgets.gates;
    assert.ok(measured.storeOpenMs <= gates.storeOpenMs, "store open latency");
    assert.ok(measured.queryP95Ms <= gates.queryP95Ms, "query p95 latency");
    assert.ok(measured.snapshotP95Ms <= gates.snapshotP95Ms, "snapshot p95 latency");
    assert.ok(
      measured.snapshotEstimatedTokens <= gates.snapshotEstimatedTokens,
      "snapshot token budget",
    );
    assert.ok(measured.additionalRssMiB <= gates.additionalRssMiB, "additional process RSS");
    assert.ok(
      measured.retainedSnapshotStateBytes <= gates.retainedSnapshotStateBytes,
      "retained snapshot projection",
    );
    assert.equal(measured.auxiliaryModelCalls, gates.auxiliaryModelCalls);
    assert.equal(measured.additionalProcesses, gates.additionalProcesses);
    measurements.push(measured);
  }
  const report = {
    measuredAt: new Date().toISOString(),
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    budgets,
    measurements,
  };
  mkdirSync(".cache", { recursive: true });
  writeFileSync(".cache/benchmark.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log(`Evidence: ${resolve(".cache/benchmark.json")}`);
}

benchmark();
