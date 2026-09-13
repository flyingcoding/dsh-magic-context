---
description: "Next-phase plan to specialize this fork for DSH and remove other host adapters, workspaces, and release machinery."
status: "completed"
owner: "flyingcoding/dsh-magic-context maintainers"
created: "2026-09-13"
updated: "2026-09-13"
source-baseline: "73cd88b40b2b0852f75ba267100e3ce664aac102"
---

# Specialize the repository for DSH

English | [中文](dsh-only-plan.zh.md)

This specialization makes DSH the only supported host: remove other adapters and their development dependencies, simplify configuration and repository structure, and preserve the accepted native memory behavior. This work takes priority over the optional P5 feature expansion in the [migration plan](migration-plan.md#phases).

S1–S4 are complete within the local macOS / Node 24 acceptance scope. The [specialization record](specialization.md) reports clean installation, runtime and Web behavior, real-model scenarios, controlled measurements, and rollback. The initial [alpha evidence](compatibility.md) remains the historical starting point; observed resource limits and remote-CI boundaries are explicit in the new record.

<a id="baseline"></a>
## Evidence and expected benefit

The source baseline is `73cd88b40b2b0852f75ba267100e3ce664aac102`. Counts below come from tracked Git blobs at that commit; the [machine-readable inventory](evidence/2026-09-13-dsh-only-baseline.json) records exact bytes and paths. They exclude Git object storage, installed dependencies, build outputs, and caches.

| Observation | Evidence | Consequence for this phase |
|---|---|---|
| Eight package workspaces exist, including seven outside the native adapter. | Root `package.json` uses `packages/*`; the inventory records each package manifest. | Make the workspace list explicit and retain only `packages/dsh-plugin`. |
| Root default commands still run OpenCode, Pi, CLI, and some Retina checks. | Root `build`, `typecheck`, `test`, `lint`, and `lint:fix` scripts. | Default installation and development commands must serve DSH without requiring a filter. |
| DSH has three source imports from the upstream plugin tree. | `src/store.ts`, `src/tokenize.ts`, and the type-only import in `src/types.ts`. | Extract those contracts and their tests before deleting `packages/plugin`. |
| The DSH build already excludes the large upstream host and inference entry points. | `scripts/build.ts`, package exports, `NOTICE`, and isolated-install acceptance. | The direct benefit is a smaller checkout, dependency graph, and development surface; measure runtime savings separately. |
| Original host, desktop, Rust, and publishing workflows remain. | `.github/workflows/`, `scripts/`, and root Cargo files. | Remove obsolete jobs and release targets together with their source owners. |

| Tracked scope | Files | Bytes | Interpretation |
|---|---:|---:|---|
| Entire baseline checkout | 2,079 | 38,099,062 | About 36.33 MiB of tracked content. |
| Native DSH package | 41 | 172,411 | Does not include root lockfile or DSH development documents. |
| Seven other package trees | 1,549 | 22,206,621 | Removal candidates after preserving the required source subset. |
| Four Rust crate trees | 144 | 11,741,951 | Outside the accepted DSH runtime. |

The seven package trees and Rust crates total 1,693 files and 33,948,572 bytes. This is a candidate footprint, not a promised deletion total: source extraction and retained tests add files, and root documents/scripts need their own review. Removing these trees does not shrink existing Git history. At planning time, dependency disk usage, build duration, and final runtime RSS were unmeasured. The [acceptance record](specialization.md) now separates measured changes from unproven performance gains. Confidence remains high for the pinned inventory and observed imports.

<a id="ownership"></a>
## Retain, extract, and remove

| Area | Target ownership | Required action |
|---|---|---|
| `packages/dsh-plugin/` | Retain as the only package workspace. | Preserve the Bundle, four tools, scoped SQLite store, replayable admission, and DSH Web management page. |
| `packages/plugin/` | Remove after extraction. | Move only the SQLite contract, normalization used by retrieval, and the supported category vocabulary into the DSH package. Retain MIT attribution and source commit references. |
| `packages/pi-plugin/` | Remove. | Retire Pi and OMP host detection, adaptation, configuration, and compatibility tests. |
| `packages/cli/` | Remove. | Retire the OpenCode/Pi/OMP setup, doctor, and cross-host migration commands; installation belongs to the DSH Bundle workflow. |
| `packages/dashboard/` | Remove. | Retire the separate Tauri/Solid application and its signing/release configuration; keep the native DSH Web settings page. |
| `packages/retina-local-fs/` | Remove. | Retire document-watching/ingestion code and its examples; it is outside this memory plugin's scope. |
| `packages/docs/` | Remove as a workspace. | Replace the upstream Astro/Wrangler documentation site with the existing paired Markdown documentation. |
| `packages/e2e-tests/`, `tests/docker/`, `crates/` | Remove. | Retire the old host and Rust/subc validation machinery after confirming no DSH test or script depends on it. |
| Root package/configuration/lockfiles | Simplify for DSH. | Remove unused dependencies, Cargo inputs, old aliases, and commands. Regenerate the Bun lockfile from the retained manifest. |
| Root README, architecture/layout docs, `.github/`, `scripts/`, historical assets | Review by owner. | Keep DSH instructions, evidence, licenses, and useful automation; remove obsolete product/release inputs and replace historical source links with pinned upstream links. |

OMP is implemented inside the Pi adapter and CLI; there is no separate OMP package to delete. Remaining root directories such as `.build/`, `.cortexkit/`, `gate-evidence/`, and non-DSH `docs/` are part of the ownership audit, not automatic retain rules. Keep only material required by the specialized project or its attribution; original history remains available through Git and `origin_main`.

The target is one package, with small reused modules under `packages/dsh-plugin/src/` and focused tests under its existing `tests/`. A second shared-core package has no demonstrated consumer and is unnecessary. Keep the public package identity, Bundle rows, tool contracts, database path/schema, stored IDs/revisions, and Session projection identity stable. Bun remains the build/dependency tool; the supported host runtime remains Node 24 or newer.

<a id="source-extraction"></a>
## Extract the required source before pruning

| Current source | Contract that must survive | Extraction check |
|---|---|---|
| `packages/plugin/src/shared/sqlite.ts` | Node SQLite statements, transaction/savepoint behavior, positional bindings, connection lifecycle, and failure propagation used by the DSH store. | Move relevant backend and binding tests into the DSH suite. A Node-only simplification must preserve these behaviors before removing Bun/Electron compatibility branches or type dependencies. |
| `packages/plugin/src/features/magic-context/memory/normalize-hash.ts` | Retrieval whitespace/case normalization. | Preserve the existing Chinese, identifier, path, and mixed-query results; avoid changing case-sensitive write deduplication. Unused upstream hash helpers need not be copied. |
| `packages/plugin/src/features/magic-context/memory/types.ts` | The seven categories supported by the DSH tool schema. | Define the retained vocabulary locally without importing the upstream memory interfaces or expanding accepted values. |
| Upstream leaf tests and DSH build/CI references | Verification of the retained behavior and an independent distributable. | Update `.github/workflows/dsh.yml`, declarations/exports, `NOTICE`, and source links in the same stage; scope import/binding guards to retained DSH source. |

Do not transplant the upstream memory store, embedding caches, Historian, Dreamer, or full configuration schema. Adapted source remains versioned with its original path, commit, license, and a short explanation of downstream changes. Historical attribution can name OpenCode/Pi; executable imports, workspace entries, package exports, and CI commands must not depend on removed adapters.

<a id="phases"></a>
## Implementation order

| Stage | Status | Deliverable | Completion evidence |
|---|---|---|---|
| S0: inventory and scope | Complete for this plan | Pinned source footprint, three import boundaries, candidate removal list, and benefit limits. | Reproducible Git inventory and source/manifest inspection recorded here. |
| S1: make DSH source self-contained | Complete (`9d958bc2`) | Local source subset, Node-focused SQLite surface, moved behavior tests, updated declarations and attribution. | DSH checks and artifact build pass with no compile/runtime imports from another package tree; existing database and replay behavior remain valid. |
| S2: prune workspaces and dependencies | Complete (`cfb788fe`) | Remove the seven non-DSH package trees and Rust/host-only support; simplify root scripts and regenerate the lockfile. | A clean checkout has exactly one package workspace; default install/build/check commands require no old host, Cargo, private sibling repository, or optional inference runtime. |
| S3: align CI, releases, and documentation | Complete (`cfb788fe`) | DSH-only CI and root project entry points; retired upstream publication/signing jobs; selective upstream maintenance. | No active command/export/workflow references a removed owner; paired documentation and local links pass verification. |
| S4: verify behavior and measure benefit | Complete; [local acceptance](specialization.md) | New acceptance record, isolated tarball, before/after measurements, and rollback evidence. | Functional, packaging, configuration, and resource criteria below pass against the exact resulting commit. |

Each implementation commit should leave the retained DSH path reviewable and usable. Move the test/CI references with the source they check; remove a workspace and its root command/configuration references together. Use `trash` for filesystem deletions. This phase changes repository code and build ownership; user memory databases, Session logs, production profiles, and unrelated machine caches are not cleanup targets.

<a id="validation"></a>
## Acceptance and measurement

| Concern | Required observation |
|---|---|
| Repository ownership | Exactly one DSH package workspace; no executable imports, path aliases, declarations, or build/test commands require removed package trees. |
| Dependency closure | A clean frozen-lockfile install succeeds without the old workspaces. Attribute dependencies to the DSH host, client, build, or tests; remove unused direct dependencies without stripping host-required transitive packages by name alone. |
| Memory semantics | Preserve Node SQLite atomicity, retry/idempotency, revisions, archive behavior, scoped/global access, Chinese/mixed retrieval, and failure handling. Retain coverage rather than relying on unchanged test counts. |
| Session semantics | Preserve cancellation before admission, frozen logged content, JSONL restart/replay, fork isolation, and native compaction coexistence. |
| User interface and package | Install the tarball outside the checkout; execute the production JSX factory; verify listing, editing, archiving, and JSON export in DSH Web. |
| Real model | Repeat the existing ten scenarios with the production-configured Ollama Cloud `ollama/deepseek-v4.1-flash` route in an isolated home/profile; record results and usage. |
| Performance | Reuse the existing 1,000/10,000-record and short/long-history workload, host version, machine, and resource gates. Record install footprint, dependency count, build/check duration, tarball size, query latency, and RSS separately. |
| Provenance and documentation | Preserve MIT notices and exact reused-source ancestry, repair source/declaration links, and add new evidence without rewriting historical acceptance measurements. |

The current [resource gates](resource-budgets.json) remain minimum acceptance: store open ≤100 ms, query and snapshot p95 ≤25 ms, snapshot ≤1,000 estimated tokens, added peak RSS ≤64 MiB, projection state ≤128 bytes, zero auxiliary model calls, and zero added resident processes. Passing a limit does not establish an improvement; compare equivalent before/after runs and report unexplained regressions. Builds should become simpler, but this plan sets no unmeasured percentage reduction for time or runtime memory.

Baseline source inventory can be reproduced without installing or running the old hosts:

```sh
git ls-tree -r -l 73cd88b40b2b0852f75ba267100e3ce664aac102
git show 73cd88b40b2b0852f75ba267100e3ce664aac102:package.json
git show 73cd88b40b2b0852f75ba267100e3ce664aac102:packages/dsh-plugin/package.json
```

Use the existing adapter check/build/install/benchmark commands in the [package README](../../packages/dsh-plugin/README.md#build-and-verify) as the initial baseline, then verify the simplified default root commands after S2. Run real-model checks only through the configured Cloud route; launching local Ollama is unnecessary. Linux CI completion must be reported from its actual run rather than inferred from the presence of a workflow file.

<a id="upstream"></a>
## Preserve upstream provenance without restoring removed adapters

`origin_main` continues to mirror the full official source through fast-forward updates. `dsh_main` owns the specialized product and adopts only reviewed fixes relevant to its retained modules. Do not routinely merge the full upstream mirror into the specialized branch: this can reintroduce out-of-scope files and create delete/modify conflicts. Port the needed source changes with original commit references and focused validation; a whole-commit cherry-pick is appropriate only when every changed path belongs to the retained scope. The [upstream workflow](../../UPSTREAM.md#synchronize) owns the operational steps.

Before S1, record the accepted source commit and tarball checksum. Roll back repository changes by reverting the relevant specialization commits or using a separate checkout of that baseline; do not rewrite the upstream mirror or Git history. Existing memory and Session formats remain stable during this optimization, so rollback should not require data conversion. Any need for a schema change is a separate change with its own migration evidence.

The [acceptance evidence](specialization.md) completes S1–S4 for the named local environment: the normal project path serves DSH alone and retained dependencies/source have documented DSH purposes. Embeddings, broader semantic-recall evaluation, background extraction, new hosts, npm publication, and production-profile activation remain separate work items.
