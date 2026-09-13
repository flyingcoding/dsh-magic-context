# DSH 适配开发入口

[English](README.md) | 中文

本目录维护完整 `flyingcoding/dsh-magic-context` fork 的 DSH 适配规划。目标是轻量原生 Cordis Bundle：本地长期记忆、有预算的召回，以及由 DSH 负责的压缩。原生 `0.1.0-alpha.1` 包现位于 `packages/dsh-plugin/`，安装与行为证据独立于初始规划记录。

| 阅读入口 | 用途 |
|---|---|
| [原生包说明](../../packages/dsh-plugin/README.zh.md) | 当前 alpha 的构建、安装、配置和使用方式。 |
| [兼容性记录](compatibility.zh.md) | 已验证宿主版本、回放和模型测试、资源测量及限制。 |
| [迁移计划](migration-plan.zh.md) | 范围、架构、P0–P5 阶段、数据导入、资源目标和验收。 |
| [上游工作流](../../UPSTREAM.zh.md) | 远端、分支职责、源码基线、待同步变化、同步流程和检查选择。 |
| [Agent 工作约定](../../AGENTS.md) | 本 fork 的简短执行规则。 |
| [上游架构](../../ARCHITECTURE.md)与[源码布局](../../STRUCTURE.md) | 选择复用组件前理解现有 Magic 运行时。 |

<a id="p0"></a>
## P0 准备情况

此清单区分仓库准备和行为验证。准备项完成不代表适配器可用。

- [x] 已具备完整官方源码 fork，包括 `packages/plugin/src/` 下可复用的记忆源码。
- [x] `dsh_main` 跟踪 `origin/dsh_main`；`origin_main` 跟踪 `origin/origin_main`。
- [x] 已配置官方 `upstream` 远端并拉取其 `master` 引用。
- [x] 迁移计划已归入本仓库，DSH 源码引用已改为可独立访问的链接。
- [x] 准备时确认 Node `v24.18.0`、Bun `1.3.5` 可用，且存在 `bun.lock`。
- [x] 已审查上游差异，选择 `6f718ff019bf327a0b291a8510dfb42f91b65921` 为实现基线。
- [x] 已审查默认导入图：复用 SQLite、文本归一化和分类类型，不导入完整上下文管理器。
- [x] 已创建 `@flyingcoding/dsh-magic-context`，明确存储、工具、召回和可选客户端的职责。
- [x] 已接入按 workspace 过滤安装、Node 类型/行为检查、构建检查、根脚本与独立 CI。
- [x] 已在隔离环境验证提交后注入、取消、真实持久化 Session 恢复、fork 和新会话召回。
- [x] 已确定数值预算，并测量 1,000 / 10,000 条记忆及短/长 Session 日志。

P0 的可行性问题已形成原生实现路径。验收状态以[兼容性记录](compatibility.zh.md)为准，当前行为见[包说明](../../packages/dsh-plugin/README.zh.md)。正式 profile 启用和 npm 发布仍属于独立发布动作。

<a id="source-map"></a>
## 适配源码索引

以下链接均指向现有上游文件。先检查导入依赖，再复用小范围内部模块；`memory/index.ts` 聚合入口同时导出 embedding 模块，不能直接视为轻量入口。

| 领域 | 现有源码 | P0 要解决的问题 |
|---|---|---|
| 记忆记录 | [storage-memory.ts](../../packages/plugin/src/features/magic-context/memory/storage-memory.ts)、[types.ts](../../packages/plugin/src/features/magic-context/memory/types.ts) | 哪些记录、修订和生命周期行为可在不导入完整上下文管理器的情况下复用？ |
| 本地关键词检索 | [storage-memory-fts.ts](../../packages/plugin/src/features/magic-context/memory/storage-memory-fts.ts) | 关闭 embedding 后，中文、标识符和路径如何匹配？ |
| SQLite 与迁移 | [sqlite.ts](../../packages/plugin/src/shared/sqlite.ts)、[migrations.ts](../../packages/plugin/src/features/magic-context/migrations.ts) | 使用 Node 后端时，DSH 记忆库能否保持小规模和独立？ |
| 身份与配置 | [harness.ts](../../packages/plugin/src/shared/harness.ts)、[project-identity.ts](../../packages/plugin/src/features/magic-context/memory/project-identity.ts)、[配置 schema](../../packages/plugin/src/config/schema/magic-context.ts) | 哪些 DSH 身份与模型路由字段需要明确补充？ |
| 已有宿主适配 | [Pi 入口](../../packages/pi-plugin/src/index.ts)、[Pi tsconfig](../../packages/pi-plugin/tsconfig.json) | monorepo 如何在复用源码时保持宿主接入独立？ |
| 工具行为 | [ctx-memory](../../packages/plugin/src/tools/ctx-memory/tools.ts)、[ctx-search](../../packages/plugin/src/tools/ctx-search/tools.ts) | 原生 DSH 工具应保留哪些行为，并由 DSH 管理 schema 和记录？ |

DSH 宿主是独立的集成仓库，本机位于兄弟目录 `../deepseek-harness`。已核查源码的固定链接见[迁移计划](migration-plan.zh.md#sources)。旧的 `xiaohj233/dsh-magic-context` 社区移植版只作为参考，不是本仓库上游。

<a id="layout"></a>
## 包的职责

`packages/dsh-plugin/` 拥有原生 Bundle、Cordis 服务/存储/消费者、Host 生命周期和可选的 DSH Web 客户端接入。在可行时保留可复用源码的上游位置；记录每处共享文件改动，并运行已有消费者的检查。不要把社区移植版编译后的 `dist/` 复制进本 fork。

<a id="maintenance"></a>
## 开发文档维护

英文和中文文档同步更新。迁移计划保留了可独立核对的 Git blob 校验记录；修改两种语言后，使用 `git hash-object docs/dsh/migration-plan.md` 和 `git hash-object docs/dsh/migration-plan.zh.md` 刷新记录值。记录确认的是内容身份，不是运行正确性。本 fork 没有安装 DSH 专属文档命令。
