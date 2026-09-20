# Upstream provenance and maintenance

English | [中文](UPSTREAM.zh.md)

This file owns source ancestry, branch roles, and check selection for the DSH-only project. The [migration handoff](docs/dsh/migration-plan.md) preserves the first-release design; the [specialization plan](docs/dsh/dsh-only-plan.md) defines the retained scope and acceptance.

<a id="remotes"></a>
## Remote and branch roles

| Name | Source or tracking ref | Role |
|---|---|---|
| `origin` | `https://github.com/flyingcoding/dsh-magic-context` | Downstream fork and reviewed DSH changes. |
| `upstream` | `https://github.com/cortexkit/magic-context.git` | Official source; inspect `master`. |
| `origin_main` | `origin/origin_main` | Full upstream-only mirror, updated by fast-forward. |
| `dsh_main` | `origin/dsh_main` | The specialized DSH product, tests, and paired documentation. |

Remote configuration is local. Inspect `git remote -v` before adding a missing official remote. Keep DSH changes on `dsh_main`; preserve original MIT notices and upstream package identities in the mirror. The private DSH package has its own name and manual release preparation.

<a id="baseline"></a>
## Inspected baselines

| Item | Recorded value |
|---|---|
| Imported Magic source | `6f718ff019bf327a0b291a8510dfb42f91b65921`, release line `0.42.0`. |
| Initial native implementation | `be3e1f871b4af0afc54e83925544dad8bf60b525`; original acceptance is preserved in [compatibility](docs/dsh/compatibility.md). |
| Accepted pre-specialization source | `73cd88b40b2b0852f75ba267100e3ce664aac102`; the plan followed at `f99f30517f99fd2abe436c965c26e003a3a1546a`. |
| Local source extraction | `9d958bc2`; SQLite, normalization, vocabulary, and retained Node regressions are owned by DSH. |
| Inspected `upstream/master` | `4f9a3d1a4092bc2a7b914e071045cc54b7baea3e`; mirrored on local `origin_main` and reviewed for the [2026-09-21 integration](#sync-2026-09-21). |
| DSH package line | Published `0.1.5-rc.2`, Cordis `4.0.2`. |
| Inspected DSH source | `7e4504856456f5298b8bc66299995ce8d86c3aa1`; the sibling checkout is an optional integration reference. |
| Local tools | Node `v24.18.0`, Bun `1.4.2`, macOS arm64. |
| Package identity | `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`, `private: true`. |

These are inspected pins, not claims about the latest available release. The synchronized [upstream commit](https://github.com/cortexkit/magic-context/commit/4f9a3d1a4092bc2a7b914e071045cc54b7baea3e) leaves all seven retained source and regression origins in [NOTICE](packages/dsh-plugin/NOTICE) unchanged from the imported baseline. Refresh this table after deliberately adopting source or host changes.

<a id="sync-2026-09-21"></a>
## 2026-09-21 integration

At the user's request, local `origin_main` fast-forwarded from `442d15ac082140326232d5d645aa09e614257f1c` to `4f9a3d1a4092bc2a7b914e071045cc54b7baea3e`. Its history was integrated into `dsh_main` after `6b557d61baa6cfe1b10a4ad29769c025043018a0` through a merge retaining the specialized tree. This explicit integration does not change the routine selective-port workflow below.

The upstream delta contains 424 commits and 542 changed paths, with the upstream package line reaching `0.42.6`. Most work belongs to retired OpenCode, OpenCode 2, Pi/OMP, Rust, dashboard, CLI, and E2E owners. Review decisions:

- Keep every retired upstream path excluded from the DSH tree; the complete source remains on `origin_main` and in the merge history.
- Do not adopt the new `.pure-replay-differential-*/` ignore rule because its owning differential harness is not part of the specialized repository.
- Preserve `packages/dsh-plugin`, manifests, lockfile, and CI byte-for-byte. Blob comparisons confirm that all seven attributed upstream source and regression files remain unchanged, so this range contains no runtime fix to port.

Validation for this documentation-only integration uses `bun run check`, `git diff --check`, and Git ancestry/tree comparisons. Host dependency pins remain DSH `0.1.5-rc.2` and Cordis `4.0.2`; no new artifact, checksum, model acceptance, or production activation is claimed. Historical artifact evidence remains in [specialization](docs/dsh/specialization.md).

<a id="sync-2026-09-13"></a>
## 2026-09-13 integration

At the user's request, local `origin_main` fast-forwarded from `6f718ff019bf327a0b291a8510dfb42f91b65921` to `1bdaba3c4a8f978b1d670cd1176e3737d980f9ef`. Its history was integrated into `dsh_main` from `bec24dcdf24e1eec5c43de0897eb676f847ec517` through a merge retaining the specialized scope. This explicit integration does not change the routine selective-port workflow below.

The upstream delta contains 32 commits and 103 changed paths, including D5/Rust codec fixtures, historian/chunk embeddings, Pi/OpenCode status and tools, release notes, and release E2E installation. Review decisions:

- Adopt `docs/private/` in `.gitignore` from `70d3945bde0feb75a24e922880791f5fe7267823`.
- Keep the DSH `STRUCTURE.md`; retain the existing exclusions for the other 101 upstream paths, including additions under retired owners. Their complete source remains on `origin_main` and in the merge history.
- Preserve `packages/dsh-plugin`, manifests, lockfile, and CI byte-for-byte. All seven attributed upstream source/test files are unchanged, so no runtime fix needs porting from this range.

Validation for this documentation/ignore-rule integration uses `bun run check`, `git diff --check`, and Git ancestry/tree comparisons. Host dependency pins remain DSH `0.1.5-rc.2` and Cordis `4.0.2`; no new artifact, checksum, model acceptance, or production activation is claimed. Historical artifact evidence remains in [specialization](docs/dsh/specialization.md).

<a id="synchronize"></a>
## Synchronize without restoring retired products

Start with a clean worktree or preserve user changes, then inspect the graph and both tracking relationships:

```sh
git status --short --branch
git remote -v
git branch -vv
git fetch --no-tags origin dsh_main origin_main
git fetch --no-tags upstream master
git log --oneline origin_main..upstream/master
git diff --stat origin_main..upstream/master
```

Fast-forward the full mirror only after reviewing that delta:

```sh
git switch origin_main
git merge --ff-only origin/origin_main
git merge --ff-only upstream/master
git switch dsh_main
git merge --ff-only origin/dsh_main
```

A rejected fast-forward requires graph inspection; do not reset or force-push away divergence. On `dsh_main`, port only fixes relevant to the retained source map and record their original commits. Whole-commit cherry-picks are appropriate only when every changed path belongs to DSH's retained scope. Routine full-mirror merges can restore retired adapters and are excluded from this workflow.

After focused validation, push reviewed branches explicitly when publication of repository changes is intended:

```sh
git push origin origin_main
git push origin dsh_main
```

<a id="validation"></a>
## Choose the relevant checks

The root [manifest](package.json), [native manifest](packages/dsh-plugin/package.json), and [DSH CI](.github/workflows/dsh.yml) own the commands. A clean checkout uses the default single-workspace path:

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
```

| Changed area | Required evidence |
|---|---|
| Paired Markdown | `docs:check`, current local links/anchors/examples, migration checksums, and `git diff --check`. |
| Memory, tools, or recall | Node behavior tests, typecheck/lint, logged cancellation/replay/restart/fork, and native compaction. |
| SQLite | Actual `node:sqlite` binding/transaction tests, failed persistence, writer contention, retry, and process-death recovery. |
| Manifest, source extraction, or build | Default frozen install from a clean checkout, `structure:check`, portable declarations, artifact build, and isolated tarball activation. |
| Resources or model behavior | Equivalent benchmark workloads and the explicit isolated Ollama Cloud ten-scenario run; record versions and actual observations. |

Default checks need no old workspace, Cargo, sibling checkout, local inference model, or DSH-specific documentation command. The optional installed DSH launcher is used only for profile-level acceptance; the tarball's keyless runtime probe uses published packages. Report remote CI only from its actual run.

<a id="provenance"></a>
## Retained source map

| Original at `6f718ff0` | Local owner | Retained contract |
|---|---|---|
| [SQLite](https://github.com/cortexkit/magic-context/blob/6f718ff019bf327a0b291a8510dfb42f91b65921/packages/plugin/src/shared/sqlite.ts) | [sqlite.ts](packages/dsh-plugin/src/sqlite.ts) | Node statements, bindings, transaction modes, and nested savepoints. |
| [Normalization](https://github.com/cortexkit/magic-context/blob/6f718ff019bf327a0b291a8510dfb42f91b65921/packages/plugin/src/features/magic-context/memory/normalize-hash.ts) | [normalize.ts](packages/dsh-plugin/src/normalize.ts) | Keyword whitespace/case normalization; the unused hash helper is omitted. |
| [Categories](https://github.com/cortexkit/magic-context/blob/6f718ff019bf327a0b291a8510dfb42f91b65921/packages/plugin/src/features/magic-context/memory/types.ts) | [types.ts](packages/dsh-plugin/src/types.ts) | The same seven supported category values. |

[NOTICE](packages/dsh-plugin/NOTICE) also records migrated regression origins and omitted upstream helpers. Keep this subset versioned and auditable. Specialization leaves the DSH database and Session formats stable; rollback uses a revert or a separate accepted-baseline checkout and preserves user data.
