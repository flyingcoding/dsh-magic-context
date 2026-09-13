# DSH adaptation development

English | [中文](README.zh.md)

This directory owns the downstream DSH adaptation plan for the full `flyingcoding/dsh-magic-context` fork. The target is a lightweight native Cordis Bundle: local long-term memory, bounded recall, and DSH-owned compaction. The native `0.1.0-alpha.1` package now lives in `packages/dsh-plugin/`; installation and behavior evidence are recorded separately from the original plan.

| Read | Purpose |
|---|---|
| [Native package](../../packages/dsh-plugin/README.md) | Build, install, configure, and operate the current alpha. |
| [Compatibility record](compatibility.md) | Verified host versions, replay and model tests, resource measurements, and remaining limits. |
| [Migration plan](migration-plan.md) | Scope, architecture, P0–P5 stages, data import, resource targets, and acceptance. |
| [Upstream workflow](../../UPSTREAM.md) | Remotes, branch roles, pinned source baseline, pending changes, synchronization, and check selection. |
| [Agent instructions](../../AGENTS.md) | Short standing rules for work in this fork. |
| [Upstream architecture](../../ARCHITECTURE.md) and [source layout](../../STRUCTURE.md) | Understand the existing Magic runtime before selecting reusable components. |

<a id="p0"></a>
## P0 readiness

This checklist separates repository preparation from behavior verification. Completing the setup rows is not proof that an adapter works.

- [x] The full official-source fork is available, including the reusable memory code under `packages/plugin/src/`.
- [x] `dsh_main` tracks `origin/dsh_main`; `origin_main` tracks `origin/origin_main`.
- [x] The official `upstream` remote is configured and its `master` ref has been fetched.
- [x] The migration plan is located in this repository with portable DSH-source links.
- [x] Node `v24.18.0` and Bun `1.3.5` were observed during preparation; `bun.lock` is present.
- [x] Reviewed the upstream delta and selected `6f718ff019bf327a0b291a8510dfb42f91b65921` as the implementation baseline.
- [x] Audited the default import graph: reuse SQLite, text normalization, and category types without the full context manager.
- [x] Created `@flyingcoding/dsh-magic-context` with distinct storage, tool, recall, and optional client responsibilities.
- [x] Added filtered dependency installation, Node typecheck/tests, build checks, root-script wiring, and dedicated CI.
- [x] Verified committed injection, cancellation, real persisted-session recovery, forks, and fresh-session recall in isolation.
- [x] Defined numeric budgets and measured 1,000 / 10,000 records plus short / long Session logs.

The original P0 feasibility questions have a native implementation path. Follow the [compatibility record](compatibility.md) for acceptance status and the [package README](../../packages/dsh-plugin/README.md) for current behavior. Production-profile activation and npm publication remain separate release actions.

<a id="source-map"></a>
## Source map for the adapter

These links name existing upstream files. Reuse small internal modules only after inspecting their imports; the `memory/index.ts` barrel also exports embedding modules and is not automatically a lightweight entry point.

| Area | Existing source | P0 question |
|---|---|---|
| Memory records | [storage-memory.ts](../../packages/plugin/src/features/magic-context/memory/storage-memory.ts), [types.ts](../../packages/plugin/src/features/magic-context/memory/types.ts) | Which record/revision/lifecycle behavior is reusable without importing the complete context manager? |
| Local keyword retrieval | [storage-memory-fts.ts](../../packages/plugin/src/features/magic-context/memory/storage-memory-fts.ts) | How do Chinese, identifiers, and paths match without embeddings? |
| SQLite and migrations | [sqlite.ts](../../packages/plugin/src/shared/sqlite.ts), [migrations.ts](../../packages/plugin/src/features/magic-context/migrations.ts) | Can the DSH memory store remain small and independent while using Node's backend? |
| Identity and configuration | [harness.ts](../../packages/plugin/src/shared/harness.ts), [project-identity.ts](../../packages/plugin/src/features/magic-context/memory/project-identity.ts), [config schema](../../packages/plugin/src/config/schema/magic-context.ts) | Which DSH-specific identity and model-routing fields must be added explicitly? |
| Existing host adapter | [Pi entry](../../packages/pi-plugin/src/index.ts), [Pi tsconfig](../../packages/pi-plugin/tsconfig.json) | How does the monorepo reuse source while keeping host integration separate? |
| Tool behavior | [ctx-memory](../../packages/plugin/src/tools/ctx-memory/tools.ts), [ctx-search](../../packages/plugin/src/tools/ctx-search/tools.ts) | Which behavior should the native DSH tools retain, with DSH-owned schemas and logging? |

The DSH host is a separate integration repository, locally available as the sibling `../deepseek-harness`. Its inspected source links are pinned in [the migration plan](migration-plan.md#sources). The older `xiaohj233/dsh-magic-context` community port is reference material, not this repository's upstream.

<a id="layout"></a>
## Package ownership

`packages/dsh-plugin/` owns the native Bundle, Cordis service/provider/consumers, Host lifecycle, and optional DSH Web client integration. Keep reusable source in its upstream-owned location where practical; document every shared-file change and run the existing consumers' checks. Do not copy the community port's compiled `dist/` into this fork.

<a id="maintenance"></a>
## Maintain the development documents

Update each English/Chinese pair together. The migrated plan retains a portable Git-blob checksum record; after editing both files, refresh its values with `git hash-object docs/dsh/migration-plan.md` and `git hash-object docs/dsh/migration-plan.zh.md`. This record confirms content identity, not runtime correctness. No DSH-specific documentation command is installed in this fork.
