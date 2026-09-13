# Native Magic Context memory for DSH

English | [中文](README.zh.md)

`@flyingcoding/dsh-magic-context` adds local, cross-session memory to DeepSeek Harness through a native Cordis Bundle. Version `0.1.0-alpha.1` provides scoped SQLite records, four native tools, one logged memory snapshot per session, and a Web settings page. It keeps DSH's conversation history, compaction, model routing, and permission handling under their existing owners.

This is a local alpha artifact. The package remains `private: true`; no npm publication or production-profile installation is implied. It requires Node 24 or newer and pins the tested DSH package line to `0.1.5-rc.2`. See the [compatibility record](../../docs/dsh/compatibility.md) for exact evidence and limits.

## Build and verify

Run these commands from the repository root with Bun 1.3.5 and Node 24 available:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
```

The repository has one explicit workspace, so the default install needs no filter. Native tests execute under Node so they exercise `node:sqlite`. The build bundles the package's own audited source and emits a separate production JSX client artifact; declarations stay under `dist/types/`. It checks every Host JavaScript file with Node before packaging. Previous build directories are moved under `.cache/builds/`, keeping stale chunks out of the new artifact.

`test:install` creates a tarball and installs it outside the checkout, checks the local declaration closure, drives a real DSH AgentLoop with a keyless provider, evaluates the client factory against the supported platform imports, and checks Bundle composition when `dsh` is available. It leaves its receipt in `packages/dsh-plugin/.cache/install.json`. `benchmark` requires the built artifact and writes `.cache/benchmark.json` in the package directory.

## Install into a selected profile

Build the artifact first. From the repository root, produce a local tarball:

```sh
mkdir -p .cache/artifacts
npm pack ./packages/dsh-plugin --ignore-scripts --pack-destination .cache/artifacts
```

Install that tarball with `dsh plugin --profile <profile> add <absolute-tarball-path>`, using an explicitly selected `DSH_HOME` for integration checks. The repository root is not a Bundle. The profile's `package.json` must include the package in `dsh.profile.bundles`, after the existing base and application bundles:

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@flyingcoding/dsh-magic-context"
      ]
    }
  }
}
```

Inspect the composition with `dsh --profile <profile> --dump-config`. The three added rows are `magic-memory-store`, `magic-memory-tools`, and `magic-memory-recall`. Launch the chosen application through `dsh --profile <profile>`; a Web preview can add `--port 43179 --no-open`. Only profiles that list the Bundle gain the capability.

## Use memories

Ask the agent to remember a confirmed fact or correct an existing one. Writes default to the Session's trusted workspace. A user-wide preference requires an explicit `scope: "global"`. Workspace arguments do not let the model name another directory; identity comes from the Session header and its real path. Clones and separate worktrees remain separate by default.

| Native tool | Input | Result |
|---|---|---|
| `memory_remember` | `content`, `category`; optional `scope`, `request_id` | Active record, stable id, revision, and creation/deduplication outcome. |
| `memory_recall` | `query`; optional `include_global`, `limit` | Current active records with ids, revisions, scope, and provenance. |
| `memory_update` | `id`, `expected_revision`, `content`, `category`; optional `scope`, `request_id` | New revision; prior content remains `superseded` in history. |
| `memory_forget` | `id`, `expected_revision`; optional `scope`, `request_id` | Archived revision; future retrieval and initial snapshots exclude it. |

Supported categories are `PROJECT_RULES`, `ARCHITECTURE`, `CONFIG_VALUES`, `CONSTRAINTS`, `NAMING`, `USER_PREFERENCES`, and `KNOWN_ISSUES`. Requests with an old revision fail without overwriting the current fact. Reuse a `request_id` with identical arguments after an uncertain response; changed arguments under that id fail. Content deduplication is scoped and normalizes whitespace while preserving case-sensitive identifiers.

Keyword search uses FTS5 over Chinese character/bigram tokens and normalized identifier/path terms. All query terms must match. Chinese substrings, camel-case identifiers, paths, exact error terms, and mixed-language queries are covered; synonyms and translation across languages are not implemented. An irrelevant query returns an empty list.

The first admitted request receives up to five recent active memories, including global preferences when enabled. Complete facts and their framing must fit the configured token estimate; oversized entries are skipped rather than cut mid-fact. That snapshot stays frozen in the Session log. Use explicit recall for newer data. A fork inherits its logged snapshot, including the originating workspace metadata; it does not copy inherited content into new database records.

Historical conversation evidence stays with DSH's `session_search`, `session_event_search`, and exact event-read tools when the profile provides them. This package does not create another transcript index. DSH defaults to `openAt: never` and may not mount query tools; profiles needing full-text history search explicitly enable `session-query-sqlite` and mount the official `@deepseek-ai/dsh-tool-session-query` consumer. Memory capture uses visible tool calls by the current agent; no embedding model, auxiliary extraction agent, periodic summarizer, or document ingestion runs in the default path.

## Manage records in the Web UI

Open **Settings → Memory**. Select a workspace or global preferences, inspect a page of records, edit an active fact, or archive it. Each successful edit shows the new revision and records human provenance separately from agent tool calls. **Export this page** downloads JSON containing the displayed records, including archived ones; continue paging to export more records.

