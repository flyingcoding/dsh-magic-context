# DSH 原生适配兼容性记录

[English](compatibility.md) | 中文

本文保留 `@flyingcoding/dsh-magic-context@0.1.0-alpha.1` 在专用化前的初始验收证据，范围为 `dsh_main` 已提交的轻量原生记忆实现，精确版本见下表。交付物为私有本地安装包，正式 profile 启用和 npm 发布属于独立动作。以下结论对指定夹具、版本和机器具有高置信度，适用限制列于文末。

当前 DSH 专用化结果见[专用化验收](specialization.zh.md)，本文保留初始 alpha 的测量。

## 可复现输入

| 输入 | 已核对值 |
|---|---|
| Magic 源码基线 | `6f718ff019bf327a0b291a8510dfb42f91b65921`，版本线 `0.42.0`。 |
| 原生实现与验证脚本 | `dsh_main` 的 `be3e1f871b4af0afc54e83925544dad8bf60b525`；双语文档独立记录。 |
| DSH 包测试 | 已发布的 `0.1.5-rc.2` peers，Cordis `4.0.2`。 |
| 已审查 DSH 源码 | 兄弟集成仓库的 `7e4504856456f5298b8bc66299995ce8d86c3aa1`。 |
| CLI / Web 验证 | 已安装的 DSH `0.1.5-rc.2`，通过受支持的 `dsh --profile` 启动。 |
| 运行时与工具 | macOS arm64、Node `v24.18.0`、Bun `1.3.5`。 |
| 真实模型 | 正式配置的 Ollama Cloud 路由 `https://ollama.com/v1`，模型 `deepseek-v4.1-flash`；已在认证后的 Cloud 模型目录中确认该 ID。 |
| 凭据 | 仅将已有 `OLLAMA_API_KEY` 引用复制到私有隔离 home，凭据值不进入仓库或报告。 |
| 上游待同步项 | `70d3945bde0feb75a24e922880791f5fe7267823` 仅修改文档/忽略规则，未纳入固定源码基线。 |

已发布 DSH 包与被审查 fork 在相同 prerelease 标签下仍可能存在差异。例如已发布包的 resume 测试参数为 `resumeSessionId`，被审查源码为 `sessionId`；生产适配器不调用该 factory API。因此包测试与实际 profile 验证分别标明运行时。

## 范围与源码选择

| 关注点 | 实现决策 | 证据 |
|---|---|---|
| 源码复用 | 复用 SQLite 封装、检索文本归一化，以及仅供类型使用的分类定义。 | [NOTICE](../../packages/dsh-plugin/NOTICE)，`store.ts`、`tokenize.ts`、`types.ts` 的导入。 |
| 依赖闭包 | 避开上游 memory 聚合入口、存储/embedding 缓存导入链、完整上下文管理器、界面及推理运行时。 | Node 产物检查、过滤安装与独立 tarball 探测。 |
| 原生职责 | 一个存储 provider、四个工具、召回消费者和可选 Web 管理接口。 | [Bundle patch](../../packages/dsh-plugin/cordis.patch.yml)、[服务定义](../../packages/dsh-plugin/src/service.ts)。 |
| 身份 | Session 所属真实工作区路径，显式全局写入及 DSH 来源。 | 工作区/纠错测试和真实模型隔离场景。 |
| 入场 | 通过 `agent/pre-step` 提交候选上下文，仅由宿主的 user-message 日志路径确认送达。 | 取消、拒绝入场和 request-series 测试。 |
| 恢复 | 固定规模的投影仅保留已送达消息 ID，内容保存在 Session 日志。 | 持久化会话测试及[已提交回放夹具](../../packages/dsh-plugin/tests/fixtures/memory-session.v3.json)。 |
| 历史 | 引导智能体使用现有 DSH 查询工具，不重复存储对话，也不逐步扫描完整历史。 | 工具指导语及源码导入/读取审查。 |
| 压缩 | 保留 DSH 原生拥有者，验证替换历史并继续对话。 | [原生压缩测试](../../packages/dsh-plugin/tests/compaction.test.ts)。 |
| 导入 | 不适用：未提供既有 Magic 数据库。 | 未启用导入代码，也未改动原始数据。 |

上游 FTS 存储模块会导入较大的 memory store、embedding cache 和 mural helpers，因此适配器采用独立小型 schema 与字面 FTS 词项索引。写入去重保留标识符大小写，检索继续做大小写归一化。没有修改共享 Magic 源码文件。原生版本不缓存查询结果，仅复用固定的 SQL prepared statements。

## 验收矩阵

