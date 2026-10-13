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
| 已核查 `upstream/master` | `3cecbda11b1f29b3668d10be1bfdbce27a030915`，已镜像到本地 `origin_main`，并完成 [2026-10-13 合并](#sync-2026-10-13)的范围核查。 |
| DSH 包版本线 | 已发布 `0.1.5-rc.2`，Cordis `4.0.2`。 |
| 已核查 DSH 源码 | `7e4504856456f5298b8bc66299995ce8d86c3aa1`，兄弟工作区仅作可选集成参考。 |
| 本机工具 | Node `v24.18.0`、Bun `1.4.2`、macOS arm64。 |
| 包身份 | `@flyingcoding/dsh-magic-context@0.1.0-alpha.1`，`private: true`。 |

这些是已核查固定版本，不代表当前可用的最新发布。与上次合并相比，已同步的[上游提交](https://github.com/cortexkit/magic-context/commit/3cecbda11b1f29b3668d10be1bfdbce27a030915)中，[NOTICE](packages/dsh-plugin/NOTICE)列出的七个来源文件仅有上游 SQLite 包装层和 Node smoke 测试发生变化。其余五个来源未变化。下文记录了本次未迁入运行时变化的原因。主动采纳源码或宿主变化后更新此表。

<a id="sync-2026-10-13"></a>
## 2026-10-13 合并

按用户要求，本地 `origin_main` 从 `640eb0209` 快进到 `3cecbda11b1f29b3668d10be1bfdbce27a030915`，新增两个提交。从 `dsh_main` 上次合并点 `55cede0f60a8300e51b461b35ae24f7f306bd263` 起，上游新增 1,757 个提交、2,649 个改动路径。上游插件清单声明版本为 `0.48.0`，历史还包含 `0.49.0` 发布说明的草稿与定稿。随后以 `e53354e98` 之后的 DSH 状态为基础，通过保留专用树的合并纳入上游历史。

保留源码映射的核查结果：

- SQLite 包装层新增前台/后台写锁准入、等待预算与诊断、标签身份失效检测、线程外索引协调及 Bun 预编译语句释放。这些属于上游 transform、标签、维护和 Bun 范围。DSH 使用独立的 Node 包装层，没有这些模块，Node 自身会在关闭连接时释放语句，因此未迁入 SQLite 行为。
- 提交 `9ac069822` 仅在上游动态导入期间抑制 Node SQLite 实验警告。DSH 静态导入 `node:sqlite`；警告抑制属于宿主控制台展示调整，并非保留的绑定或事务修复，因此继续保留现有导入约定。
- Node smoke 测试调整上游 transform 等待预算下的短锁/长锁断言。其余五个已署名源码/测试来源未变化，包括归一化和七个分类值。
- 新增忽略规则和行尾规则对应上游 Rust 迁移探针及 Broca 夹具，位于专用工作区之外。上游适配器、Rust、dashboard、CLI 和 E2E 路径保留在镜像中。`packages/dsh-plugin`、清单、锁文件和 DSH CI 逐字节保持不变，包括之前的隔离安装依赖固定修复。

本次仅文档变化的合并使用 `bun run check`、`git diff --check` 和 Git 祖先/树比较验证。宿主依赖仍固定为 DSH `0.1.5-rc.2`、Cordis `4.0.2`；没有新增产物、模型验收或生产启用结论。历史产物证据仍保留在[专用化记录](docs/dsh/specialization.zh.md)。

<a id="sync-2026-09-29"></a>
## 2026-09-29 合并

按用户要求，本地 `origin_main` 从 `61c0f3b2582baa72fff45e7aa78557434d0daf76` 快进到 `55cede0f60a8300e51b461b35ae24f7f306bd263`。从 `dsh_main` 上次合并点 `4f9a3d1a4092bc2a7b914e071045cc54b7baea3e` 起，上游新增 1,072 个提交、1,243 个改动路径，包版本线推进到 `0.44.1`。随后以 `24292dcfb6f77b323834fd0bbe384a29972ebb59` 之后的 DSH 状态为基础，通过保留专用树的合并纳入上游历史。

保留源码映射的核查结果：

- 上游 SQLite 包装层和 Node smoke 测试在 `329c60aa4928c89b5f10ab87344a1c7c1afc6526` 与 `d50ba56d37cbda8407bf5d74c39a7a8000dfdbe6` 中加入前台 Magic Context transform 的写锁获取重试。DSH 维护独立的 Node 包装层，不存在该 transform 调用链，且已覆盖写锁竞争、失败回执和解锁后的重试测试，因此未迁入 SQLite 行为。
- 上游分类类型文件仅修改 Dreamer 整理流程的注释；DSH 使用的七个分类值未变化。归一化及其余三个已署名回归来源文件未变化。
- 新增的 `.gitignore` 规则对应已退役的上游数据、测试和构建目录，DSH 工作区不使用。`packages/dsh-plugin`、清单、锁文件和 CI 逐字节保持不变。

本次仅文档变化的合并使用 `bun run check`、`git diff --check` 和 Git 祖先/树比较验证。宿主依赖仍固定为 DSH `0.1.5-rc.2`、Cordis `4.0.2`；没有新增产物、模型验收或生产启用结论。历史产物证据仍保留在[专用化记录](docs/dsh/specialization.zh.md)。

<a id="sync-2026-09-21"></a>
## 2026-09-21 合并

按用户要求，本地 `origin_main` 从 `442d15ac082140326232d5d645aa09e614257f1c` 快进到 `4f9a3d1a4092bc2a7b914e071045cc54b7baea3e`。随后以 `6b557d61baa6cfe1b10a4ad29769c025043018a0` 之后的 DSH 状态为基础，通过保留专用树的合并将其历史纳入 `dsh_main`。这次明确要求的合并不改变下文的例行选择性迁入流程。

上游差异包含 424 个提交、542 个改动路径，上游包版本线已推进到 `0.42.6`。绝大多数改动属于已退役的 OpenCode、OpenCode 2、Pi/OMP、Rust、dashboard、CLI 和 E2E 范围。核查决定：

- DSH 树继续排除所有退役上游路径；完整源码保留在 `origin_main` 和合并历史中。
- 不采纳新增的 `.pure-replay-differential-*/` 忽略规则，因为其所属的 differential harness 不在专用仓库内。
- `packages/dsh-plugin`、清单、锁文件和 CI 逐字节保持不变。blob 对比确认七个已署名的上游源码/回归文件仍全部未变化，因此该区间没有需要迁入的运行时修复。

本次仅文档变化的合并使用 `bun run check`、`git diff --check` 和 Git 祖先/树比较验证。宿主依赖仍固定为 DSH `0.1.5-rc.2`、Cordis `4.0.2`；没有新增产物、校验值、模型验收或生产启用结论。历史产物证据仍保留在[专用化记录](docs/dsh/specialization.zh.md)。

<a id="sync-2026-09-13"></a>
## 2026-09-13 合并

按用户要求，本地 `origin_main` 从 `6f718ff019bf327a0b291a8510dfb42f91b65921` 快进到 `1bdaba3c4a8f978b1d670cd1176e3737d980f9ef`。随后以 `bec24dcdf24e1eec5c43de0897eb676f847ec517` 为 DSH 基线，通过保留专用范围的合并将其历史纳入 `dsh_main`。这次明确要求的合并不改变下文的例行选择性迁入流程。

上游差异包含 32 个提交、103 个改动路径，涉及 D5/Rust 编解码夹具、Historian/分块 embedding、Pi/OpenCode 状态和工具、发布说明及发布 E2E 安装。核查决定：

- 从 `70d3945bde0feb75a24e922880791f5fe7267823` 采纳 `.gitignore` 中的 `docs/private/` 规则。
- 保留 DSH 的 `STRUCTURE.md`；其他 101 个上游路径继续按已有退役范围排除，包括退役目录下的新增文件。完整源码保留在 `origin_main` 和合并历史中。
- `packages/dsh-plugin`、清单、锁文件和 CI 逐字节保持不变。七个已署名的上游源码/测试文件均未变化，因此该区间没有需要迁入的运行时修复。

本次文档/忽略规则合并使用 `bun run check`、`git diff --check` 和 Git 祖先/树比较验证。宿主依赖仍固定为 DSH `0.1.5-rc.2`、Cordis `4.0.2`；没有新增产物、校验值、模型验收或生产启用结论。历史产物证据仍保留在[专用化记录](docs/dsh/specialization.zh.md)。

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

2026-10-13 第一批：参考上游 `62d84e8a9` 的严格查询为空后备用召回策略，采用 DSH 自有编码词项、显式选择及多词重叠门槛；原始 SQL 和宿主逻辑未迁入。新增严格结果保留、中文问句、NUL、作用域、全局选择及归档回归。

2026-10-13 第二批：参考上游 `487850080` 的私有创建及存量权限收紧策略，实现 DSH 自有数据库条目检查；不递归修改目录树，保留自定义父目录权限并拒绝链接文件。新增宽权限恢复、侧文件、外来库及符号链接回归。

2026-10-13 第三批：参考上游 `f82cb0f04` 与 `083f1f804` 的让出式写锁准入，适配为 DSH 单连接的有界、可取消 BEGIN 重试。保留同步接口和 schema，工具及管理页面优先异步接口；不迁入前后台调度器。真实 SQLite 锁测试覆盖恢复、超时、取消、释放、容量限制及回执幂等。

本次三批在 macOS arm64、Node `v24.18.0`、Bun `1.4.2` 下分别通过 `bun run check`，测试数依次为 28、31、38；最终包含类型检查、lint、真实 Node SQLite 行为、会话回放/压缩、双语文档及单工作区检查。`git diff --check` 通过。数据库 schema、宿主版本固定值及 Session 投影身份未变；本次未运行构建、隔离产物安装、模型验收或性能基准，历史产物证据不代表本次源码。
