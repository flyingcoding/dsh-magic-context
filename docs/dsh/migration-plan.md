---
description: "Migration handoff for a lightweight native Magic Context memory plugin in DSH: evidence, scope, implementation stages, data import, and acceptance criteria."
status: "implemented"
owner: "flyingcoding/dsh-magic-context maintainers"
created: "2026-09-12"
updated: "2026-09-13"
promotion-target: "DSH adapter package README and compatibility record"
---

# Magic Context to DSH migration handoff

English | [中文](migration-plan.zh.md)

<a id="summary"></a>
## Summary

Use this handoff to start a native DSH memory-plugin migration without repeating the initial repository investigation. The recommended first release keeps DSH compaction, stores selected durable memories locally, and introduces neither MCP nor a document knowledge base. This document preserves the design and dated research baseline. The native alpha is implemented under `packages/dsh-plugin/`; current commands and verification evidence live in the [package README](../../packages/dsh-plugin/README.md) and [compatibility record](compatibility.md).

This handoff is maintained on `dsh_main` in `flyingcoding/dsh-magic-context`; the original full-source tree remains in the `origin_main` mirror while the active product is DSH-only. Start from the [development entry](README.md) and [upstream workflow](../../UPSTREAM.md). Recheck the evidence after upstream or DSH updates; promote implemented behavior into the adapter package README and record compatibility results beside the code.

<a id="contents"></a>
## Table of Contents

