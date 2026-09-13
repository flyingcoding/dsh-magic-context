# DSH 开发入口

[English](README.md) | 中文

本目录维护 DSH 原生记忆项目的计划与证据。`packages/dsh-plugin/` 是唯一工作区，提供本地长期记忆、有预算的可回放召回和 DSH Web 设置页，压缩继续由宿主管理。

| 阅读入口 | 用途 |
|---|---|
| [原生包](../../packages/dsh-plugin/README.zh.md) | 构建、安装、配置和使用私有 alpha。 |
| [兼容性记录](compatibility.zh.md) | 初始验收输入、行为观测、模型/资源结果和限制。 |
| [DSH 专用化计划](dsh-only-plan.zh.md) | 源码迁出、移除范围和专用化验收顺序。 |
| [迁移交接](migration-plan.zh.md) | 首次发布的历史设计、范围、P0–P5 阶段和可选导入。 |
| [上游工作流](../../UPSTREAM.zh.md) | 源码固定版本、完整镜像维护和选择性修复迁入。 |
| [架构](../../ARCHITECTURE.zh.md)与[布局](../../STRUCTURE.zh.md) | 当前 DSH 运行约定与文件归属。 |
| [Agent 约定](../../AGENTS.md) | 长期实施规则。 |

<a id="p0"></a>
## 首次发布基线

P0–P4 已实现，带日期的验收保留在[兼容性记录](compatibility.zh.md)。该基线验证了隔离 Node SQLite 存储、已提交注入、取消、重启/回放、fork、新会话召回、压缩、Web 管理及十个真实模型场景，并定义[资源门槛](resource-budgets.json)与 1,000/10,000 条记录负载。

原有完整源码树属于准备输入。完整历史保留在 `origin_main`，`dsh_main` 现在维护专用包。正式 profile 启用、npm 发布、真实数据导入和可选 P5 功能仍是独立工作项。

<a id="next-phase"></a>
## DSH 专用化

[计划](dsh-only-plan.zh.md)固定了专用化前盘点和验收标准。保留源码已归入 DSH，根命令仅面向一个工作区，上游发布/宿主设施已退役。新验收证据必须区分仓库/依赖节省与运行 RSS，并使用等价负载比较；历史测量保留，不覆盖。

<a id="source-map"></a>
## 保留源码映射

| 范围 | 当前归属 | 约定 |
|---|---|---|
| SQLite | [sqlite.ts](../../packages/dsh-plugin/src/sqlite.ts) | Node 语句、参数绑定、immediate 事务与嵌套 savepoint。 |
| 归一化 | [normalize.ts](../../packages/dsh-plugin/src/normalize.ts) | 检索大小写/空白归一化；写入去重保持大小写敏感。 |
| 分类与记录 | [types.ts](../../packages/dsh-plugin/src/types.ts) | 稳定的七分类词表、作用域、修订和来源。 |
| 持久化与检索 | [store.ts](../../packages/dsh-plugin/src/store.ts)、[tokenize.ts](../../packages/dsh-plugin/src/tokenize.ts) | DSH 自有 schema 和有上限的字面 FTS 查询。 |
| 模型输入 | [recall.ts](../../packages/dsh-plugin/src/recall.ts)、[tools.ts](../../packages/dsh-plugin/src/tools.ts) | 可回放入场、恢复与可观察的记忆操作。 |
| 源码署名 | [NOTICE](../../packages/dsh-plugin/NOTICE)、[上游映射](../../UPSTREAM.zh.md#provenance) | 精确原始路径/提交及下游省略范围。 |

DSH 宿主属于独立集成仓库，已核查版本由[迁移交接](migration-plan.zh.md#sources)链接。正常开发和产物安装使用已发布依赖，无需兄弟工作区。社区移植继续作为历史参考资料。

<a id="layout"></a>
## 包归属

`packages/dsh-plugin/` 维护 Bundle、Cordis 服务/provider/消费者、Host 生命周期、测试、构建脚本和可选 Web 界面。本地源码子集足以生成声明和运行包。新增运行能力必须保持 DSH 模型输入可回放、状态有界，并单独定义范围与验收。

<a id="maintenance"></a>
## 维护双语证据

同步更新英文/中文配对，并在根目录执行 `bun run docs:check`。新观测归入 `evidence/` 下的日期记录，包含精确源码、宿主、产物校验值与命令。初始迁移交接保留 Git blob 校验记录，修改配对后更新两个值。本仓库没有安装宿主专属文档命令。
