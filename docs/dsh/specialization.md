# DSH-only specialization acceptance

English | [中文](specialization.zh.md)

S1–S4 are complete for the local macOS arm64 / Node 24 acceptance scope. The project has one DSH workspace, local audited source, default DSH commands, and one verification workflow. The final private tarball passed standalone installation, model-driven memory operations, Web management, and old/new database round trips. [Machine-readable evidence](evidence/2026-09-13-dsh-only-acceptance.json) retains exact inputs, measurements, command results, and observed failures.

## Reproducible inputs

| Input | Verified value |
|---|---|
| Accepted source baseline | `73cd88b40b2b0852f75ba267100e3ce664aac102`; the planning snapshot is `f99f30517f99fd2abe436c965c26e003a3a1546a`. |
| Source extraction / workspace removal | `9d958bc2` / `cfb788fe` on `dsh_main`. |
| Final artifact build | `dc99b926626d3c9b625a2fec2e42130b06ea705f`, built and installed from an independent clean checkout. |
| Live acceptance harness | `eba1a3ed`; at this revision only the history-test instruction differs from the artifact-build revision. Shipped files remain identical. |
| Package | `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`, private local tarball. |
| Artifact SHA-256 | `8ec74edbcfeb38bf0fb00b3c4edcc50a0705ea4f0b7a44c53ea611e23aabf833`. |
| Tooling | Node `v24.18.0`, Bun `1.3.5`, macOS 27.0 arm64. |
| DSH | Published test dependencies and installed launcher `0.1.5-rc.2`; Cordis `4.0.2`. Actual live AgentLoop/tools hashes are in the evidence. |
| Model | Ollama Cloud `https://ollama.com/v1`, `ollama/deepseek-v4.1-flash`, using the existing credential reference in an isolated home. |

The [initial alpha acceptance](compatibility.md) and [planning inventory](evidence/2026-09-13-dsh-only-baseline.json) remain historical records. Their measurements and dates are preserved. The full upstream mirror remains at `6f718ff019bf327a0b291a8510dfb42f91b65921` on `origin_main`.

## Repository and artifact changes

| Measure | Before | After |
|---|---:|---:|
| Package workspaces | 8 | 1 |
| Tracked files at the named source snapshots | 2,079 | 79 |
| Tracked blob content | 38,099,062 bytes | 415,749 bytes |
| Lockfile package entries | 1,223 | 117 |
| `bun.lock` | 326,416 bytes | 37,575 bytes |
| Installed unique package name/version pairs | 70 | 64 |
| Installed `node_modules`, `du -sk` | 121,728 KiB | 114,288 KiB |
| Compressed tarball | 83,656 bytes | 61,064 bytes |
| Unpacked tarball | 297,300 bytes | 238,140 bytes |

Source counts compare the accepted baseline with `dc99b926`; the final acceptance documents are additional. They exclude `.git`, caches, dependencies, and generated artifacts. A total of 2,013 old tracked paths were removed through Trash. Git history and the upstream mirror were preserved. The compressed artifact is approximately 27.0% smaller.

The install comparison uses the old filtered frozen installation and the new default frozen installation, both with scripts disabled and an already populated package cache. No retained dependency version was upgraded. The original clean filtered typecheck failed because the shared upstream SQLite file could not resolve `better-sqlite3` types. The local Node-typed source and flat declaration layout remove that dependency boundary; the final clean default checks pass.

The final clean run took 0.058 s to install, 4.074 s to check, 0.971 s to build, and 13.836 s for isolated artifact verification. The old successful check/build took 1.502/0.983 s in an existing complete installation. These environments differ, so these observations do not establish a check/build speedup.

## Preserved behavior

| Concern | Observed result |
|---|---|
| SQLite and writes | Node-backed bindings, transaction modes, nested savepoints, commit rollback, read-only reopening, atomic receipts, writer contention, and process-death retry passed. |
| Memory semantics | Stable ids, scoped/global access, case-sensitive write dedupe, revisions, archive, Chinese/identifier/path retrieval, and invalid-input rejection passed. |
| Session semantics | Cancelled/rejected admission, frozen logged content, persisted JSONL restart, fork inheritance, native compaction, and disposal passed. |
| Source and package closure | 27 Node tests; root ownership/lockfile guards; 16 self-contained declaration files; standalone keyless AgentLoop and production JSX factory passed. |
| Web | Chinese settings page listed the isolated workspace record, saved revision 2, archived revision 3, and downloaded a `dsh-memory-export-v1` JSON file containing that revision. |
| Rollback | Accepted artifact writes → specialized artifact reads/revises → accepted artifact reads/archives → specialized artifact reopens; ids, receipts, FTS, global data, and schema 1 remain valid. |
| Workflow and docs | Actionlint and paired link/anchor/example/checksum checks passed. Remote Linux CI was not run. |

The Web viewport was 1281×852. The browser space and the isolated port 43189 preview were closed after verification. The downloadable package, raw receipts, screenshot, and JSON export are retained under the repository's ignored `.cache/`; stable hashes are recorded in the evidence.

