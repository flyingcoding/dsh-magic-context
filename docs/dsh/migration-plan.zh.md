---
description: "Magic Context 轻量原生记忆插件迁移至 DSH 的交接文档，包含核查依据、范围、实施阶段、数据导入和验收标准。"
status: "implemented"
owner: "flyingcoding/dsh-magic-context 维护者"
created: "2026-09-12"
updated: "2026-09-13"
promotion-target: "DSH 适配包 README 与兼容记录"
---

# Magic Context 迁移至 DSH：实施交接文档

[English](migration-plan.md) | 中文

<a id="summary"></a>
## 摘要

本文用于启动 DSH 原生记忆插件迁移，后续接手者无需重新完成首轮仓库调研。推荐首版保留 DSH 压缩（compaction），在本地保存精选长期记忆，不引入 MCP 或文档知识库。本文保留设计方案和有日期的调研基线。原生 alpha 已实现在 `packages/dsh-plugin/`，当前命令与验证证据见[包说明](../../packages/dsh-plugin/README.zh.md)和[兼容性记录](compatibility.zh.md)。

本文在 `flyingcoding/dsh-magic-context` 的 `dsh_main` 分支维护；原有完整源码树保留于 `origin_main` 镜像，当前产品已专用于 DSH。接手时先看[开发入口](README.zh.md)和[上游工作流](../../UPSTREAM.zh.md)。上游或 DSH 更新后重新核对证据；实现后的行为归入适配包 README，兼容结果与代码一并记录。

<a id="contents"></a>
## 目录

