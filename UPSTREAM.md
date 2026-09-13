# Upstream baseline and synchronization

English | [中文](UPSTREAM.zh.md)

This file owns the fork's upstream provenance and branch workflow. Refresh the inspected baseline after deliberately adopting upstream changes. First-release scope and acceptance live in the [migration plan](docs/dsh/migration-plan.md); the [DSH-only plan](docs/dsh/dsh-only-plan.md) owns the next specialization phase.

<a id="remotes"></a>
## Remote and branch roles

Mirror official source from `upstream/master` into `origin_main`; adopt only reviewed fixes relevant to DSH into `dsh_main`. The local branch `origin_main` and the Git remote `origin` are different objects. The specialized branch does not routinely merge the complete upstream mirror.

| Name | Source or tracking ref | Role |
|---|---|---|
| `origin` | `https://github.com/flyingcoding/dsh-magic-context` | The user's fork; destination for downstream branches. |
| `upstream` | `https://github.com/cortexkit/magic-context.git` | Official Magic Context source; fetch its `master`. |
| `origin_main` | `origin/origin_main` | Preserve an upstream-only history through fast-forward updates. |
| `dsh_main` | `origin/dsh_main` | Own all DSH-specific code and development documentation. |

Do not commit DSH changes to `origin_main`, merge `dsh_main` back into it, or push downstream changes to the official remote. Preserve MIT notices when reusing upstream code. The existing upstream npm names and release automation do not constitute a DSH release process; select a downstream package identity and publication rules before publishing.

Remote configuration is local and is not copied by a fresh clone. On another checkout, inspect `git remote -v`; add a missing official remote with `git remote add upstream https://github.com/cortexkit/magic-context.git`. If `upstream` already exists, verify its URL instead of overwriting it. The fork-tracking refs remain under `origin`.

<a id="baseline"></a>
## Inspected implementation baseline

This observation was refreshed on 2026-09-13. The implementation deliberately uses the already-imported `6f718ff0` source; the later documentation-only upstream delta has been inspected but not merged.

| Item | Observed value |
|---|---|
| Imported Magic release | `0.42.0` |
| Imported source commit | `6f718ff019bf327a0b291a8510dfb42f91b65921` |
| `dsh_main` / `origin_main` | DSH implementation, tests, and CI are committed on `dsh_main`; `origin_main` retains the imported source base. |
| Native implementation revision | `be3e1f871b4af0afc54e83925544dad8bf60b525`; paired documentation and acceptance records follow in a separate commit. |
| Fetched `upstream/master` | `70d3945bde0feb75a24e922880791f5fe7267823` |
| Pending upstream delta | `1` documentation/ignore-rule commit: `gitignore: private drafts live under docs/private so the rule names what it hides`. |
| DSH host compatibility target | Published `0.1.5-rc.2` packages and inspected checkout `7e4504856456f5298b8bc66299995ce8d86c3aa1`. |
| Local tool availability | Node `v24.18.0`, Bun `1.3.5`. |
| Native package | `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`; private local tarball workflow. |
| Dependency/build state | Filtered dependencies and native build are implemented; exact executed checks are in [compatibility](docs/dsh/compatibility.md). |

The imported guard fix affects OpenCode's entry delegation. The pending commit changes `.gitignore` and `STRUCTURE.md`, not the audited SQLite/normalization leaves. Keep this explicit baseline until the next deliberate synchronization. [Pending commit](https://github.com/cortexkit/magic-context/commit/70d3945bde0feb75a24e922880791f5fe7267823).

<a id="synchronize"></a>
## Synchronize upstream during development

The commands below are the future synchronization procedure, not actions performed by document migration. Begin with a clean worktree, save the current branch tips, and inspect both local/remote tracking relationships. Preserve user work before switching branches.

```sh
git status --short --branch
git remote -v
git branch -vv
git fetch --no-tags origin dsh_main origin_main
git fetch --no-tags upstream master
git log --oneline origin_main..upstream/master
git diff --stat origin_main..upstream/master
```

After reviewing the delta, fast-forward the mirror from its fork-tracking ref and then from the official ref. A rejected fast-forward means the histories need inspection; do not reset or force-push the mirror to conceal the divergence.

```sh
git switch origin_main
git merge --ff-only origin/origin_main
git merge --ff-only upstream/master
git switch dsh_main
git merge --ff-only origin/dsh_main
```

If local `dsh_main` has unpublished commits and its fork-tracking ref has also moved, resolve that relationship deliberately; the `--ff-only` step intentionally refuses divergence. Inspect upstream changes against the retained source map, port relevant fixes with their original commit references, and run the affected DSH checks. Cherry-pick a complete commit only when every changed path belongs to the retained scope. Do not merge `origin_main` wholesale and restore retired workspaces. Push each reviewed branch to `origin` with an explicit name.

```sh
git push origin origin_main
git push origin dsh_main
```

These pushes are not required for local document preparation. Re-read the branch graph after synchronization and update the imported source commit, compatibility results, and pending work together.

<a id="validation"></a>
## Choose the relevant checks

This repository uses Bun workspaces. The root [package manifest](package.json), package scripts, and [upstream CI](.github/workflows/ci.yml) own the current commands. DSH's `pnpm run doc-sync` is not a command in this fork. The following are check-selection instructions for later code work; no runtime check is claimed complete here.

| Changed area | Required evidence |
|---|---|
| Development Markdown | Local links/anchors, paired content and line structure, migration-plan checksums, and `git diff --check`. |
| Reused memory code | Owning focused tests plus the existing package's typecheck/lint; cover other existing consumers affected by a shared change. |
| Native DSH adapter | Define package scripts when the package is created; run its typecheck, focused behavior/replay tests, artifact build, and isolated DSH install smoke. |
| SQLite backend | Verify the Node `node:sqlite` branch, not only Bun's backend, plus crash/retry and write-serialization behavior. |
| OpenCode/Pi integration or upstream upgrade | Run the relevant existing package checks and host regressions; preserve current entrypoint contracts. |
| Rust/subc | Run Cargo and cross-runtime evidence only if those paths change; they are outside the lightweight first release. |

Root `typecheck`, `lint`, `build`, and `test` now explicitly include `packages/dsh-plugin`. For the native path, use `bun install --frozen-lockfile --filter '@flyingcoding/dsh-magic-context' --ignore-scripts` and `bun run check:dsh`; `.github/workflows/dsh.yml` owns its dedicated CI. Select additional upstream package checks when their source or reused contracts are affected. Keep the full-workspace install/build separate from the lightweight artifact dependency graph.

<a id="provenance"></a>
## Source provenance and downstream changes

Keep the imported upstream source and MIT license traceable. Put DSH-specific work under the new native package and `docs/dsh/` where practical. Record shared-source changes with their reason and affected upstream consumers in commit/PR descriptions; do not maintain an unversioned copied core or import prebuilt community artifacts as source.

The migrated plan's initial evidence remains pinned to its research commits. Current implementation and compatibility claims must name the new fork commit and the exact DSH host version they were verified against.