- [Scope and recommendation](#scope)
- [Evidence baseline](#baseline)
- [Proposed implementation](#architecture)
- [Adaptation work](#adaptation)
- [Resource targets](#resources)
- [Data import and rollback](#data)
- [Implementation stages](#phases)
- [Acceptance criteria](#acceptance)
- [Resume the work](#resume)
- [Evidence and source map](#sources)
- [Dev Note](#dev-note)

-----

<a id="scope"></a>
## Scope and recommendation

The user requires an in-process native plugin, excludes MCP integration and document knowledge-base products, and prioritizes low resource use. The native adapter now supports isolated installation, Node SQLite, logged recall, and a Web management page. Production-profile activation and npm publication have not been performed.

| Scope | First release | Reason |
|---|---|---|
| Local project and user memories | Include | Retain preferences, decisions, constraints, and lessons across sessions. |
| Native tools and bounded injection | Include | Make writes observable and recall useful without loading every memory. |
| Existing DSH history search | Reuse | Avoid a second complete transcript store and index. |
| Magic history replacement and Historian | Defer | DSH retains responsibility for compaction and context-overflow recovery. |
| Embeddings, Dreamer, Rust/subc, companion desktop app | Defer | Avoid model downloads, auxiliary model work, daemons, and another UI runtime. |
| Document ingestion, graph knowledge base, automatic documentation editing | Exclude | These are outside the requested memory use case. |
| Live shared database with OpenCode/Pi/OMP | Defer | First establish memory semantics and compatible data ownership. |

The original engineering recommendation was a separately installable DSH Bundle reusing selected Magic memory concepts and source components; this subset is now owned locally by the specialized package. `packages/dsh-plugin/` is the implemented native package location. Use the community port as a reference for integration and tests. A full port is a separate investment decision after the lightweight version demonstrates useful recall and acceptable cost. If P0 shows that a small reusable source subset cannot be isolated economically, record that result and prefer an existing lightweight native memory plugin.

-----

<a id="baseline"></a>
## Evidence baseline

These identifiers freeze the investigation performed on 2026-09-12. They are reproducibility anchors, not claims that these releases remain the latest when implementation begins.

| Subject | Inspected baseline | Evidence level |
|---|---|---|
| Magic Context | `0.42.0`; `9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe` | README, configuration, manifests, and selected source files; [E1–E4](#sources). |
| Development fork | `flyingcoding/dsh-magic-context`; `dsh_main` for development, `origin_main` for upstream tracking. | Full Magic sources were present at the investigation baseline and remain in `origin_main`. Exact branch pins and pending upstream changes live in [UPSTREAM.md](../../UPSTREAM.md). |
| DSH integration checkout | `7e4504856456f5298b8bc66299995ce8d86c3aa1`; branch `fix/session-query-cjk-memory` | Architecture, Session, compaction, query, and prompt sources. |
| Installed DSH dependency line | Web profile `@deepseek-ai/dsh-session-query@0.1.5-rc.2` | Local package manifest and resolved installation path were read; no plugin runtime test. |
| Community DSH port | Package `0.1.2`; `6c82abd4d75c63516421c6e1692d1b7d1636b8e4`; last commit 2026-08-21 | Declared baseline DSH `0.1.0-rc.6`, Magic `0.36.1`, shared schema `77`; [E5–E7](#sources). |
| Format comparison | Magic latest migration `84`; local DSH Session writer `3` | These numbers describe different stores and must never be equated. |

The community port's successful-test and real-model statements are author-reported evidence for its old baseline. This investigation did not rerun them. Resource recommendations are engineering targets, not measurements; there is no independent comparative benchmark supporting a claim of lower RSS or lower total model cost.

-----

<a id="architecture"></a>
## Proposed implementation

The first release adds memory to DSH's existing agent lifecycle. DSH remains the authority for conversation history and model-visible messages; the plugin owns selected cross-session memories only.

| Component | Responsibility | DSH integration |
|---|---|---|
| Memory service | Resolve scope, validate operations, enforce budgets, and coordinate writes. | Service Definition and its Consumers may initially share one package with the provider. |
| SQLite provider | Persist selected memories, revisions, provenance, and import receipts. | One connection per owning service; its own database, separate from Session and query databases. |
| Tool Consumer | Offer remember, recall, update, and forget operations. | Register through `ctx.tools` with DSH permissions and effects. |
| Prompt Consumer | Select a small current-scope memory snapshot and deliver it once at the intended point. | Use logged prompt context or `agent.inject()`; verify the exact admission behavior in P0. |
| History adapter | Search existing conversations and fetch bounded evidence on demand. | Reuse `ctx.sessionQuery`; inspect each method's actual read cost before selecting it. |
| Lifecycle projection | Track delivered memory revisions and eligible new events. | Use committed events and Session projections; reconstruct required state on resume. |
| Management UI | Inspect, edit, disable, and export memories. | A small locale-owned DSH settings page; build after Host behavior is verified. |

### Scope and stored records

Default to the trusted current workspace. Keep user-global preferences separate and require an explicit global write choice. Do not accept an arbitrary workspace path from model arguments. Magic's Git-root-commit identity intentionally shares across some clones, forks, and worktrees; use it only after the desired DSH sharing rule is decided, never as an implicit replacement for workspace identity.

The proposed minimum record contains a branded memory id, scope and workspace key, category, concise content, revision, creation/update times, lifecycle status, and provenance. Provenance records the originating harness, Session id and event sequence or import receipt. Keep `active`, `superseded`, and `archived` distinct; corrections must not silently resurrect an obsolete entry. Dedupe within scope, not across unrelated projects.

### Writes, injection, and recovery

Serialize writes and enforce idempotency before reporting tool success. A repeated request after cancellation or a lost response must not create a duplicate. Commit memory changes atomically; model-visible tool results follow DSH's ordinary logged tool path. Release registrations, timers, queues, and database handles with the owning Cordis lifecycle.

For the minimum release, freeze the selected injection snapshot for the session and use explicit recall to obtain newer records. Persist enough information to reproduce the injected content after restart even if the memory database has changed. A cancelled request before admission must not falsely mark that snapshot as delivered. Do not edit historical messages in `llm/stream` or recompute old model context from today's database.

Capture only committed, eligible events. Exclude inherited fork prefixes and the plugin's own auxiliary sessions from automatic recapture. Maintain cursors and dedupe keys durably. P0 must prove a bounded recovery read or an adequate projection; an asynchronous API returning a small result is not proof that it avoids loading the complete log.

### Automatic memory capture

Magic normally promotes facts while Historian processes history. Its compaction-off mode removes that primary extraction path. The first release therefore relies on observable memory-tool calls by the current agent, with concise guidance for explicit remember requests, corrections, and confirmed reusable lessons. A later opt-in extractor may consume a DSH compaction result or eligible completed turns, with explicit concurrency, queue, frequency, and token limits. It must not run another summarizer after every turn by default.

-----

<a id="adaptation"></a>
## Adaptation work

The reusable design is stronger than the current external packaging. Treat the following as concrete P0 findings to resolve, not as a completed compatibility fix.

| Finding | Required work | Verification |
|---|---|---|
| The community port aliases `@magic-context/core/*` to an upstream tree it does not include. The initial full fork contained that tree; the DSH-only product now owns its required subset. | Reuse local upstream source with a tracked import map; audit the memory-only dependency closure and preserve MIT notices. | A clean build needs no external sibling source checkout; no compiled community-port files are copied; [E6](#sources). |
| Old code reads `agent.session.events` and hashes rebuilt transcripts. | Replace arbitrary synchronous history scans with current events, projections, and verified bounded history access. | Resume and long-history cases stay correct without per-step full-history serialization; [E7](#sources). |
| Upstream harness ids are `opencode`, `pi`, and `omp`; model settings are per harness. | Add explicit DSH identity and model mapping if reusing those modules; never identify DSH as Pi. | DSH session rows and model routes cannot leak into another harness. |
| DSH model-visible content must be logged. | Use framework admission and source markers for memory injection; keep original message roles and tool pairing valid. | Restart, replay, cancellation, and fork snapshots match what the model received. |
| DSH already owns history search and compaction. | Reuse those capabilities in the lightweight version; give any later replacement exactly one owner per agent. | No duplicate full-history indexing or concurrent compaction managers. |
| Upstream package dependencies include host UI and inference components. | Publish a memory-only runtime dependency set with lazy optional backends. | Installing or enabling the lightweight bundle neither downloads a model nor launches another host or daemon. |

Current DSH marks `eventAt()`, `snapshotEvents()`, and `ownEvents()` deprecated for new production use. Its current implementation still retains the complete event sequence; this proposal does not claim DSH has already completed out-of-memory historical storage. Avoid rebuilding that dependency in the new plugin. See the [read-policy decision](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md).

-----

<a id="resources"></a>
## Resource targets

The middle column preserves the inspected upstream settings; the final column preserves the original first-release proposal. Actual DSH configuration names and defaults are defined in the package README. Numeric local gates live in [resource-budgets.json](resource-budgets.json), and observed results live in the compatibility record.

| Resource | Inspected upstream setting | Proposed lightweight target |
|---|---|---|
| Runtime | `transform_mode="ts"`; Rust/subc is optional. | Native Node plugin, no daemon. |
| History management | `compaction.enabled=true`. | `false` in the reused Magic layer; retain DSH compaction. |
| Embedding | `provider="local"`; MiniLM cache about 90 MB on disk. | `provider="off"`; no ONNX/model load in the default path. |
| SQLite page cache | `cache_size_mb=64` per connection; `mmap_size_mb=0`. | One owned connection, start at 8 MiB; keep mmap off. |
| Injected memory | `memory.injection_budget_tokens=4000`. | Start at 1,000 estimated tokens; report framing/tool-schema overhead separately. |
| Background extraction | Historian plus optional Dreamer. | No auxiliary extraction call by default; explicit opt-in later. |
| Query/cache state | Upstream varies by subsystem. | Initial proposal: top 5 memories, 32 cached queries, bounded snapshot state. |

A SQLite cache setting is not measured process RSS, and a model's download size is not its resident memory. Disabling embeddings removes semantic matching; verify Chinese text, English identifiers, paths, and mixed-language queries before claiming adequate recall. Upstream documents weak cross-language results for its default MiniLM, so embedding adoption needs its own quality and resource evidence.

Measure plugin-disabled and plugin-enabled runs using the same DSH revision, provider/model, corpus, settings, and host. Record idle and peak RSS, startup time, pre-request latency, query p50/p95, total input/output/cache tokens, database/WAL size, process count, and auxiliary calls. Separate cold start from warmed queries and include long histories. P0 sets numeric pass thresholds before measurement; no resource target is marked passed in this document.

-----

<a id="data"></a>
## Data import and rollback

Software porting and existing-memory import are separate work items. There is no evidence that this user has an existing Magic database to import. If no source data is supplied, record import as not applicable rather than creating synthetic production history.

1. Inventory the supplied source database, schema, owning runtime version, projects, and memory counts. Establish a consistent backup through a supported backup procedure or after stopping the owning writers; copying only the main file while WAL writes continue is not a consistent backup.
2. Read from an isolated backup. Export selected memory records and provenance; exclude raw conversations, embeddings, compartments, scheduler state, caches, and credentials from the first import.
3. Resolve each source project to an explicitly chosen DSH workspace or global scope. Preview counts, duplicates, stale records, unsupported fields, and unresolved mappings before target writes.
4. Import into a separate target memory database in bounded transactions. Use a source identity plus record id/revision as an idempotency key; keep an import receipt with source hash, mapping, counts, failures, and target ids.
5. Verify restart persistence, scope isolation, repeat-import idempotency, and representative recall. Preserve the source backup unchanged. Do not describe selected-memory import as complete Magic session migration.

Rollback first disables the new Bundle and restores the previous profile composition. Keep DSH session logs and source backups intact. If memory data must be rolled back, restore the target database consistently and account for post-import user edits instead of blindly deleting an import batch. Installing or uninstalling the plugin must not delete user memories automatically.

Live shared-database support is deferred. Before enabling it, verify Magic schema fences, every concurrent host version, harness-id support, migration ownership, and downgrade behavior. The old port's schema-77 claim does not authorize connecting it to an upstream schema-84 database.

-----

<a id="phases"></a>
## Implementation stages

Execute one dependency-ordered stage at a time. The P0–P4 lightweight release is implemented and passes the acceptance recorded in the compatibility matrix. The next priority is [DSH-only specialization](dsh-only-plan.md); P5 remains optional and requires a separate need. Deliverables below belong to this fork; the prepared [P0 checklist](README.md#p0) distinguishes completed setup from unverified adapter behavior.

| Stage | Prerequisite | Work and deliverable | Completion evidence |
|---|---|---|---|
| P0: Reproducible feasibility check | This handoff | Use the prepared repository and branch baseline; confirm the downstream package name, source reuse, dependency closure, supported DSH version, read/injection APIs, and resource thresholds. Update `UPSTREAM.md` after deliberate upstream adoption and record probe results in a compatibility matrix. | A clean source build and isolated composition probe identify a maintainable implementation path; every unresolved API or build input is explicit. |
| P1: Memory service and tools | P0 | Implement scoped records, atomic/idempotent writes, revision conflicts, lifecycle handling, and native tools. | Restart, duplicate request, conflicting edit, malformed input, and cross-workspace cases pass focused tests. |
| P2: Logged recall and capture guidance | P1 | Add bounded selection, recorded injection, frozen snapshots, resume/fork handling, and concise memory-use guidance. | A fresh session recalls confirmed facts; cancellation and replay preserve delivered content; obsolete facts and inherited events are not reintroduced. |
| P3: Native history and optional import | P2 | Route historical evidence through DSH query capabilities; implement the import procedure only if real source data exists. | Searches cite usable source locations; import preview, rerun, scope mapping, and rollback are validated or explicitly not applicable. |
| P4: Packaging, UI, and acceptance | P3 | Build the declared native Bundle, document settings and support limits, add a small management page, and run the acceptance matrix. | Clean artifact installation into an isolated profile, native compaction coexistence, functional recall, and measured resource evidence. |
| P5: Optional expansion | Accepted P4 evidence and an explicit need | Consider bounded extraction, embeddings, cross-host sharing, or full context management separately. | Each expansion improves an agreed measure without breaking replay, isolation, or resource targets. |

P0 may narrow or stop the migration if upstream internals cannot be isolated, required recovery reads are unavailable, or host-version maintenance outweighs the memory benefit. Record a concrete finding and alternative rather than silently replacing DSH's lifecycle or disabling its invariants. P5 is not required for a useful first release.

-----

<a id="acceptance"></a>
## Acceptance criteria

The implementation owner must retain reproducible evidence for the following cases. A green unit suite or a running process alone is insufficient. These items define acceptance coverage; current native-alpha results live in the compatibility record, and import is not applicable without supplied source data.

| Area | Required observation |
|---|---|
| Cross-session use | Session A stores a unique project fact; fresh Session B recalls and uses it without copied conversation; restart preserves the result. |
| Isolation and correction | Another workspace cannot recall it by default; an explicit global preference is reusable; a corrected fact supersedes the old one. |
| Replay and fork | Injected content is recoverable from the DSH log; cancellation does not advance delivery state; fork does not duplicate inherited capture. |
| Native composition | Only the selected profile/preset gains the intended capability; DSH compaction still works; no MCP child or extra daemon is started. |
| Lifecycle failures | Reload/disposal releases resources; duplicate writes are idempotent; failed persistence never reports success; unavailable optional extraction does not block ordinary chat. |
| Chinese retrieval | Queries cover Chinese phrases, code symbols, file paths, exact error strings, mixed language, irrelevant queries, and stale facts. |
| Resource growth | Compare short and long sessions plus at least 1,000 and 10,000 memory records; distinguish stored-record growth from per-step history scanning. |
| Data import | A consistent source copy imports reproducibly; reruns add no duplicates; unresolved mappings fail before writes; rollback preserves later user work. |
| Published artifact | The built package installs and activates through its declared Bundle; a fresh install does not depend on a developer's sibling checkout. |

Add focused behavior tests and keyless recorded-session evidence for non-trivial model-visible behavior. This fork uses the Bun package scripts selected in [UPSTREAM.md](../../UPSTREAM.md#validation). When a change also modifies the DSH host's shared events, lifecycle, or agent loop, apply its [testing policy](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/testing.md) and TypeScript/Python SDK projection requirements in that host checkout. Record only commands actually executed; this fork does not inherit DSH's `pnpm run doc-sync` command.

-----

<a id="resume"></a>
## Resume the work

When continuing implementation, first read the current package README and compatibility record, then revisit the P0 investigation order below for any changed host or upstream inputs. Update evidence in this fork; do not turn this handoff into a second mutable task queue.

1. Read this document and the linked DSH architecture, Session-read policy, and testing owners; verify the working tree and actual runtime/profile versions.
2. Refresh upstream and community-port metadata, compare against the pinned commits, and record new differences before choosing the implementation baseline.
3. Work in this fork on `dsh_main`; verify the upstream inputs and the local memory import graph before installing optional inference or UI packages. Do not create a second adapter repository.
4. Prove a minimal native Bundle, logged memory injection, and bounded state recovery in an isolated profile. Keep the user's existing Web profile available during this work.
5. Record P0 findings, chosen settings, unresolved inputs, next stage, and actual checks. Continue only with the bounded migration scope selected from those findings.

-----

<a id="sources"></a>
## Evidence and source map

Investigation links are pinned to the inspected commits. DSH references point to the separately verified host commit rather than paths relative to this Magic fork. This fork's live source map is in the [development entry](README.md#source-map). Source and owning specifications outrank this dated plan.

| Ref | Source and use |
|---|---|
| E1 | [Magic README](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/README.md): feature scope, supported hosts, and storage. |
| E2 | [Magic configuration](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/CONFIGURATION.md): compaction-off, embeddings, Dreamer, and resource settings. |
| E3 | [OpenCode package](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/package.json) and [Pi package](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/pi-plugin/package.json): exports, dependencies, and build inputs. |
| E4 | [Configuration schema](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/src/config/schema/magic-context.ts), [migrations](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/src/features/magic-context/migrations.ts), and [harness identity](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/src/shared/harness.ts): code-level defaults, schema version, and supported ids. |
| E5 | [Port features](https://github.com/xiaohj233/dsh-magic-context/blob/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/docs/FEATURES.md) and [package](https://github.com/xiaohj233/dsh-magic-context/blob/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/packages/dsh-plugin/package.json): claimed parity, validation baseline, and peer pins. |
| E6 | [Port tsconfig](https://github.com/xiaohj233/dsh-magic-context/blob/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/packages/dsh-plugin/tsconfig.json): source-alias build dependency. |
| E7 | [Port source directory](https://github.com/xiaohj233/dsh-magic-context/tree/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/packages/dsh-plugin/src): `agent/transcript.ts`, `agent/context-plane.ts`, and `agent/coordinator.ts` own historical reads, transformations, and recorded replacement. |
| D1 | [DSH architecture](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/architecture.md) and [format authority](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/session-format-status.md): composition, logged model input, and Session versions. |
| D2 | [Session implementation](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/core/session/src/index.ts) and [read-policy decision](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.md): current event access and deprecation policy. |
| D3 | [System prompt](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/core/system-prompt/README.md) and [Session projections](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/subsystems/session-projection.md): injection and incremental state ownership. |
| D4 | [Session query](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/session-query/session-query/README.md) and [SQLite search](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/session-query/session-query-sqlite/README.md): search reuse and actual read-cost limits. |
| D5 | [Compaction interface](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/compaction/compaction/src/index.ts) and [basic implementation](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/compaction/compaction-basic/README.md): retain native ownership in the first release. |

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Release boundaries and optional expansion</summary>

- The downstream package is `@flyingcoding/dsh-magic-context`; verification uses isolated profiles. Keep its release identity separate from upstream packages.
- Decide whether cross-worktree or cross-harness sharing has an actual user need; default to workspace isolation until then.
- SQLite, search normalization, and category types form the audited reuse subset; the compatibility record owns the rationale.
- Tool-driven capture, recovery, and admission are verified; background extraction still requires its own need and budget.
- Resource gates and measurements are recorded separately; no source database was supplied, so import is not applicable.

</details>
