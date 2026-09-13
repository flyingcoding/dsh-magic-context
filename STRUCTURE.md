# DSH source layout

English | [中文](STRUCTURE.zh.md)

This is a Bun workspace with one native DSH package. The [architecture](ARCHITECTURE.md) explains runtime invariants; this file identifies source and command owners.

```text
./
├── packages/dsh-plugin/
│   ├── src/
│   │   ├── index.ts, service.ts, config.ts
│   │   ├── sqlite.ts, store.ts, types.ts
│   │   ├── normalize.ts, tokenize.ts, scope.ts
│   │   ├── tools.ts, recall.ts
│   │   ├── management.ts, management-wire.ts
│   │   └── client/
│   ├── tests/
│   │   └── fixtures/memory-session.v3.json
│   ├── scripts/
│   ├── cordis.patch.yml
│   ├── package.json
│   ├── tsconfig.json, tsconfig.build.json, biome.json
│   └── README.md, README.zh.md, LICENSE, NOTICE
├── docs/dsh/
│   ├── README.md, README.zh.md
│   ├── migration-plan.md, migration-plan.zh.md, migration-plan.i18n.yaml
│   ├── dsh-only-plan.md, dsh-only-plan.zh.md
│   ├── compatibility.md, compatibility.zh.md
│   ├── specialization.md, specialization.zh.md
│   ├── resource-budgets.json
│   └── evidence/
├── .github/workflows/dsh.yml
├── .github/ISSUE_TEMPLATE/
├── package.json, bun.lock
├── README.md, README.zh.md
├── ARCHITECTURE.md, ARCHITECTURE.zh.md
├── STRUCTURE.md, STRUCTURE.zh.md
├── UPSTREAM.md, UPSTREAM.zh.md
└── AGENTS.md, LICENSE
```

## Where changes belong

| Concern | Owner |
|---|---|
| SQLite, schema, revisions, retry, and scope | `packages/dsh-plugin/src/store.ts`, `src/sqlite.ts`, `src/types.ts`, `src/scope.ts`. |
| Literal retrieval | `packages/dsh-plugin/src/normalize.ts`, `src/tokenize.ts`. |
| Tool schemas and guidance | `packages/dsh-plugin/src/tools.ts`. |
| Admission and delivered projection | `packages/dsh-plugin/src/recall.ts`. |
| Settings actions and browser UI | `packages/dsh-plugin/src/management*.ts`, `src/client/`. |
| Behavior and replay regressions | `packages/dsh-plugin/tests/*.test.ts`; durable keyless fixture under `tests/fixtures/`. |
| Build and acceptance automation | `packages/dsh-plugin/scripts/`; all public development commands route here through the root manifest. |
| Current usage and limits | Paired package READMEs and `docs/dsh/compatibility*.md`. |
| Source ancestry and future imports | Package `NOTICE`, root `UPSTREAM*.md`, and the complete `origin_main` mirror. |

## Commands and generated output

The root `build`, `typecheck`, `test`, `lint`, `lint:fix`, `docs:check`, `test:install`, `benchmark`, and `test:live` commands forward to the native package. `structure:check` rejects extra workspaces, stale lockfile owners, and retired command inputs. `check` combines static and behavior checks. Use `bun run test` so the suite runs under Node.

The build writes Host files and a separate browser factory to `packages/dsh-plugin/dist/`; declarations are under `dist/types/`. These are generated outputs. Old builds are retained locally under the package's `.cache/builds/`. Install, benchmark, and model scripts record receipts under `.cache/`, while stable redacted summaries belong in `docs/dsh/evidence/`.

No root Cargo workspace, alternate package lockfile, old-host preload, standalone documentation site, or independent desktop application is required. Retired source, release material, and non-DSH documentation remain accessible from the pinned upstream mirror and Git history.