- [范围与推荐路线](#scope)
- [证据基线](#baseline)
- [拟议实现方案](#architecture)
- [适配工作](#adaptation)
- [资源目标](#resources)
- [数据导入与回退](#data)
- [实施阶段](#phases)
- [验收标准](#acceptance)
- [接手入口](#resume)
- [证据与源码索引](#sources)
- [开发备注](#dev-note)

-----

<a id="scope"></a>
## 范围与推荐路线

用户要求进程内原生插件，排除 MCP 接入和文档知识库产品，并优先降低资源占用。原生适配器已支持隔离安装、Node SQLite、可回放召回和 Web 管理页；正式 profile 启用与 npm 发布尚未执行。

| 范围 | 首版安排 | 原因 |
|---|---|---|
| 本地项目与用户记忆 | 纳入 | 跨会话保留偏好、决策、约束与经验教训。 |
| 原生工具与有预算的注入 | 纳入 | 写入可观察，召回不必加载全部记忆。 |
| DSH 现有历史检索 | 复用 | 避免再建一份完整 transcript（文本记录）存储与索引。 |
| Magic 历史替换与 Historian | 延后 | DSH 继续负责压缩及上下文超限恢复。 |
| Embedding、Dreamer、Rust/subc、配套桌面应用 | 延后 | 避免模型下载、辅助模型工作、常驻服务和另一套界面运行时。 |
| 文档导入、图谱知识库、自动改写项目文档 | 排除 | 超出本次记忆用途。 |
| 与 OpenCode/Pi/OMP 实时共用数据库 | 延后 | 先建立记忆语义与数据归属，再处理兼容共享。 |

原始工程建议是提供可独立安装的 DSH Bundle，复用 Magic 的部分记忆机制与源码组件；当前必要子集已由专用包本地维护。原生包已实现在 `packages/dsh-plugin/`。社区移植版用于参考接入方式与测试。只有轻量版证明召回有效且成本可接受后，才单独决定是否投入完整移植。如果 P0 表明无法以合理成本隔离出可复用的小范围源码，应记录结果，优先采用现有轻量原生记忆插件。

-----

<a id="baseline"></a>
## 证据基线

以下标识固定了 2026-09-12 的调研对象，用于复现依据，不表示实施时它们仍是最新版。

| 对象 | 已核查基线 | 证据级别 |
|---|---|---|
| Magic Context | `0.42.0`；`9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe` | README、配置、manifest（元数据清单）与部分源码；[E1–E4](#sources)。 |
| 开发 fork | `flyingcoding/dsh-magic-context`；`dsh_main` 开发，`origin_main` 跟踪上游。 | 调研基线具备完整 Magic 源码，并在 `origin_main` 保留；精确分支基线和待同步上游变化见 [UPSTREAM.zh.md](../../UPSTREAM.zh.md)。 |
| DSH 集成工作区 | `7e4504856456f5298b8bc66299995ce8d86c3aa1`；分支 `fix/session-query-cjk-memory` | 架构、Session、压缩、查询和提示词源码。 |
| 已安装 DSH 依赖线 | Web profile 中的 `@deepseek-ai/dsh-session-query@0.1.5-rc.2` | 读取了本地包清单及解析后的安装路径；未进行迁移插件运行测试。 |
| 社区 DSH 移植版 | 包版本 `0.1.2`；`6c82abd4d75c63516421c6e1692d1b7d1636b8e4`；最后提交 2026-08-21 | 声明基线为 DSH `0.1.0-rc.6`、Magic `0.36.1`、共享 schema `77`；[E5–E7](#sources)。 |
| 格式对照 | Magic 最新迁移编号 `84`；本地 DSH Session 写入版本 `3` | 两者描述不同存储，不能视为同一种版本。 |

社区移植版的测试通过及真实模型验证声明，属于作者针对旧基线提供的证据；本次没有复跑。资源建议是工程目标，不是测量结果；没有独立横向基准支持更低 RSS 或更低总模型成本的结论。

-----

<a id="architecture"></a>
## 拟议实现方案

首版在 DSH 现有 agent（智能体）生命周期中增加记忆能力。DSH 继续拥有对话历史及模型可见消息，插件只拥有精选的跨会话记忆。

| 组件 | 职责 | DSH 接入方式 |
|---|---|---|
| 记忆服务 | 解析范围、校验操作、执行预算限制并协调写入。 | Service Definition、Consumer 和存储实现首版可位于同一包。 |
| SQLite 存储实现 | 持久化精选记忆、修订版本、来源和导入记录。 | 每个拥有者服务一个连接；使用独立数据库，与 Session 及查询数据库分开。 |
| 工具 Consumer | 提供记住、召回、更新和遗忘操作。 | 通过 `ctx.tools` 注册，接入 DSH 权限及资源释放机制。 |
| 提示词 Consumer | 选择当前范围内的小型记忆快照，并在约定时点交付。 | 使用会被记录的提示词上下文或 `agent.inject()`；P0 验证具体接纳行为。 |
| 历史适配器 | 检索已有对话，按需读取有限证据。 | 复用 `ctx.sessionQuery`；选择方法前核查其真实读取成本。 |
| 生命周期投影 | 跟踪已交付记忆修订和符合条件的新事件。 | 使用已提交事件与 Session 投影；恢复时重建所需状态。 |
| 管理界面 | 查看、编辑、禁用和导出记忆。 | 使用受本地化管理的 DSH 设置页；Host 行为验证后再实现。 |

### 范围与存储记录

默认使用可信的当前工作区。用户全局偏好单独保存，写入全局范围必须明确选择。不要接受模型参数中的任意工作区路径。Magic 的 Git 根提交身份会在部分克隆、fork 和 worktree 间共享数据；只有明确了 DSH 的共享规则后才使用，不能隐式取代工作区身份。

拟议最小记录包括品牌化记忆 id、范围与工作区键、类别、简短正文、修订版本、创建及更新时间、生命周期状态和来源。来源记录原始 harness、Session id 与事件序号，或导入记录。区分 `active`、`superseded`、`archived`；纠错不能让旧记录被静默复活。去重限定在相同范围内，不能跨无关项目合并。

### 写入、注入与恢复

串行处理写入，并在返回工具成功前保证幂等。取消或响应丢失后的重试不能新增重复记录。记忆变更原子提交，模型可见工具结果沿用 DSH 常规记录流程。注册、定时器、队列和数据库句柄随所属 Cordis 生命周期释放。

最小版本在会话内冻结已选注入快照，较新的记录通过显式召回获得。即使记忆数据库变化，重启后也必须能重现当时注入的内容。请求在接纳前取消时，不能误标记快照已交付。禁止在 `llm/stream` 中改写历史消息，也不能用今天的数据库重算旧模型上下文。

只采集已经提交且符合条件的事件。自动采集应排除 fork 继承前缀及插件自己的辅助会话。游标和去重键应持久化。P0 必须证明恢复读取有界，或投影足以重建状态；异步 API 返回少量结果，不代表其内部不会加载完整日志。

### 自动记忆采集

Magic 通常在 Historian 处理历史时提升长期事实；关闭其压缩会移除这一主要提取路径。因此首版依赖当前 agent 可观察的记忆工具调用，用简短规则引导其处理明确的记住请求、纠错和已确认的可复用经验。后续可选提取器可以消费 DSH 压缩结果或符合条件的已完成轮次，但必须有明确的并发、队列、频率和 token 限制。默认不能每轮再运行一个总结器。

-----

<a id="adaptation"></a>
## 适配工作

可复用的设计比现有外部打包状态更成熟。以下是 P0 需要处理的具体发现，不代表兼容性已经修复。

| 发现 | 必要工作 | 验证方式 |
|---|---|---|
| 社区移植版将 `@magic-context/core/*` 指向其未包含的上游源码；初始完整 fork 包含该目录，DSH 专用产品现在本地维护必要子集。 | 通过可追踪的导入映射复用本仓库源码，审查仅记忆所需的依赖，并保留 MIT 声明。 | 干净构建不依赖外部兄弟源码目录，也不复制社区移植版编译文件；[E6](#sources)。 |
| 旧代码读取 `agent.session.events`，并对重建的文本记录求哈希。 | 用当前事件、投影和已验证的有界历史读取替换任意同步历史扫描。 | 恢复及长历史场景正确，且每步骤不会序列化完整历史；[E7](#sources)。 |
| 上游 harness id 为 `opencode`、`pi`、`omp`，模型设置按 harness 划分。 | 复用相关模块时明确增加 DSH 身份与模型映射，不能把 DSH 冒充 Pi。 | DSH 会话记录和模型路由不会串入其他 harness。 |
| DSH 要求模型可见内容被记录。 | 记忆注入使用框架接纳流程及来源标记，保持消息角色和工具配对有效。 | 重启、重放、取消和 fork 快照与模型收到的内容一致。 |
| DSH 已拥有历史查询和压缩。 | 轻量版复用这些能力；后续若替换，每个 agent 也只能有一个压缩拥有者。 | 不重复建立完整历史索引，不并行运行两个压缩管理器。 |
| 上游包依赖包含宿主界面和推理组件。 | 发布仅记忆所需的运行时依赖，可选后端延迟加载。 | 安装或启用轻量 Bundle 不下载模型，也不启动另一个宿主或常驻服务。 |

当前 DSH 已将 `eventAt()`、`snapshotEvents()`、`ownEvents()` 标记为禁止新增生产调用的弃用接口。当前实现仍保留完整事件序列；本文不宣称 DSH 已完成历史数据脱离内存的改造。新插件应避免重新引入这一依赖。参见[历史读取决策](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.zh.md)。

-----

<a id="resources"></a>
## 资源目标

中列保留已核查的上游配置，末列保留原始首版建议。实际 DSH 配置名和默认值以包说明为准；本地数值门槛见 [resource-budgets.json](resource-budgets.json)，观测结果见兼容性记录。

| 资源 | 已核查上游配置 | 拟议轻量目标 |
|---|---|---|
| 运行时 | `transform_mode="ts"`；Rust/subc 可选。 | 原生 Node 插件，不引入常驻服务。 |
| 历史管理 | `compaction.enabled=true`。 | 复用的 Magic 层设为 `false`；保留 DSH 压缩。 |
| Embedding | `provider="local"`；MiniLM 磁盘缓存约 90 MB。 | `provider="off"`；默认路径不加载 ONNX 或模型。 |
| SQLite 页缓存 | 每连接 `cache_size_mb=64`；`mmap_size_mb=0`。 | 一个拥有者连接，从 8 MiB 开始；关闭 mmap。 |
| 注入记忆 | `memory.injection_budget_tokens=4000`。 | 从 1,000 个估算 token 开始；单独记录框架文本及工具 schema 开销。 |
| 后台提取 | Historian 与可选 Dreamer。 | 默认不发起辅助提取调用；后续显式启用。 |
| 查询与缓存状态 | 上游各子系统不同。 | 初始建议：最多召回 5 条记忆、缓存 32 个查询、限制快照状态规模。 |

SQLite 缓存配置不是进程 RSS 实测值，模型下载体积也不是驻留内存。关闭 embedding 会失去语义匹配；宣称召回足够好之前，应验证中文、英文标识符、路径及中英混合查询。上游指出默认 MiniLM 的跨语言匹配较弱，因此引入 embedding 需要独立的质量与资源证据。

使用相同 DSH 修订、模型路由、语料、设置和主机，对比插件关闭与启用的运行。记录空闲及峰值 RSS、启动时间、请求前延迟、查询 p50/p95、输入/输出/缓存 token 总量、数据库与 WAL 大小、进程数及辅助调用数。冷启动与缓存查询分开测量，并包含长历史。P0 在测量前确定数值通过线；本文没有已通过的资源指标。

-----

<a id="data"></a>
## 数据导入与回退

代码移植与已有记忆导入是两个独立工作项。目前没有证据表明用户已有需要导入的 Magic 数据库。没有提供源数据时，将导入标为不适用，不要创建虚构的生产历史。

1. 盘点提供的源数据库、schema、拥有者运行时版本、项目和记忆数量。通过受支持的备份流程，或停止拥有者写入后取得一致备份；WAL 仍在写入时只复制主文件不能视为一致备份。
2. 从隔离备份读取。导出精选记忆记录及来源；首轮导入排除原始对话、向量、分层摘要、调度状态、缓存和凭据。
3. 将每个源项目映射到明确选择的 DSH 工作区或全局范围。目标写入前预览数量、重复项、过期项、不支持的字段及未解决的映射。
4. 通过有界事务导入独立目标记忆数据库。使用源身份及记录 id/修订作为幂等键；导入记录应保存源哈希、映射、数量、失败项和目标 id。
5. 验证重启持久性、范围隔离、重复导入幂等及代表性召回。保持源备份不变。精选记忆导入不能宣称为完整 Magic 会话迁移。

回退首先禁用新 Bundle，并恢复之前的 profile 组合。保留 DSH 会话日志和源备份。需要回退记忆数据时，应一致地恢复目标数据库，并处理导入后的用户编辑，不能盲目删除整个导入批次。安装或卸载插件不能自动删除用户记忆。

实时共享数据库支持延后。启用前需要验证 Magic 的 schema 版本检查、每个并发宿主的版本、harness id 支持、迁移归属及降级行为。旧移植版对 schema 77 的声明，不能作为连接上游 schema 84 数据库的依据。

-----

<a id="phases"></a>
## 实施阶段

按依赖顺序逐阶段执行。P0–P4 轻量版本已实现并通过兼容性矩阵所列验收，[DSH 专用化精简](dsh-only-plan.zh.md)也已完成，P5 仍为需要另行确认需求的可选扩展。下列交付物归入本仓库；[首次发布基线](README.zh.md#p0)汇总已验收范围。

| 阶段 | 前置条件 | 工作及交付物 | 完成证据 |
|---|---|---|---|
| P0：可复现可行性核查 | 本交接文档 | 使用已准备的仓库和分支基线，确认下游包名、源码复用、依赖闭包、支持的 DSH 版本、读取/注入 API 和资源通过线；主动采纳上游更新后更新 `UPSTREAM.md`，将探测结果记入兼容矩阵。 | 干净源码构建和隔离组合探测证明存在可维护路径；所有未解决 API 或构建输入明确列出。 |
| P1：记忆服务与工具 | P0 | 实现范围记录、原子/幂等写入、修订冲突、生命周期处理和原生工具。 | 重启、重复请求、并发编辑、非法输入和跨工作区用例通过聚焦测试。 |
| P2：可记录召回与采集引导 | P1 | 加入有界选择、记录型注入、冻结快照、恢复/fork 处理和简短记忆使用规则。 | 新会话召回已确认事实；取消及重放保留交付内容；不重新引入旧事实或重复采集继承事件。 |
| P3：原生历史与可选导入 | P2 | 历史证据通过 DSH 查询能力读取；仅在存在真实源数据时实现导入流程。 | 查询提供可用来源位置；导入预览、重跑、范围映射和回退通过验证，或明确不适用。 |
| P4：打包、界面与验收 | P3 | 构建声明的原生 Bundle，编写配置和支持范围文档，增加简洁管理页，并执行验收矩阵。 | 发布产物在隔离 profile 中干净安装；原生压缩共存、功能召回及资源测量证据齐全。 |
| P5：可选扩展 | P4 验收证据及明确需求 | 分别评估受控提取、embedding、跨宿主共享或完整上下文管理。 | 每项扩展改善约定指标，且不破坏重放、隔离或资源目标。 |

如果无法隔离上游内部依赖、缺少必要恢复读取能力，或宿主版本维护成本高于记忆收益，P0 可以收窄或停止迁移。应记录具体发现与替代方案，不能静默替换 DSH 生命周期或关闭不变量检查。一个有用的首版不要求完成 P5。

-----

<a id="acceptance"></a>
## 验收标准

实施负责人需要保留下列场景的可复现证据。仅单元测试通过或进程正在运行不足以验收。这些条目定义验收覆盖，当前原生 alpha 的实测结果见兼容性记录；未提供源数据时导入不适用。

| 领域 | 必须观察到的结果 |
|---|---|
| 跨会话使用 | 会话 A 保存唯一项目事实；全新会话 B 不复制对话即可召回并使用；重启后仍成立。 |
| 隔离与纠错 | 其他工作区默认不能召回该事实；显式全局偏好可复用；纠正后的事实替代旧事实。 |
| 重放与 fork | 注入内容可从 DSH 日志恢复；取消不会错误推进交付状态；fork 不重复采集继承内容。 |
| 原生组合 | 仅目标 profile/预设增加约定能力；DSH 压缩仍正常；不启动 MCP 子进程或额外常驻服务。 |
| 生命周期失败 | 重载/释放后资源归还；重复写入幂等；持久化失败不能返回成功；可选提取不可用不阻塞普通聊天。 |
| 中文检索 | 覆盖中文短语、代码符号、文件路径、精确错误文本、中英混合、无关问题及过期事实。 |
| 资源增长 | 对比短/长会话及至少 1,000、10,000 条记忆；区分存储记录增长与每步骤历史扫描的成本。 |
| 数据导入 | 一致源副本可复现导入；重跑不新增重复；未解决映射在写入前失败；回退保留后续用户工作。 |
| 发布产物 | 构建包通过声明的 Bundle 安装并激活；全新安装不依赖开发者本机兄弟目录。 |

非平凡模型可见行为应增加聚焦行为测试和不需要密钥的录制会话证据。本 fork 使用 [UPSTREAM.zh.md](../../UPSTREAM.zh.md#validation)所选的 Bun 包脚本。如果改动同时涉及 DSH 宿主的共享事件、生命周期或 agent loop（智能体循环），则在宿主工作区遵循其[测试规范](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/testing.zh.md)及 TypeScript/Python SDK 投影要求。只记录实际执行的命令；本 fork 不继承 DSH 的 `pnpm run doc-sync` 命令。

-----

<a id="resume"></a>
## 接手入口

继续实现时，先阅读当前包说明与兼容性记录；宿主或上游输入变化后，再按下列 P0 顺序重新核查。在本仓库维护证据，不把本文变成第二套持续变化的任务队列。

1. 阅读本文及链接的 DSH 架构、Session 读取规则和测试规范；核对工作区与实际运行时/profile 版本。
2. 刷新上游及社区移植版信息，对比固定提交；先记录新增差异，再选择实施基线。
3. 在本 fork 的 `dsh_main` 上工作；安装可选推理或界面包前核对上游输入和本地记忆导入关系，不再另建第二个适配仓库。
4. 在隔离 profile 中验证最小原生 Bundle、可记录记忆注入和有界状态恢复；此阶段保持用户现有 Web profile 可用。
5. 记录 P0 结论、所选配置、未解决输入、下一阶段和实际检查；按这些结论确定的有限迁移范围继续。

-----

<a id="sources"></a>
## 证据与源码索引

调研链接固定到已核查提交。DSH 引用指向独立核查的宿主提交，不再使用相对于 Magic fork 的路径。本 fork 的实时源码索引见[开发入口](README.zh.md#source-map)。源码和所属规范优先于这份有日期的计划。

| 编号 | 来源与用途 |
|---|---|
| E1 | [Magic README](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/README.md)：功能范围、支持宿主和存储。 |
| E2 | [Magic 配置](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/CONFIGURATION.md)：关闭压缩、embedding、Dreamer 和资源配置。 |
| E3 | [OpenCode 包](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/package.json)与 [Pi 包](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/pi-plugin/package.json)：导出、依赖和构建输入。 |
| E4 | [配置 schema](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/src/config/schema/magic-context.ts)、[迁移](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/src/features/magic-context/migrations.ts)及 [harness 身份](https://github.com/cortexkit/magic-context/blob/9dc6b4ae009b264a0f7ac2c1b2c0169dbcdfbdfe/packages/plugin/src/shared/harness.ts)：源码默认值、schema 版本与支持的 id。 |
| E5 | [移植版功能](https://github.com/xiaohj233/dsh-magic-context/blob/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/docs/FEATURES.md)及[包清单](https://github.com/xiaohj233/dsh-magic-context/blob/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/packages/dsh-plugin/package.json)：声明的功能对齐、验证基线和 peer 固定版本。 |
| E6 | [移植版 tsconfig](https://github.com/xiaohj233/dsh-magic-context/blob/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/packages/dsh-plugin/tsconfig.json)：源码别名构建依赖。 |
| E7 | [移植版源码目录](https://github.com/xiaohj233/dsh-magic-context/tree/6c82abd4d75c63516421c6e1692d1b7d1636b8e4/packages/dsh-plugin/src)：`agent/transcript.ts`、`agent/context-plane.ts`、`agent/coordinator.ts` 分别提供历史读取、变换及记录型替换依据。 |
| D1 | [DSH 架构](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/architecture.zh.md)与[格式权威](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/session-format-status.zh.md)：组合、模型输入记录与 Session 版本。 |
| D2 | [Session 实现](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/core/session/src/index.ts)与[读取规则决策](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/.agents/notes/implemented/architecture/2026-09-09-deprecate-synchronous-session-event-reads.zh.md)：当前事件读取及弃用规则。 |
| D3 | [系统提示词](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/core/system-prompt/README.zh.md)与 [Session 投影](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/docs/subsystems/session-projection.zh.md)：注入与增量状态归属。 |
| D4 | [Session 查询](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/session-query/session-query/README.zh.md)与 [SQLite 检索](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/session-query/session-query-sqlite/README.zh.md)：查询复用及真实读取成本限制。 |
| D5 | [压缩接口](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/compaction/compaction/src/index.ts)与[基础实现](https://github.com/flyingcoding/deepseek-harness/blob/7e4504856456f5298b8bc66299995ce8d86c3aa1/packages/compaction/compaction-basic/README.zh.md)：首版保留原生拥有者。 |

-----

<a id="dev-note"></a>
## 开发备注

<details>
<summary>发布边界与后续可选扩展</summary>

- 下游包名为 `@flyingcoding/dsh-magic-context`，验证使用隔离 profile，并与上游包保持独立发布身份。
- 确认是否实际需要跨 worktree 或跨 harness 共享；此前默认工作区隔离。
- SQLite、检索归一化及分类类型已形成最小复用子集；具体原因记录于兼容性文档。
- 已验证工具驱动的捕获、恢复和接纳；后台自动提取仍需要独立需求与预算。
- 资源门槛与观测已单独记录；未提供真实源数据库，因此导入不适用。

</details>
