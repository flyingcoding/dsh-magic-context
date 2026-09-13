# DSH 原生 Magic Context 记忆插件

[English](README.md) | 中文

`@flyingcoding/dsh-magic-context` 通过原生 Cordis Bundle 为 DeepSeek Harness 增加本地跨会话记忆。`0.1.0-alpha.1` 提供有作用域的 SQLite 记录、四个原生工具、每会话一次的可回放记忆快照，以及 Web 设置页。会话历史、压缩、模型路由和权限仍由 DSH 原有组件负责。

目前交付本地 alpha 安装包，包保持 `private: true`；这不表示已经发布 npm 或安装到正式 profile。要求 Node 24 及以上，并将已验证的 DSH 依赖锁定为 `0.1.5-rc.2`。精确证据和限制见[兼容性记录](../../docs/dsh/compatibility.zh.md)。

## 构建与验证

在仓库根目录执行，需具备 Bun 1.3.5 和 Node 24：

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
```

仓库显式声明唯一工作区，默认安装无需过滤。原生测试在 Node 下执行，实际覆盖 `node:sqlite`。构建打包本包内已审查的源码，并单独生成生产 JSX 客户端文件，声明统一位于 `dist/types/`；打包前使用 Node 检查每个 Host JavaScript 文件。旧构建目录移到 `.cache/builds/`，避免旧 chunk 混入新产物。

`test:install` 会生成 tarball，在仓库外安装，检查本地声明闭包，使用无需密钥的 provider 驱动真实 DSH AgentLoop，按宿主支持的模块集合执行客户端 factory，并在存在 `dsh` 时检查 Bundle 组合。回执位于 `packages/dsh-plugin/.cache/install.json`。`benchmark` 使用构建产物，在包目录生成 `.cache/benchmark.json`。

## 安装到指定 profile

先构建，再在仓库根目录生成本地安装包：

```sh
mkdir -p .cache/artifacts
npm pack ./packages/dsh-plugin --ignore-scripts --pack-destination .cache/artifacts
```

使用 `dsh plugin --profile <profile> add <安装包绝对路径> --config.auto-install-peers=false` 安装，集成检查时显式指定隔离的 `DSH_HOME`。仓库根目录不是 Bundle。profile 的 `package.json` 中，`dsh.profile.bundles` 应在原有基础包和应用包之后包含本包：

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@flyingcoding/dsh-magic-context"
      ]
    }
  }
}
```

此安装选项让 launcher 提供宿主 peer。额外安装部分 DSH 核心包，即使版本号相同，也可能分裂内部工具身份；真实模型测试会先确认所选工具与 AgentLoop 解析到同一运行时。

通过 `dsh --profile <profile> --dump-config` 检查组合，应新增 `magic-memory-store`、`magic-memory-tools`、`magic-memory-recall` 三行。使用 `dsh --profile <profile>` 启动对应应用；Web 预览可添加 `--port 43179 --no-open`。只有列入此 Bundle 的 profile 获得该能力。

## 使用记忆

让智能体保存已确认事实，或修正已有记忆。写入默认归属 Session 提供的可信工作区；用户全局偏好必须显式选择 `scope: "global"`。模型不能通过参数指定其他目录，工作区身份来自 Session header 及其真实路径。不同 clone 和 worktree 默认隔离。

| 原生工具 | 输入 | 结果 |
|---|---|---|
| `memory_remember` | `content`、`category`；可选 `scope`、`request_id` | 有效记录、稳定 ID、修订号，以及创建或去重结果。 |
| `memory_recall` | `query`；可选 `include_global`、`limit` | 当前有效记录及 ID、修订号、作用域和来源。 |
| `memory_update` | `id`、`expected_revision`、`content`、`category`；可选 `scope`、`request_id` | 新修订；旧内容作为 `superseded` 保留在历史中。 |
| `memory_forget` | `id`、`expected_revision`；可选 `scope`、`request_id` | 归档修订，后续检索和初始快照不再包含它。 |

