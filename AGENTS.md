# DSH-only development instructions

This project supports DSH exclusively. Read the [development entry](docs/dsh/README.md) ([中文](docs/dsh/README.zh.md)), [architecture](ARCHITECTURE.md), [source layout](STRUCTURE.md), and [specialization plan](docs/dsh/dsh-only-plan.md) before implementation. The [migration handoff](docs/dsh/migration-plan.md) preserves the completed first-release design.

## Repository workflow

- Develop DSH code and paired documentation on `dsh_main`. Preserve `origin_main` as the full upstream-only mirror.
- Follow [UPSTREAM.md](UPSTREAM.md) for exact source pins, selective fix adoption, and validation. Preserve user work before switching or merging; do not routinely merge the full mirror into the specialized branch.
- Keep `packages/dsh-plugin` as the only workspace. Root commands and CI serve this package; a new workspace requires an explicit scope decision and command/CI wiring.
- Use semantic code search before editing unfamiliar modules and exact searches for known identifiers.
- Conversation language is Chinese. Code comments are concise English and explain function behavior or non-obvious decisions.
- Use `trash` for filesystem deletions. User databases, Session logs, production profiles, and unrelated caches are outside repository cleanup.

## Native memory contracts

- The [native package](packages/dsh-plugin/README.md) ([中文](packages/dsh-plugin/README.zh.md)) is the installable Cordis Bundle. The repository root is a development workspace.
- Preserve package identity, Bundle rows, tool schemas, database path/schema, memory ids/revisions, and Session projection identity during source/dependency simplification.
- Local SQLite, normalization, and category sources retain exact upstream ancestry in [NOTICE](packages/dsh-plugin/NOTICE). Reuse audited source only; compiled community artifacts are not source inputs.
- DSH owns conversation history, compaction, model routing, cancellation, admission, and lifecycle. Model-visible input must be reconstructable from its Session log.
- Do not introduce arbitrary synchronous Session-history reads. Verify actual history I/O and retained memory when changing recovery behavior.
- Keep embeddings, auxiliary extraction agents, Rust/subc, document ingestion, and other host adapters outside the default path unless explicitly requested.
- Use isolated homes/profiles for integration. Published host dependencies support normal checks; a sibling DSH checkout is an optional integration reference, not a build input.

## Verification and documentation

- Use the root Bun commands in [UPSTREAM.md](UPSTREAM.md#validation). Tests run on Node 24+ through `bun run test`; do not replace them with `bun test`.
- Verify actual Node SQLite transactions/bindings, replay, restart, fork isolation, disposal, artifact declaration closure, and bounded resources for affected behavior.
- Record the exact source revision, host version, artifact checksum, and commands actually run. Keep historical acceptance measurements separate from new results.
- Update English/Chinese document pairs together. Refresh the migration-plan checksum record after changing its pair and run `bun run docs:check`.
- Preserve MIT notices and upstream identities. The private DSH artifact has no automatic publication workflow; npm publication and production activation are separate release actions.
