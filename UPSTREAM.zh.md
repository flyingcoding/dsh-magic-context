# 上游基线与同步约定

[English](UPSTREAM.md) | 中文

本文拥有 fork 的上游来源和分支工作流。主动采纳上游更新后，应刷新已核查基线。首版范围与验收见[迁移计划](docs/dsh/migration-plan.zh.md)，下一阶段的专用化工作由 [DSH 专用化计划](docs/dsh/dsh-only-plan.zh.md)维护。

<a id="remotes"></a>
## 远端与分支职责

官方源码从 `upstream/master` 镜像到 `origin_main`，再将与 DSH 有关的已审查修复选择性引入 `dsh_main`。本地分支 `origin_main` 与 Git 远端 `origin` 是不同对象，专用分支不再例行合并完整上游镜像。

| 名称 | 来源或跟踪引用 | 职责 |
|---|---|---|
| `origin` | `https://github.com/flyingcoding/dsh-magic-context` | 用户 fork，下游分支的推送目标。 |
| `upstream` | `https://github.com/cortexkit/magic-context.git` | 官方 Magic Context 源码，拉取其 `master`。 |
| `origin_main` | `origin/origin_main` | 通过快进更新保留仅含上游提交的历史。 |
| `dsh_main` | `origin/dsh_main` | 承载所有 DSH 专属代码和开发文档。 |

不要向 `origin_main` 提交 DSH 改动，也不要将 `dsh_main` 合回该分支或向官方远端推送下游改动。复用上游代码时保留 MIT 声明。已有上游 npm 名称和发布自动化不是 DSH 发布流程；发布前应确定下游包身份和发布规则。

远端配置属于本地设置，不会随重新 clone 自动复制。在其他工作区先检查 `git remote -v`；缺少官方远端时，使用 `git remote add upstream https://github.com/cortexkit/magic-context.git` 添加。如果 `upstream` 已存在，应核对 URL，而不是覆盖它。fork 跟踪引用仍位于 `origin` 下。

<a id="baseline"></a>
## 已核查实现基线

本记录于 2026-09-13 刷新。实现明确使用已导入的 `6f718ff0` 源码，后续仅涉及文档的上游差异已审查但未合并。

| 项目 | 观测值 |
|---|---|
| 已导入 Magic 版本 | `0.42.0` |
| 已导入源码提交 | `6f718ff019bf327a0b291a8510dfb42f91b65921` |
| `dsh_main` / `origin_main` | DSH 实现、测试和 CI 已提交至 `dsh_main`；`origin_main` 保持已导入源码基线。 |
| 原生实现版本 | `be3e1f871b4af0afc54e83925544dad8bf60b525`；双语文档与验收记录在后续独立提交中补齐。 |
| Fetched `upstream/master` | `70d3945bde0feb75a24e922880791f5fe7267823` |
| 待同步上游差异 | `1` 个文档/忽略规则提交：`gitignore: private drafts live under docs/private so the rule names what it hides`。 |
| DSH 宿主兼容目标 | 已发布的 `0.1.5-rc.2` 包，以及已核查工作区 `7e4504856456f5298b8bc66299995ce8d86c3aa1`。 |
| 本地工具可用性 | Node `v24.18.0`、Bun `1.3.5`。 |
| 原生包 | `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`；私有本地 tarball 流程。 |
| 依赖与构建状态 | 已接入过滤安装和原生构建；实际执行的检查见[兼容性记录](docs/dsh/compatibility.zh.md)。 |

已导入的 guard 修复涉及 OpenCode 入口委托。待同步提交仅修改 `.gitignore` 与 `STRUCTURE.md`，不改变已审查的 SQLite/归一化模块。下次主动同步前保持此明确基线。[待同步提交](https://github.com/cortexkit/magic-context/commit/70d3945bde0feb75a24e922880791f5fe7267823)。

<a id="synchronize"></a>
## 开发期间同步上游

以下命令是后续同步流程，不是文档迁移已经执行的操作。开始前确保工作区干净，记录当前分支提交，并检查本地与远端跟踪关系。切换分支前保留用户工作。

```sh
git status --short --branch
git remote -v
git branch -vv
git fetch --no-tags origin dsh_main origin_main
git fetch --no-tags upstream master
git log --oneline origin_main..upstream/master
git diff --stat origin_main..upstream/master
```

审查差异后，先从 fork 跟踪引用快进镜像分支，再从官方引用快进。快进被拒绝表示需要检查历史；不要通过 reset 或强制推送掩盖分歧。

```sh
git switch origin_main
git merge --ff-only origin/origin_main
git merge --ff-only upstream/master
git switch dsh_main
git merge --ff-only origin/dsh_main
```

如果本地 `dsh_main` 有未发布提交，同时其 fork 跟踪引用也前进，应先明确处理双方关系；`--ff-only` 步骤会拒绝分歧。对照保留源码映射审查上游变化，迁入相关修复时记录原始提交，并运行受影响的 DSH 检查。只有全部改动路径都属于保留范围时才整提交 cherry-pick，不能整体合并 `origin_main` 恢复已退役工作区。每个经过检查的分支都以明确名称推送至 `origin`。

```sh
git push origin origin_main
git push origin dsh_main
```

本地文档准备不要求执行这些推送。同步后重新检查分支图，并一起更新已导入源码提交、兼容结果和剩余工作。

<a id="validation"></a>
## 选择相关检查

本仓库使用 Bun workspaces。当前命令由根[包清单](package.json)、各包脚本和[上游 CI](.github/workflows/ci.yml)定义。DSH 的 `pnpm run doc-sync` 不是本 fork 的命令。以下用于后续代码工作的检查选择，此处不宣称运行验证已经完成。

| 改动范围 | 所需证据 |
|---|---|
| 开发 Markdown | 本地链接/锚点、双语内容与行结构、迁移计划校验值，以及 `git diff --check`。 |
| 复用的记忆源码 | 所属聚焦测试及现有包的 typecheck/lint；共享改动覆盖其他受影响消费者。 |
| 原生 DSH 适配器 | 创建包时定义脚本；运行类型检查、聚焦行为/重放测试、产物构建及隔离 DSH 安装冒烟。 |
| SQLite 后端 | 验证 Node 的 `node:sqlite` 分支，不能只有 Bun 后端证据；覆盖崩溃/重试和写入串行行为。 |
| OpenCode/Pi 接入或上游升级 | 运行相关现有包检查及宿主回归，保留现有入口约定。 |
| Rust/subc | 只有改动这些路径时才运行 Cargo 与跨运行时证据；它们不属于轻量首版。 |

根 `typecheck`、`lint`、`build`、`test` 已显式加入 `packages/dsh-plugin`。原生路径使用 `bun install --frozen-lockfile --filter '@flyingcoding/dsh-magic-context' --ignore-scripts` 和 `bun run check:dsh`，由 `.github/workflows/dsh.yml` 提供独立 CI。共享源码或复用约定受到影响时，补跑相关上游包检查；全 workspace 的开发依赖/构建与轻量安装包的运行依赖应分别核对。

<a id="provenance"></a>
## 源码来源与下游改动

保留已导入上游源码和 MIT 许可证的可追踪性。可行时将 DSH 专属工作放在新的原生包和 `docs/dsh/`。在提交或 PR 描述中记录共享源码改动的原因及受影响上游消费者；不要维护无版本的核心源码副本，也不要把预构建社区产物作为源码导入。

迁移计划的首轮证据继续固定到调研提交。当前实现及兼容性声明必须注明实际验证的新 fork 提交和精确 DSH 宿主版本。