支持 `PROJECT_RULES`、`ARCHITECTURE`、`CONFIG_VALUES`、`CONSTRAINTS`、`NAMING`、`USER_PREFERENCES`、`KNOWN_ISSUES`。携带旧修订号的请求会失败，不覆盖当前事实。不确定上次请求是否成功时，使用相同 `request_id` 和相同参数重试；同一 ID 携带不同参数会被拒绝。内容去重限定在作用域内，仅归一化空白，保留代码标识符的大小写差异。

关键词检索使用 FTS5，索引中文单字/双字组合以及归一化的标识符和路径词项，查询词项必须全部匹配。已覆盖中文子串、驼峰标识符、路径、精确错误词和中英混合查询；尚不支持同义词或跨语言翻译。无关查询返回空列表。

首个正式入场的请求最多接收五条最近有效记忆，启用时包含全局偏好。完整事实与提示框架必须同时满足 token 估算预算；过长记录会跳过，不会从中截断。快照写入 Session 日志后保持冻结，更新内容通过显式 recall 获取。fork 继承已记录的快照及其原始工作区信息，不会把继承内容重新写成数据库记录。

历史对话证据继续使用 profile 已提供的 DSH `session_search`、`session_event_search` 和精确事件读取工具，本包不重复建设对话索引。DSH 默认 `openAt: never`，并不一定挂载查询工具；需要全文搜索时，应由 profile 显式启用 `session-query-sqlite`，并挂载官方 `@deepseek-ai/dsh-tool-session-query` 消费者。记忆捕获依靠当前智能体可观察的工具调用，默认不运行 embedding 模型、辅助提取智能体、定时摘要或文档导入。

## 在 Web 页面管理

打开 **设置 → 记忆**，选择工作区或全局偏好，分页查看记录，修改有效事实或归档。成功修改后显示新修订号，直接人工编辑与智能体工具写入分别记录来源。**导出当前页** 下载 JSON，包含当前页及其中的归档记录；更多记录需要继续翻页导出。

页面复用 DSH 客户端加载器、语言注册表、设置插槽和已认证的 Typert 网关，不启动额外服务。Host 管理请求会校验输入，工作区只能从已有存储身份中选择。默认每页 20 条，注册和释放由 Cordis 管理，存储 provider 只持有一个数据库连接。

## 配置 Bundle

在指定 profile 的 `cordis.patch.yml` 中覆盖行配置。行内 `config` 是整体替换，应写全需要覆盖的设置：

```yaml
- id: magic-memory-store
  config:
    cacheSizeMiB: 8
    busyTimeoutMs: 100
    maxContentChars: 4000
    maxQueryChars: 512
    maxResults: 20
- id: magic-memory-recall
  config:
    enabled: true
    includeGlobal: true
    topK: 5
    injectionBudgetTokens: 1000
```

| 配置 | 默认值 | 限制或含义 |
|---|---|---|
| `databasePath` | `$DSH_HOME/magic-context/memory.sqlite`；未设置 `DSH_HOME` 时使用 `~/.dsh` | 可选绝对路径，只接受本适配器拥有的数据库，拒绝其他库和未来 schema。 |
| `cacheSizeMiB` | `8` | SQLite 页缓存，范围 1–64 MiB，mmap 保持关闭；不等于进程 RSS。 |
| `busyTimeoutMs` | `100` | SQLite 锁等待，范围 0–5000 ms。 |
| `maxContentChars` | `4000` | 新增或修订事实的长度上限，范围 128–16000 字符。 |
| `maxQueryChars` | `512` | 查询长度上限，范围 32–4096 字符。 |
| `maxResults` | `20` | 检索与管理分页上限，范围 1–100 条。 |
| `enabled` | `true` | 是否注入初始快照；关闭后工具和存储数据仍可使用。 |
| `includeGlobal` | `true` | 初始快照是否包含显式保存的全局事实。 |
| `topK` | `5` | 候选数量，不得超过 `maxResults`。 |
| `injectionBudgetTokens` | `1000` | 包含提示框架的快照预算，范围 128–8000 个估算 token。 |