| 领域 | 观测 | 结果 |
|---|---|---|
| Node SQLite | 实际使用 `node:sqlite`，验证重启、DB/WAL/SHM 私有权限及非本库 schema 拒绝。 | 通过。 |
| 原子写入 | 记录、FTS、修订与回执一起提交，强制回执失败可整体回滚。 | 通过。 |
| 重试和并发 | 重复请求结果稳定，参数变化与旧修订被拒绝，锁释放后可原请求重试。 | 通过。 |
| 进程异常退出 | 写入提交后强制终止，重新打开并重试不生成重复记录。 | 通过。 |
| 作用域 | 其他工作区不能召回或按 ID 修改记录，全局偏好要求显式写入。 | 通过。 |
| 修正与归档 | 已替代/已归档内容不再参与检索，历史修订仍可检查。 | 通过。 |
| 中文和代码检索 | 中文子串、驼峰标识符、路径、错误词、中英混合及无关查询。 | 通过。 |
| 取消入场 | 请求正式入场前取消，不写快照，也不提前标记送达。 | 通过。 |
| 恢复和 fork | JSONL 重启及不可变夹具保留原始文本，fork 不重复采集。 | 通过。 |
| 原生压缩 | DSH 写入 summary/end 标记并替换历史，继续对话时不重复注入记忆。 | 通过。 |
| 资源生命周期 | 释放 provider 后关闭连接，后续调用失败而不是重新打开。 | 通过。 |
| 安装包 | 在 monorepo 外安装，驱动真实 AgentLoop，执行客户端 factory，组合 Bundle。 | 通过。 |
| Web 管理 | 设置入口、作用域列表、修订 2 保存、修订 3 归档、JSON 下载。 | 桌面 Web 页面通过。 |
| 真实模型 | 使用已配置 Ollama Cloud 模型完成十个合成场景。 | 通过，详见下文。 |

原生套件包含 18 个聚焦测试，上游 SQLite/import/bind 与归一化套件也已通过（7 个测试），并通过了上游 OpenCode 包自身的 typecheck 和 lint。由于未改动 OpenCode/Pi 接入或共享源码，没有执行它们完整的真实模型端到端套件。

## 资源测量

数值门槛在测量前写入 [resource-budgets.json](resource-budgets.json)。每种数据规模使用独立进程；基线已经包含相同 DSH 服务及拥有 100 / 10,000 条合成记账事件的 Session，启用阶段增加构建后的 provider、工具/指导语和召回消费者。查询与快照各采样 100 次，从而将适配器开销与宿主原始历史的建立成本区分开。

| 指标 | 1,000 条记忆 | 10,000 条记忆 | 门槛 |
|---|---:|---:|---:|
| 打开存储 | 1.99 ms | 2.18 ms | ≤100 ms |
| 查询 p50 | 0.224 ms | 0.709 ms | 记录 |
| 查询 p95 | 0.279 ms | 0.749 ms | ≤25 ms |
| 快照选择/渲染 p95 | 0.226 ms | 1.209 ms | ≤25 ms |
| 包含框架的快照估算 | 823 tokens | 826 tokens | ≤1,000 |
| 基线 RSS | 121.66 MiB | 103.66 MiB | 记录 |
| 启用后空闲 RSS | 123.20 MiB | 105.39 MiB | 记录 |
| 峰值 RSS | 132.69 MiB | 150.56 MiB | 记录 |
| 新增峰值 RSS | 11.03 MiB | 46.91 MiB | ≤64 MiB |
| 快照投影状态 | 52 bytes | 52 bytes | ≤128 bytes |
| 新增长期驻留进程 | 0 | 0 | 0 |
| 辅助模型调用 | 0 | 0 | 0 |

空快照框架为 62 个估算 token，常驻指导语为 303，四个工具 schema 为 1,060；指导语与 schema 不包含在 1,000-token 的快照预算内。一万条记忆时，召回消费者在 100 条历史之后的 pre-step p95 为 0.033 ms，在 10,000 条历史之后为 0.029 ms。数据库大小为 28,983,296 bytes，活动 WAL 为 4,223,032 bytes。这些是合成本地负载的实测，不代表整个 Web 进程的上限，也不是与上游 Magic 的对比基准。

适配器没有任意同步 Session 历史读取。宿主建立投影时仍可能折叠一次已有历史，而且宿主仍保留完整 Session 数据；52 bytes 仅指本插件投影。磁盘使用随精选记忆、修订和持久化操作回执增长。

## 真实 Ollama Cloud 观测

十次 headless 运行各自启动独立进程，并使用全新的合成工作区。只在隔离 home 中复用正式环境的 Ollama Cloud provider/model 与所需凭据引用，停用了标题生成行，没有使用本地 Ollama daemon。为了验证历史引用，验收 profile 还显式安装并挂载了官方 `dsh-tool-session-query`，将原生全文检索设为 `openAt: first-search`；记忆 Bundle 不会默认开启它们。

