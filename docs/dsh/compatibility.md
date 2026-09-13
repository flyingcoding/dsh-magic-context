# DSH native adapter compatibility

English | [中文](compatibility.zh.md)

This record owns acceptance evidence for `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`. It covers the lightweight native memory implementation committed on `dsh_main` at the revision below. The package is a private local artifact; production-profile activation and npm publication are separate actions. Findings below have high confidence for the named fixtures, versions, and machine, with the limits stated at the end.

## Reproducible inputs

| Input | Verified value |
|---|---|
| Magic source base | `6f718ff019bf327a0b291a8510dfb42f91b65921`, release line `0.42.0`. |
| Native implementation and verification scripts | `be3e1f871b4af0afc54e83925544dad8bf60b525` on `dsh_main`; paired documentation is recorded separately. |
| DSH package tests | Published `0.1.5-rc.2` peers; Cordis `4.0.2`. |
| DSH source inspected | `7e4504856456f5298b8bc66299995ce8d86c3aa1`, sibling integration checkout. |
| CLI / Web checks | Installed DSH `0.1.5-rc.2`, selected through the supported `dsh --profile` launcher. |
| Runtime / tooling | macOS arm64, Node `v24.18.0`, Bun `1.3.5`. |
| Real model | Production-configured Ollama Cloud route, `https://ollama.com/v1`, `deepseek-v4.1-flash`. The model id was also present in the authenticated Cloud catalog. |
| Credentials | Only the existing `OLLAMA_API_KEY` reference was copied to a private isolated home; no credential value enters the repository or report. |
| Upstream pending work | `70d3945bde0feb75a24e922880791f5fe7267823` changes documentation/ignore rules; not adopted into the frozen source base. |

Published DSH packages and the inspected fork can differ within the same prerelease label. In particular, the published resume fixture uses `resumeSessionId`, while the inspected checkout uses `sessionId`; the production adapter does not call that factory API. Tests and live-profile checks therefore identify their actual runtime separately.

## Scope and source decisions

| Concern | Implemented decision | Evidence |
|---|---|---|
| Source reuse | Reuse the SQLite shim, text normalization for search, and type-only category vocabulary. | [NOTICE](../../packages/dsh-plugin/NOTICE), imports in `store.ts`, `tokenize.ts`, and `types.ts`. |
| Dependency closure | Avoid the upstream memory barrel, storage/embedding cache graph, context manager, UI, and inference runtimes. | Node bundle guards, filtered install, and standalone tarball probe. |
| Native ownership | One storage provider, four tool registrations, a recall consumer, and an optional Web management face. | [Bundle patch](../../packages/dsh-plugin/cordis.patch.yml), [service definition](../../packages/dsh-plugin/src/service.ts). |
| Identity | Session-owned real workspace paths; explicit global writes; DSH provenance. | Workspace/correction tests and real-model isolation scenario. |
| Admission | Propose context through `agent/pre-step`; delivery is committed only through the host's logged user-message path. | Cancellation, rejected admission, and request-series tests. |
| Recovery | A fixed-size projection retains the delivered message id; content stays in the Session log. | Persisted-session test and [committed replay fixture](../../packages/dsh-plugin/tests/fixtures/memory-session.v3.json). |
| History | Guide the agent to the already-composed DSH query tools; no extra transcript store or per-step scan. | Tool guidance and source import/read audit. |
| Compaction | Keep DSH's native owner and verify replacement plus continued conversation. | [Native compaction test](../../packages/dsh-plugin/tests/compaction.test.ts). |
| Import | Not applicable: no source Magic database was supplied. | Import code is not enabled and existing source data is not modified. |

The upstream FTS storage module imports the broader memory store, embedding cache, and mural helpers. The adapter uses its own small schema and literal FTS tokenization instead. Write deduplication preserves case-sensitive identifiers, while search retains case normalization. No shared Magic source file was changed. The native implementation caches no query results and reuses only a fixed set of prepared SQL statements.

## Acceptance matrix

