# DSH Magic Context

English | [中文](README.zh.md)

Local, cross-session memory for DeepSeek Harness, delivered as a native Cordis Bundle. DSH owns conversation history, compaction, model routing, and permissions; this package owns selected durable memories and their logged recall.

The only workspace is [`packages/dsh-plugin`](packages/dsh-plugin/README.md). The private package `@flyingcoding/dsh-magic-context@0.1.0-alpha.1` targets Node 24+ and DSH `0.1.5-rc.2`. Its repository root is a development workspace; install the built package tarball through DSH.

## Build and check

Use Bun 1.3.5 and Node 24 from the repository root:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
```

Default commands operate on DSH alone. Tests run under Node and exercise `node:sqlite`. `check` includes types, lint, behavior, paired documentation, and repository ownership. `test:install` installs the tarball outside the checkout, checks declaration closure, runs a keyless AgentLoop, and evaluates the production client factory. `check:dsh` remains an alias for `check`.

For profile installation, configuration, or explicit real-model acceptance, follow the [package guide](packages/dsh-plugin/README.md). Integration runs use an isolated DSH home/profile. Local acceptance does not publish npm packages or activate a production profile.

## Use memory

| Capability | Behavior |
|---|---|
| Remember and correct | Four native tools provide scoped writes, recall, revision checks, and archive operations. |
| Workspace isolation | Trusted Session workspace identity is the default; global writes require an explicit scope. |
| Durable storage | SQLite records, revision history, search entries, and retry receipts commit atomically. |
| Logged recall | A bounded initial snapshot is admitted and recorded by DSH, then stays frozen across restart and fork. |
| Web management | The DSH settings page lists, edits, archives, and exports selected records. |

The lightweight path uses literal Chinese/identifier/path retrieval. Embeddings, background extraction, document ingestion, other host adapters, and a separate daemon are outside this product's current scope.

## Development references

| Read | Purpose |
|---|---|
| [Package guide](packages/dsh-plugin/README.md) | Installation, tools, configuration, UI, release, and rollback. |
| [Architecture](ARCHITECTURE.md) | Storage, admission, lifecycle, and replay invariants. |
| [Source layout](STRUCTURE.md) | Ownership of retained files and commands. |
| [DSH development entry](docs/dsh/README.md) | Plans, source provenance, and compatibility evidence. |
| [Specialization plan](docs/dsh/dsh-only-plan.md) | Removal scope, stages, and acceptance criteria. |
| [Specialization acceptance](docs/dsh/specialization.md) | Current package, clean checks, model/Web evidence, and measured changes. |
| [Initial compatibility](docs/dsh/compatibility.md) | Preserved first-release observations and supported limits. |
| [Upstream workflow](UPSTREAM.md) | Full source mirror and selective adoption of relevant fixes. |

## Source and license

This product derives a small SQLite, normalization, and category subset from [cortexkit/magic-context](https://github.com/cortexkit/magic-context/tree/6f718ff019bf327a0b291a8510dfb42f91b65921). Exact origins and downstream changes are recorded in [NOTICE](packages/dsh-plugin/NOTICE). The MIT license and original copyright remain in [LICENSE](LICENSE).

`origin_main` preserves the full upstream mirror. DSH development lives on `dsh_main`; retired products, release automation, and historical documentation remain available in Git history and the mirror.