| 场景 | 要求的观测 | 记录结果 |
|---|---|---|
| 保存 | 通过真实原生工具保存传入的随机标记。 | `memory_remember`，修订 1。 |
| 新会话召回 | 新进程/新会话的提示词中不提供该标记。 | 返回完全相同的原始标记。 |
| 隔离 | 另一个工作区无法召回标记。 | 明确回答不知道，未出现其他工作区标记。 |
| 修正 | 先召回当前 ID/修订，再更新同一条记录。 | `memory_update`，修订 2，无重复记录。 |
| 修正后召回 | 全新会话使用新标记。 | 返回准确新值，不包含旧值。 |
| 归档 | 归档当前修订。 | `memory_forget`，修订 3，状态 archived。 |
| 归档后召回 | 全新会话中没有有效匹配事实。 | 明确回答不知道。 |
| 原生历史引用 | 检索并读取真实历史事件，给出准确 Session ID / seq。 | 官方查询工具返回来源，引用内容与原始日志一致，记忆仍保持归档。 |
| 全局写入 | 显式选择 global 保存唯一偏好。 | `memory_remember` 写入全局作用域。 |
| 全局召回 | 另一工作区读取该全局偏好。 | 返回完全相同的标记。 |

最终完整一轮共用时 61.1 秒，发生 24 次正常模型请求。DSH 报告的 `inputTokens` 合计 160,224、已上报 `cacheReadTokens` 合计 305,664、`outputTokens` 合计 3,152，`totalTokens` 合计 469,040。这些是 provider 上报计数，不是费用估算，包含完整 DSH 提示词和工具集合。

## 已修复的构建与浏览器问题

- Bun 1.3.5 在 store 同时作为入口和拆分依赖时产生重复导出。Host 改为不拆分构建，并执行 `node --check`；旧产物目录不会混入新包。
- 初始客户端引用了 DSH 模块表不提供的 `react/jsx-dev-runtime`。现已显式使用生产 JSX，并拒绝该开发导入；安装后还会按宿主支持的 React 模块集合执行 factory。
- 导出 object URL 保留到下次替换或组件释放。浏览器确实生成了包含已修订记录的 `dsh-memory-export-v1` JSON；内置下载事件观察器超时，因此直接检查下载文件作为权威结果。

隔离回环地址上的实际 DSH Web 页面已正常显示记忆设置，完成修改和归档。修复后重载期间的控制台没有新增错误或警告。先前的加载失败和预期重连消息来自已替换的预览构建，不当作当前故障。

## 历史命令与保留证据

机器可读摘要见[验收证据](evidence/2026-09-13-acceptance.json)。以下命令曾在原始 `be3e1f87` 源码树执行，复现时使用该基线工作区；当前 DSH 专用命令见[根指南](../../README.zh.md)。包内被忽略的 `.cache/` 回执保留准确安装包路径、原始测量、模型计数和 Session 日志位置，数据均为合成事实，不是用户历史对话。

```sh
bun run check:dsh
bun run --cwd packages/plugin typecheck
bun run --cwd packages/plugin lint
bun test packages/plugin/src/shared/sqlite.test.ts packages/plugin/src/shared/sqlite-bind-style.test.ts packages/plugin/src/shared/sqlite-import-fence.test.ts packages/plugin/src/features/magic-context/memory/normalize-hash.test.ts
bun run --cwd packages/dsh-plugin build
bun run --cwd packages/dsh-plugin test:install
bun run --cwd packages/dsh-plugin benchmark
```

真实模型验收在原生包目录运行 `bun run test:live`，并通过 `DSH_MEMORY_TEST_HOME` 指定已配置的隔离 home。夹具、schema、profile 和脚本说明见[包 README](../../packages/dsh-plugin/README.zh.md)。回放夹具已纳入 `tests/fixtures/`，安装、基准与真实模型回执分别为 `.cache/install.json`、`.cache/benchmark.json`、`.cache/live-model.json`。

## 支持边界与发布范围

- 本次是轻量原生记忆实现，保留 DSH 历史、查询和压缩。Embedding、周期提取、Rust/subc、文档导入与跨宿主共享在线数据库不属于本次首版范围。
- 本地验收环境为 macOS arm64、Node 24 和上述 DSH prerelease。已接入 Linux CI，但不将其描述为远程 CI 已运行；其他 DSH 版本、Desktop 和移动端视口未在此认证。
- 检索按字面词项匹配并限制数量，初始快照使用最近有效记录并保持冻结，显式 recall 获取当前状态。宿主必须提供工作区信息。
- 没有提供既有 Magic 数据库，因此本次交付的导入、幂等迁移和迁移回滚不适用。
- 原生 tarball 可独立于兄弟源码仓库安装；npm 包保持私有，正式 profile 未改动。未来公开发布应重新验证精确宿主矩阵。