| Area | Observation | Result |
|---|---|---|
| Node SQLite | Actual `node:sqlite`, restart, private DB/WAL/SHM modes, foreign-schema refusal. | Passed. |
| Atomic writes | Record, FTS update, revision, and receipt commit together; forced receipt failure rolls back. | Passed. |
| Retry and concurrency | Duplicate requests are stable; changed arguments fail; stale revisions fail; locked writers retry after release. | Passed. |
| Abrupt process death | Kill the writer after commit, reopen, and retry without creating a duplicate. | Passed. |
| Scope | Another workspace cannot retrieve or edit a record by id; global preferences require explicit writes. | Passed. |
| Correction and archive | Superseded/archived content stays out of retrieval; historical revisions remain inspectable. | Passed. |
| Chinese and code retrieval | Chinese substrings, camel-case symbols, paths, errors, mixed queries, irrelevant queries. | Passed. |
| Cancelled admission | Cancellation before request admission records no snapshot and does not mark it delivered. | Passed. |
| Resume and fork | JSONL-backed restart and an immutable fixture preserve exact recorded text; forks do not recapture. | Passed. |
| Native compaction | DSH emits its summary/end markers, replaces history, and continues without another memory injection. | Passed. |
| Resource lifetime | Provider disposal closes its connection and subsequent calls fail rather than reopening it. | Passed. |
| Artifact | Install outside the monorepo, drive real AgentLoop input, evaluate the client factory, compose the Bundle. | Passed. |
| Web management | Settings entry, scoped list, correction to revision 2, archive to revision 3, downloaded JSON. | Passed on the desktop Web surface. |
| Real model | Ten synthetic scenarios using the configured Ollama Cloud model. | Passed; details below. |

The native suite contains 18 focused tests. The existing upstream SQLite/import/bind and normalization suites also passed (7 tests), and the upstream OpenCode package's own typecheck and lint passed. Full OpenCode/Pi model end-to-end suites were not run because their integrations and shared source were unchanged.

## Resource measurements

Numeric gates were defined in [resource-budgets.json](resource-budgets.json) before the measurements. Each corpus runs in a fresh process. The baseline already contains the same DSH service spine and sessions with 100 and 10,000 synthetic bookkeeping events; the enabled measurement adds the built provider, tools/guidance, and recall consumer. Query and snapshot values use 100 samples. This isolates the adapter's costs from creating the host's original histories.

| Metric | 1,000 records | 10,000 records | Gate |
|---|---:|---:|---:|
| Store open | 1.99 ms | 2.18 ms | ≤100 ms |
| Query p50 | 0.224 ms | 0.709 ms | Recorded |
| Query p95 | 0.279 ms | 0.749 ms | ≤25 ms |
| Snapshot selection/render p95 | 0.226 ms | 1.209 ms | ≤25 ms |
| Framed snapshot estimate | 823 tokens | 826 tokens | ≤1,000 |
| Baseline RSS | 121.66 MiB | 103.66 MiB | Recorded |
| Enabled idle RSS | 123.20 MiB | 105.39 MiB | Recorded |
| Peak RSS | 132.69 MiB | 150.56 MiB | Recorded |
| Additional peak RSS | 11.03 MiB | 46.91 MiB | ≤64 MiB |
| Retained snapshot projection | 52 bytes | 52 bytes | ≤128 bytes |
| Additional retained processes | 0 | 0 | 0 |
| Auxiliary model calls | 0 | 0 | 0 |

The empty snapshot framing costs 62 estimated tokens, standing guidance 303, and the four tool schemas 1,060. Guidance and schemas are additional to the 1,000-token snapshot budget. With 10,000 records, the recall consumer's pre-step p95 was 0.033 ms after 100 historical events and 0.029 ms after 10,000. The database was 28,983,296 bytes and its active WAL 4,223,032 bytes. These are measurements of synthetic local workloads, not whole-Web-process limits or a benchmark against upstream Magic.

The adapter performs no arbitrary synchronous Session-history read. The host's projection materialization can still fold existing history once, and the host retains full Session data; the 52-byte figure refers only to this plugin's projection. Disk usage grows with selected records, revisions, and durable operation receipts.

## Real Ollama Cloud observations

The ten headless runs used separate process launches and fresh synthetic workspaces. They reused only the production-configured Ollama Cloud provider/model and required credential reference in the isolated home. The title-generation row was disabled, and the runs did not use a local Ollama daemon. For history citations, the acceptance profile explicitly installed/mounted the official `dsh-tool-session-query` consumer and set native search to `openAt: first-search`; the memory Bundle does not enable either by default.

