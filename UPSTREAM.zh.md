# 上游来源与维护

[English](UPSTREAM.md) | 中文

本文维护 DSH 专用项目的源码来源、分支职责与检查选择。[迁移交接](docs/dsh/migration-plan.zh.md)保留首次发布设计，[专用化计划](docs/dsh/dsh-only-plan.zh.md)定义保留范围和验收标准。

<a id="remotes"></a>
## 远端与分支职责

| 名称 | 来源或跟踪引用 | 职责 |
|---|---|---|
| `origin` | `https://github.com/flyingcoding/dsh-magic-context` | 下游 fork 与已审查 DSH 改动。 |
| `upstream` | `https://github.com/cortexkit/magic-context.git` | 官方源码，核查 `master`。 |
| `origin_main` | `origin/origin_main` | 通过快进更新的完整纯上游镜像。 |
| `dsh_main` | `origin/dsh_main` | DSH 专用产品、测试和双语文档。 |

远端配置属于本地状态，添加缺失的官方远端前先核对 `git remote -v`。DSH 改动保留在 `dsh_main`；镜像保留原始 MIT 说明和上游包身份。DSH 私有包采用独立名称和手动发布准备流程。

<a id="baseline"></a>
## 已核查基线

| 项目 | 记录值 |
|---|---|
| 导入的 Magic 源码 | `6f718ff019bf327a0b291a8510dfb42f91b65921`，发布线 `0.42.0`。 |
| 初始原生实现 | `be3e1f871b4af0afc54e83925544dad8bf60b525`，初始验收保留在[兼容性记录](docs/dsh/compatibility.zh.md)。 |
| 专用化前已验收源码 | `73cd88b40b2b0852f75ba267100e3ce664aac102`，后续计划提交为 `f99f30517f99fd2abe436c965c26e003a3a1546a`。 |
| 本地源码迁出 | `9d958bc2`，SQLite、归一化、词表和保留的 Node 回归由 DSH 自己维护。 |
| 已核查 `upstream/master` | `70d3945bde0feb75a24e922880791f5fe7267823`，比导入源码多一个文档/忽略规则提交，尚未采纳。 |
| DSH 包版本线 | 已发布 `0.1.5-rc.2`，Cordis `4.0.2`。 |
| 已核查 DSH 源码 | `7e4504856456f5298b8bc66299995ce8d86c3aa1`，兄弟工作区仅作可选集成参考。 |
| 本机工具 | Node `v24.18.0`、Bun `1.3.5`、macOS arm64。 |
| 包身份 | `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`，`private: true`。 |

这些是已核查固定版本，不代表当前可用的最新发布。待采纳的[上游提交](https://github.com/cortexkit/magic-context/commit/70d3945bde0feb75a24e922880791f5fe7267823)没有改变保留的 SQLite/归一化约定。主动采纳源码或宿主变化后更新此表。

<a id="synchronize"></a>
## 同步时防止退役产品回流

先确保工作区干净或保存用户改动，再检查提交图和两个跟踪关系：

```sh
git status --short --branch
git remote -v
git branch -vv
git fetch --no-tags origin dsh_main origin_main
git fetch --no-tags upstream master
git log --oneline origin_main..upstream/master
git diff --stat origin_main..upstream/master
```

核查差异后，才快进完整镜像：

```sh
git switch origin_main
git merge --ff-only origin/origin_main
git merge --ff-only upstream/master
git switch dsh_main
git merge --ff-only origin/dsh_main
```

快进被拒绝时必须检查提交图，不能通过 reset 或强推掩盖分歧。在 `dsh_main` 仅迁入保留源码图相关的修复，并记录原始提交。只有所有改动路径都属于 DSH 保留范围时，才适合整提交 cherry-pick。例行合并完整镜像可能恢复退役适配器，不属于本工作流。

完成聚焦验证、明确需要发布仓库改动时，使用明确分支名推送：

```sh
git push origin origin_main
git push origin dsh_main
```

<a id="validation"></a>
## 选择相关检查

根[清单](package.json)、[原生包清单](packages/dsh-plugin/package.json)和 [DSH CI](.github/workflows/dsh.yml)维护实际命令。干净工作区使用默认单包路径：

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
```

| 改动范围 | 必要证据 |
|---|---|
| 双语 Markdown | `docs:check`、当前本地链接/锚点/示例、迁移校验值和 `git diff --check`。 |
| 记忆、工具或召回 | Node 行为测试、类型/lint、已记录的取消/回放/重启/fork 及原生压缩。 |
| SQLite | 实际 `node:sqlite` 绑定/事务测试、持久化失败、写竞争、重试及进程异常退出恢复。 |
| 清单、源码提取或构建 | 干净工作区默认冻结安装、`structure:check`、可移植声明、产物构建及隔离 tarball 启用。 |
| 资源或模型行为 | 等价基准负载及显式隔离 Ollama Cloud 十场景，记录版本和实际观测。 |

默认检查无需旧工作区、Cargo、兄弟仓库、本地推理模型或 DSH 专属文档命令。可选的已安装 DSH launcher 只用于 profile 级验收，tarball 无密钥运行验证使用已发布包。远程 CI 只能依据实际运行结果报告。

<a id="provenance"></a>
## 保留源码映射

| `6f718ff0` 上游来源 | 本地归属 | 保留约定 |
|---|---|---|
| [SQLite](https://github.com/cortexkit/magic-context/blob/6f718ff019bf327a0b291a8510dfb42f91b65921/packages/plugin/src/shared/sqlite.ts) | [sqlite.ts](packages/dsh-plugin/src/sqlite.ts) | Node 语句、绑定、事务模式和嵌套 savepoint。 |
| [归一化](https://github.com/cortexkit/magic-context/blob/6f718ff019bf327a0b291a8510dfb42f91b65921/packages/plugin/src/features/magic-context/memory/normalize-hash.ts) | [normalize.ts](packages/dsh-plugin/src/normalize.ts) | 关键词空白/大小写归一化，省略未使用的哈希函数。 |
| [分类](https://github.com/cortexkit/magic-context/blob/6f718ff019bf327a0b291a8510dfb42f91b65921/packages/plugin/src/features/magic-context/memory/types.ts) | [types.ts](packages/dsh-plugin/src/types.ts) | 保留相同的七个支持值。 |

[NOTICE](packages/dsh-plugin/NOTICE)还记录迁入回归的来源和省略的上游辅助代码。该子集持续纳入版本管理并可审查。专用化保持 DSH 数据库与 Session 格式稳定；回退采用 revert 或独立的已验收基线工作区，保留用户数据。
