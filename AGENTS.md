# DSH adaptation instructions

This fork targets DSH exclusively. The accepted alpha still contains the full upstream tree; the next phase removes other adapters under the [DSH-only plan](docs/dsh/dsh-only-plan.md) ([中文](docs/dsh/dsh-only-plan.zh.md)). Read the [DSH development entry](docs/dsh/README.md) ([中文](docs/dsh/README.zh.md)) and the completed first-release [migration plan](docs/dsh/migration-plan.md) before implementation work.

## Repository workflow

- Develop DSH-specific code and documentation on `dsh_main`; keep `origin_main` for upstream-only fast-forward synchronization.
- Follow [UPSTREAM.md](UPSTREAM.md) for remote roles, inspected baselines, synchronization, and validation. Preserve the user's work before switching or merging.
- Read [ARCHITECTURE.md](ARCHITECTURE.md) and [STRUCTURE.md](STRUCTURE.md) before extracting shared Magic source. Preserve required DSH contracts and tests before retiring other hosts and their owning commands.
- Prioritize DSH-only source/dependency/configuration simplification over optional feature expansion. Do not add new OpenCode/Pi/OMP compatibility work; keep the full upstream mirror on `origin_main` and port relevant fixes selectively.
- Use the available semantic code-search tool before editing an unfamiliar module; use exact searches for known identifiers.
- Conversation language is Chinese; code comments are concise English and explain non-obvious function behavior.

## Native adapter scope

- The first release provides local memory through a native Cordis Bundle and retains DSH compaction. Follow the plan's explicit scope and proposed budgets.
- The native adapter lives in `packages/dsh-plugin/`; read its paired READMEs and `docs/dsh/compatibility.md`. The repository root is not an installable DSH Bundle.
- Reuse audited source modules with exact provenance. Extract the small required source subset into the DSH package before removing upstream workspace trees; do not copy compiled community-port output.
- Model-visible input must be reconstructable from the DSH Session log. Use the host's supported admission, projection, cancellation, and lifecycle APIs.
- New work must not depend on arbitrary synchronous Session-history reads. Verify actual history I/O and memory costs before choosing a reader.
- Use an isolated DSH home/profile for integration checks. The sibling DSH repository is the host integration target, not the owner of these development documents.
- Keep embeddings, periodic auxiliary agents, Rust/subc, and document ingestion outside the default lightweight path unless the task explicitly changes that scope.

## Verification and documentation

- Use the Bun/package checks selected in [UPSTREAM.md](UPSTREAM.md#validation); do not run DSH-only commands in this fork.
- Adding a workspace requires explicit root-script and CI wiring; existing root scripts name upstream packages individually.
- Verify Node-backed SQLite, replay, restart, fork isolation, and bounded resource use for the affected adapter behavior. Claims name the exact host version and commands actually run.
- Keep English and Chinese DSH document pairs synchronized. Refresh the migration-plan checksum record after changing both sides.
- Preserve upstream licenses and package identities. Choose a downstream package name and release workflow before publishing.