| Scenario | Required observation | Recorded outcome |
|---|---|---|
| Remember | A real native tool stores the supplied random marker. | `memory_remember`, revision 1. |
| Fresh recall | A new process/session answers without receiving the marker in its prompt. | Returned the exact original marker. |
| Isolation | Another workspace cannot retrieve that marker. | Answered that it did not know; no foreign marker. |
| Correction | Recall the current id/revision and update the same record. | `memory_update`, revision 2, no duplicate. |
| Corrected recall | A fresh session uses the new marker. | Returned the exact corrected marker, excluding the old one. |
| Archive | Archive the current revision. | `memory_forget`, revision 3, archived. |
| Archived recall | A fresh session has no active matching fact. | Answered that it did not know. |
| Native history citation | Search/read an actual historical event and cite its Session id / seq. | Official query tools returned a matching source; the memory remained archived. |
| Global write | Explicitly choose global for a unique preference. | `memory_remember` stored it in global scope. |
| Global recall | Another workspace reads that global preference. | Returned the exact same marker. |

The final complete run took 61.1 seconds across 24 normal model requests. DSH reported aggregate `inputTokens` of 160,224, reported `cacheReadTokens` of 305,664, `outputTokens` of 3,152, and `totalTokens` of 469,040. These are provider-reported counters, not a monetary estimate; the full DSH prompt/tool set contributes to them.

## Build and browser regressions resolved

- Bun 1.3.5 emitted duplicate exports when the same public store was both an entry and a split dependency. Host entries now build without splitting and are checked with `node --check`; stale output directories cannot enter the new artifact.
- The initial client imported `react/jsx-dev-runtime`, which the DSH module table does not seed. The client build now explicitly uses production JSX and rejects that development import. The installed factory is evaluated with the exact supported React import words.
- Export object URLs remain alive until replacement or component disposal. Browser export produced `dsh-memory-export-v1` JSON containing the edited revision; the in-app download-event observer timed out, so the downloaded file itself was inspected as the authoritative result.

The actual DSH Web page at the isolated loopback preview rendered its Memory settings entry and completed edits/archive. Console inspection after the fixed reload found no new errors or warnings. Earlier loader errors and expected reconnect messages came from the replaced preview build and are not treated as current failures.

## Commands and retained evidence

A [machine-readable acceptance summary](evidence/2026-09-13-acceptance.json) accompanies this record. The following commands define the reproducible acceptance path. Local receipts under the package's ignored `.cache/` preserve exact artifact paths, raw measurements, model counters, and Session-log locations; they contain synthetic facts rather than user conversation history.

```sh
bun run check:dsh
bun run --cwd packages/plugin typecheck
bun run --cwd packages/plugin lint
bun test packages/plugin/src/shared/sqlite.test.ts packages/plugin/src/shared/sqlite-bind-style.test.ts packages/plugin/src/shared/sqlite-import-fence.test.ts packages/plugin/src/features/magic-context/memory/normalize-hash.test.ts
bun run --cwd packages/dsh-plugin build
bun run --cwd packages/dsh-plugin test:install
bun run --cwd packages/dsh-plugin benchmark
```

For the explicit live-model pass, run `bun run test:live` in the native package with `DSH_MEMORY_TEST_HOME` set to its prepared isolated home. The fixture, schema, profile, and scripts are described in the [package README](../../packages/dsh-plugin/README.md). The snapshot fixture is versioned under `tests/fixtures/`; install, benchmark, and real-model receipts are `.cache/install.json`, `.cache/benchmark.json`, and `.cache/live-model.json`.

## Supported limits and release boundary

- This is the lightweight native memory implementation, with DSH history/query/compaction retained. Embeddings, periodic extraction, Rust/subc, document ingestion, and cross-host live database sharing remain outside the requested first release.
- The local acceptance environment is macOS arm64 with Node 24 and the named DSH prerelease. Linux CI is wired but not represented as a completed remote CI run; other DSH releases, Desktop, and mobile viewports are not certified here.
- Search is literal and bounded. Initial snapshots use recent active records and are frozen; explicit recall returns current state. Workspace metadata must be supplied by the host.
- No existing Magic database was supplied, so import, idempotent migration, and migration rollback are not applicable to this delivery.
- The native tarball installs independently of a sibling checkout. The npm package remains private and the production profile remains unmodified. A future public release must validate its exact host matrix again.