## Controlled resource comparison

The unchanged worker, fixture-path helper, and recording adapter are checked by source hash. Both artifact versions run in separate processes under one common cwd, with the same 1,000/10,000-record corpora and 100/10,000-event histories. This removes checkout-path length from the serialized workspace metadata. The measured Host JavaScript is byte-identical to the final tarball.

| Measure | 1k before | 1k after | 10k before | 10k after | Gate |
|---|---:|---:|---:|---:|---:|
| Store open, ms | 2.163 | 2.487 | 2.157 | 2.238 | ≤100 |
| Query p95, ms | 0.250 | 0.270 | 0.867 | 0.818 | ≤25 |
| Snapshot p95, ms | 0.196 | 0.200 | 1.489 | 1.275 | ≤25 |
| Framed snapshot estimate | 860 | 860 | 863 | 863 | ≤1,000 |
| Added sampled peak RSS, MiB | 12.06 | 15.08 | 44.80 | 20.98 | ≤64 |
| Retained projection, bytes | 52 | 52 | 52 | 52 | ≤128 |
| Auxiliary model calls | 0 | 0 | 0 | 0 | 0 |
| Added resident processes | 0 | 0 | 0 | 0 | 0 |

All existing gates passed. The 1k workload has small startup/query/snapshot regressions and a 3.02 MiB increase in sampled peak RSS; the 10k query/snapshot/RSS observations improved while startup was slightly slower. No confirmed cause is assigned to those variations. One controlled pair per corpus is not statistical evidence of a stable runtime improvement. RSS is a sampled process delta relative to the DSH service/history baseline, not a whole-Web-process limit.

The ordinary benchmark also passed from the final clean checkout. Its snapshot token counts can differ with the absolute fixture path, which is why the controlled comparison is used for before/after claims. No historical benchmark was overwritten.

## Real-model acceptance

The final complete matrix passed all ten scenarios: remember, fresh recall, workspace isolation, correction, corrected recall, archive, archived recall, exact historical-event citation, explicit global write, and cross-workspace global recall. The test checks actual Session logs, stored records, tool results, and the Ollama route. It took 73.664 s and 27 ordinary model requests, with title generation disabled and no local Ollama daemon.

| Provider-reported counter | Successful matrix |
|---|---:|
| Input tokens | 143,920 |
| Cache-read tokens | 383,232 |
| Output tokens | 4,254 |
| Total tokens | 531,406 |

Two preliminary attempts are retained: one request exposed a split host runtime, and a 22-request attempt stopped at the history instruction/oracle mismatch. Across all attempts this acceptance made 50 requests, with 276,682 input, 697,472 cache-read, 7,781 output, and 981,935 total reported tokens. These counters are not a monetary estimate.

The runtime failure occurred before the memory tool body: npm had installed a profile copy of `dsh-tools`, while the launcher supplied a different AgentLoop dependency tree. Their unique scheduler Symbols differed despite identical version labels. Installing through `dsh plugin` with `--config.auto-install-peers=false` restored one host module graph. The live-test preflight now checks this before a model request and records the actual module hashes; the production installation was not modified.

The history test originally requested any related event while its strict oracle required reading an event containing the corrected value. The model read a preceding recall and found the actual correction only through search. The instruction now explicitly requires reading and citing the correction event. The oracle remains strict; the next full matrix passed.

## Reproduce and maintain

Run the default path from the repository root:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
actionlint .github/workflows/dsh.yml
```

For old/new data verification, set `DSH_MEMORY_BASELINE_STORE` to the accepted artifact's installed `dist/store.js`, then run `bun run test:rollback`. For the controlled comparison, pass the baseline native package directory to `node packages/dsh-plugin/scripts/compare-benchmarks.mjs`; that directory needs its original worker/test sources, published test dependencies, and accepted `dist/` files. Both versions share a newly created temporary cwd automatically.

For real-model verification, prepare the isolated profile as described in the [package guide](../../packages/dsh-plugin/README.md#real-model-verification), set `DSH_MEMORY_TEST_HOME`, and run `bun run test:live`. The script refuses the standard production home and uses fresh synthetic workspaces. Preserve its raw receipts when investigating failures.

Runtime dependencies remain the two schema libraries plus DSH/Cordis peers. React and DSH client peers belong to the optional Web face. TypeScript, Biome, tsx, type packages, and the host test/persistence/compaction fixtures belong to development. `koffi` and `@deepseek-ai/node-addon-system` remain because DSH's JSONL persistence requires them; their platform packages are not an inference backend. Removed direct development dependencies are `@types/better-sqlite3`, `@types/react-dom`, and `react-dom`.

The package stays private. This acceptance covers the named local runtime and desktop browser, with high confidence for the observed fixtures. Linux CI execution, other DSH releases, other viewports, npm publication, production-profile activation, embeddings, and background extraction remain outside this record. Use the [upstream workflow](../../UPSTREAM.md) for selective maintenance and retain the [MIT provenance](../../packages/dsh-plugin/NOTICE).
