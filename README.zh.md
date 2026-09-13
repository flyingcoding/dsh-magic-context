# DSH Magic Context

[English](README.md) | 中文

通过原生 Cordis Bundle 为 DeepSeek Harness 提供本地跨会话记忆。会话历史、压缩、模型路由和权限由 DSH 管理；本包负责精选的持久记忆及其可回放召回。

唯一工作区是 [`packages/dsh-plugin`](packages/dsh-plugin/README.zh.md)。私有包 `@flyingcoding/dsh-magic-context@0.1.0-alpha.1` 面向 Node 24+ 和 DSH `0.1.5-rc.2`。仓库根目录用于开发，安装时通过 DSH 使用构建后的包 tarball。

## 构建与检查

使用 Bun 1.3.5 和 Node 24，在仓库根目录执行：

```sh
bun install --frozen-lockfile --ignore-scripts
bun run check
bun run build
bun run test:install
bun run benchmark
```

默认命令仅处理 DSH。测试在 Node 下执行，覆盖真实 `node:sqlite`。`check` 包含类型、lint、行为、双语文档和仓库归属检查。`test:install` 在仓库外安装 tarball，检查声明闭包，运行无需密钥的 AgentLoop，并执行生产客户端 factory。`check:dsh` 保留为 `check` 的别名。

profile 安装、配置和显式真实模型验收见[包指南](packages/dsh-plugin/README.zh.md)。集成检查使用隔离的 DSH home/profile。本地验收不会发布 npm 包或启用正式 profile。

## 使用记忆

| 能力 | 行为 |
|---|---|
| 保存与修正 | 四个原生工具提供范围化写入、召回、修订检查和归档。 |
| 工作区隔离 | 默认使用可信 Session 工作区身份；全局写入需要显式选择作用域。 |
| 持久存储 | SQLite 记录、修订历史、检索条目和重试回执原子提交。 |
| 可回放召回 | 有预算的初始快照由 DSH 正式入场并记录，重启和 fork 后保持冻结。 |
| Web 管理 | DSH 设置页提供记录列表、编辑、归档和导出。 |

轻量路径使用中文、标识符和路径的字面检索。Embedding、后台提取、文档摄取、其他宿主适配和独立 daemon 不属于当前产品范围。

## 开发参考

| 阅读入口 | 用途 |
|---|---|
| [包指南](packages/dsh-plugin/README.zh.md) | 安装、工具、配置、页面、发布和回退。 |
| [架构](ARCHITECTURE.zh.md) | 存储、入场、生命周期和回放约束。 |
| [源码布局](STRUCTURE.zh.md) | 保留文件与命令的归属。 |
| [DSH 开发入口](docs/dsh/README.zh.md) | 计划、源码来源与兼容性证据。 |
| [专用化计划](docs/dsh/dsh-only-plan.zh.md) | 移除范围、阶段和验收标准。 |
| [兼容性](docs/dsh/compatibility.zh.md) | 固定版本的观测和支持限制。 |
| [上游工作流](UPSTREAM.zh.md) | 完整源码镜像和相关修复的选择性迁入。 |

## 来源与许可证

本产品复用 [cortexkit/magic-context](https://github.com/cortexkit/magic-context/tree/6f718ff019bf327a0b291a8510dfb42f91b65921) 中少量 SQLite、归一化和分类代码。精确来源及下游调整记录在 [NOTICE](packages/dsh-plugin/NOTICE)，MIT 许可证和原始版权保留在 [LICENSE](LICENSE)。

`origin_main` 保留完整上游镜像，DSH 开发位于 `dsh_main`。退役产品、发布流程和历史文档仍可通过 Git 历史及镜像查询。
