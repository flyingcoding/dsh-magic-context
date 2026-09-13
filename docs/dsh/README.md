# DSH development

English | [中文](README.zh.md)

This directory owns the native DSH memory project's plans and evidence. `packages/dsh-plugin/` is the sole workspace: local long-term memory, bounded logged recall, and a DSH Web settings page, with compaction retained by the host.

| Read | Purpose |
|---|---|
| [Native package](../../packages/dsh-plugin/README.md) | Build, install, configure, and operate the private alpha. |
| [Specialization acceptance](specialization.md) | Completed S1–S4, final artifact, controlled measurements, model/Web checks, and rollback. |
| [Compatibility record](compatibility.md) | Original acceptance inputs, observed behavior, model/resource results, and limits. |
| [DSH-only plan](dsh-only-plan.md) | Source extraction, removal scope, and the specialization acceptance sequence. |
| [Migration handoff](migration-plan.md) | Historical first-release design, scope, P0–P5 stages, and optional import. |
| [Upstream workflow](../../UPSTREAM.md) | Source pins, full-mirror maintenance, and selective fix adoption. |
| [Architecture](../../ARCHITECTURE.md) and [layout](../../STRUCTURE.md) | Current DSH runtime contracts and file ownership. |
| [Agent instructions](../../AGENTS.md) | Standing implementation rules. |

<a id="p0"></a>
## First-release baseline

P0–P4 are implemented, with dated acceptance retained in [compatibility](compatibility.md). That baseline verified isolated Node SQLite storage, committed injection, cancellation, restart/replay, forks, fresh-session recall, compaction, Web management, and ten real-model scenarios. It also defined the [resource gates](resource-budgets.json) and 1,000/10,000-record workloads.

The old full-source tree was a preparation input. Its complete history remains on `origin_main`; `dsh_main` now owns the specialized package. Production-profile activation, npm publication, supplied-data import, and optional P5 features remain separate work items.

<a id="next-phase"></a>
## DSH specialization

The [plan](dsh-only-plan.md) freezes the pre-specialization inventory and acceptance criteria. The retained source is local to DSH, root commands target one workspace, and upstream release/host infrastructure is retired. New acceptance evidence must distinguish repository/dependency savings from runtime RSS and compare equivalent workloads. Historical measurements are preserved rather than overwritten.

<a id="source-map"></a>
## Retained source map

| Area | Current owner | Contract |
|---|---|---|
| SQLite | [sqlite.ts](../../packages/dsh-plugin/src/sqlite.ts) | Node statements, argument binding, immediate transactions, and nested savepoints. |
| Normalization | [normalize.ts](../../packages/dsh-plugin/src/normalize.ts) | Search case/whitespace normalization; write deduplication stays case-sensitive. |
| Categories and records | [types.ts](../../packages/dsh-plugin/src/types.ts) | Stable seven-category vocabulary, scopes, revisions, and provenance. |
| Persistence and retrieval | [store.ts](../../packages/dsh-plugin/src/store.ts), [tokenize.ts](../../packages/dsh-plugin/src/tokenize.ts) | DSH-owned schema and bounded literal FTS queries. |
| Model input | [recall.ts](../../packages/dsh-plugin/src/recall.ts), [tools.ts](../../packages/dsh-plugin/src/tools.ts) | Logged admission, recovery, and observable memory operations. |
| Source attribution | [NOTICE](../../packages/dsh-plugin/NOTICE), [upstream map](../../UPSTREAM.md#provenance) | Exact original paths/commit and downstream omissions. |

The DSH host is a separate integration repository. The inspected source revision is linked from the [migration handoff](migration-plan.md#sources); normal development and artifact installation use published dependencies without requiring that sibling checkout. The community port remains historical reference material.

<a id="layout"></a>
## Package ownership

`packages/dsh-plugin/` owns the Bundle, Cordis service/provider/consumers, Host lifecycle, tests, build scripts, and optional Web face. Its local source subset is sufficient for declaration generation and runtime bundling. New runtime capabilities must preserve DSH's logged model input and bounded state, and need their own scope and acceptance.

<a id="maintenance"></a>
## Maintain paired evidence

Update each English/Chinese pair together and run `bun run docs:check` from the root. New observed results belong in a dated record under `evidence/`, with the exact source, host, artifact checksum, and commands. The initial migration handoff keeps its Git-blob checksum record; refresh both values after editing its pair. No host-specific documentation command is installed here.