估算方式为 UTF-8 字节数除以三后向上取整，不是模型 tokenizer。工具 schema 和常驻指导语是额外输入。记录、修订、检索索引和重试回执在同一 immediate 事务中提交；数据库文件仅对所有者开放。卸载或停用 Bundle 会释放连接并保留记忆数据。

## 回放、取消与恢复

召回消费者包装 `agent/pre-step`，并保留宿主的 request-series 决策。DSH 在完成自身取消检查后才将返回消息正式入场并写入日志。`magicMemorySnapshot` 投影仅记录已提交消息 ID；被取消的候选不会占用送达状态，后续成功请求可再次尝试。恢复依赖 Session 日志，不依赖记忆数据库的当前内容。

插件没有任意同步 Session 历史读取，也不保留完整历史副本。宿主投影框架首次建立缺失状态时可能折叠一次既有日志，之后按新事件增量更新。DSH 本身仍负责保留和恢复 Session 历史，因此这不表示整个宿主的冷恢复具有常量内存开销。

## 真实模型验证

准备独立 `memory-live` profile，复用正式环境的 Ollama Cloud 路由：`api: openai-completions`、`baseURL: https://ollama.com/v1`、模型 `deepseek-v4.1-flash` 及其既有 `OLLAMA_API_KEY` 凭据引用。凭据不得放进仓库，也无需本地 Ollama daemon。此 profile 应组合本 Bundle 与 headless 应用，在隔离 home 中使用 `live-memory.sqlite`，并将未压缩 JSONL Session 写入 `live-sessions`。停用 `session-title-llm` 行，以便单独统计测试请求。完整验收还应安装并挂载 `@deepseek-ai/dsh-tool-session-query@0.1.5-rc.2`，将 `session-query-sqlite` 配置为 `openAt: first-search`，并将其 `path` 指向隔离 home 内的 `live-history.sqlite`。

使用隔离 `DSH_HOME`，通过 `dsh plugin --profile memory-live install --ignore-scripts --config.auto-install-peers=false` 安装已准备的 profile。预检在不请求模型的情况下初始化 profile，并记录实际宿主模块版本与哈希。

将 `DSH_MEMORY_TEST_HOME` 设置为准备好的隔离 home，然后在 `packages/dsh-plugin` 执行：

```sh
bun run test:live
```

脚本拒绝正式 `~/.dsh`，创建全新的合成工作区，验证保存、新会话召回、工作区隔离、修正、修正后召回、归档、归档后召回、原生历史引用、全局偏好写入和跨工作区全局召回十个场景，并对照实际 Session 日志与模型路由。结果保存到 `.cache/live-model.json` 和 `.cache/live-model/`。

## 发布与回滚

在兼容性矩阵评审完成、下游 npm scope 确认之前，保持 alpha 包私有。发布准备采用手动流程：更新版本，执行上述检查，审查 tarball，再将完全相同的 tarball 安装到隔离 profile。发布需要明确的 release 变更；唯一 DSH CI 流程只验证私有产物，没有发布步骤。

验证与已验收产物的格式兼容时，将 `DSH_MEMORY_BASELINE_STORE` 指向其隔离安装目录内的 `dist/store.js`，构建后在根目录执行 `bun run test:rollback`。验证使用全新合成数据库，交替运行旧/新版本写入，检查 ID、重试回执、修订、归档、检索及保持不变的 schema。

回滚启用状态时，从指定 profile 的 Bundle 列表移除本包并重载该 profile，保留记忆数据库和 DSH Session 日志。本 alpha 不导入已有 Magic 数据库，也不与其他宿主共享在线数据库；本次没有提供待导入的源数据库。后续可选扩展由[迁移计划](../../docs/dsh/migration-plan.zh.md)维护。