The page uses the existing DSH client loader, locale registry, settings slot, and authenticated Typert gateway. It starts no server of its own. Host management requests validate their input and allow workspace selection only from stored identities. The default page size is 20. Registration and disposal belong to Cordis; the provider owns one database connection.

## Configure the Bundle

Override rows in the selected profile's `cordis.patch.yml`. A row's `config` is a complete replacement, so include all values you intend to override:

```yaml
- id: magic-memory-store
  config:
    cacheSizeMiB: 8
    busyTimeoutMs: 100
    maxContentChars: 4000
    maxQueryChars: 512
    maxResults: 20
- id: magic-memory-recall
  config:
    enabled: true
    includeGlobal: true
    topK: 5
    injectionBudgetTokens: 1000
```

| Setting | Default | Limit or meaning |
|---|---|---|
| `databasePath` | `$DSH_HOME/magic-context/memory.sqlite`; `~/.dsh` when `DSH_HOME` is absent | Optional absolute path to an adapter-owned database. Foreign and future schemas are refused. |
| `cacheSizeMiB` | `8` | SQLite page cache, 1–64 MiB; mmap remains off. This is not process RSS. |
| `busyTimeoutMs` | `100` | SQLite lock wait, 0–5000 ms. |
| `maxContentChars` | `4000` | Maximum new/updated fact length, 128–16000 characters. |
| `maxQueryChars` | `512` | Query length, 32–4096 characters. |
| `maxResults` | `20` | Retrieval/management cap, 1–100 records. |
| `enabled` | `true` | Enable initial snapshots; tools and stored data remain available when false. |
| `includeGlobal` | `true` | Include explicitly global facts in the initial snapshot. |
| `topK` | `5` | Candidate count, at most `maxResults`. |
| `injectionBudgetTokens` | `1000` | Complete framed snapshot budget, 128–8000 estimated tokens. |

The estimate is UTF-8 bytes divided by three, rounded up, not a model tokenizer. Tool schemas and standing guidance are additional model input. Writes, revisions, search updates, and retry receipts commit in one immediate transaction. Database files are private to the owner. Unloading or uninstalling the Bundle closes resources and retains memory data.

## Replay, cancellation, and recovery

The recall consumer wraps `agent/pre-step` and preserves the host's request-series decision. DSH admits and logs the returned message only after its own cancellation checks. The `magicMemorySnapshot` projection records the committed message id; a cancelled proposal leaves it empty and a later accepted request can try again. Recovery derives delivery from the log, not from today's memory database.

The plugin performs no arbitrary synchronous Session-history reads and retains no full history copy. The host projection framework may fold an existing log once when materializing a missing state; subsequent updates are incremental. DSH itself still retains and restores Session history, so this does not claim constant-memory recovery for the entire host.

## Real-model verification

Configure a separate `memory-live` profile with the same Ollama Cloud route used by the deployment: `api: openai-completions`, `baseURL: https://ollama.com/v1`, model `deepseek-v4.1-flash`, and its existing `OLLAMA_API_KEY` credential reference. Keep the credential outside this repository. A local Ollama daemon is not needed. The profile must use this Bundle, the headless application, `live-memory.sqlite`, and plain JSONL Session storage under `live-sessions` in that isolated home. Disable the `session-title-llm` row to isolate the test's model calls. The complete acceptance profile also installs and mounts `@deepseek-ai/dsh-tool-session-query@0.1.5-rc.2`, configures `session-query-sqlite` with `openAt: first-search`, and points its `path` at `live-history.sqlite` in the isolated home.

Run from `packages/dsh-plugin` after setting `DSH_MEMORY_TEST_HOME` to that prepared home:

```sh
bun run test:live
```

The script refuses the production `~/.dsh` home, creates fresh synthetic workspaces, and verifies ten real-model scenarios: remember, fresh recall, workspace isolation, correction, corrected recall, archive, archived recall, native history citations, global preference writes, and cross-workspace global recall. Every result is checked against the actual Session log and model route. Local evidence is written to `.cache/live-model.json` and `.cache/live-model/`.

## Release and rollback

Keep the alpha package private until its compatibility matrix is reviewed and the downstream npm scope is confirmed. Release preparation is manual: update the version, run the checks above, inspect the tarball, and install that exact tarball into an isolated profile. Publication requires a deliberate release change; the sole DSH CI workflow validates the private artifact and has no publication step.

To verify format compatibility against the accepted artifact, set `DSH_MEMORY_BASELINE_STORE` to its isolated installed `dist/store.js` and run `bun run test:rollback` from the root after building. The probe uses a fresh synthetic database, alternates old/new writers, and checks ids, retry receipts, revisions, archive, retrieval, and the unchanged schema.

To roll back activation, remove this package from the selected profile's Bundle list and reload that profile. Keep its memory database and DSH Session logs. Importing an existing Magic database and sharing live databases with other hosts are outside this alpha; no source database was supplied for import. The [migration plan](../../docs/dsh/migration-plan.md) owns later optional work.
