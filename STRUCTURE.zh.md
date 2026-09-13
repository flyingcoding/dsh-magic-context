# DSH 源码布局

[English](STRUCTURE.md) | 中文

本仓库是只有一个原生 DSH 包的 Bun 工作区。[架构文档](ARCHITECTURE.zh.md)解释运行时约束，本文维护源码与命令归属。

```text
./
├── packages/dsh-plugin/
│   ├── src/
│   │   ├── index.ts, service.ts, config.ts
│   │   ├── sqlite.ts, store.ts, types.ts
│   │   ├── normalize.ts, tokenize.ts, scope.ts
│   │   ├── tools.ts, recall.ts
│   │   ├── management.ts, management-wire.ts
│   │   └── client/
│   ├── tests/
│   │   └── fixtures/memory-session.v3.json
│   ├── scripts/
│   ├── cordis.patch.yml
│   ├── package.json
│   ├── tsconfig.json, tsconfig.build.json, biome.json
│   └── README.md, README.zh.md, LICENSE, NOTICE
├── docs/dsh/
│   ├── README.md, README.zh.md
│   ├── migration-plan.md, migration-plan.zh.md, migration-plan.i18n.yaml
│   ├── dsh-only-plan.md, dsh-only-plan.zh.md
│   ├── compatibility.md, compatibility.zh.md
│   ├── specialization.md, specialization.zh.md
│   ├── resource-budgets.json
│   └── evidence/
├── .github/workflows/dsh.yml
├── .github/ISSUE_TEMPLATE/
├── package.json, bun.lock
├── README.md, README.zh.md
├── ARCHITECTURE.md, ARCHITECTURE.zh.md
├── STRUCTURE.md, STRUCTURE.zh.md
├── UPSTREAM.md, UPSTREAM.zh.md
└── AGENTS.md, LICENSE
```

## 改动应放在哪里

| 关注点 | 归属 |
|---|---|
| SQLite、schema、修订、重试与作用域 | `packages/dsh-plugin/src/store.ts`、`src/sqlite.ts`、`src/types.ts`、`src/scope.ts`。 |
| 字面检索 | `packages/dsh-plugin/src/normalize.ts`、`src/tokenize.ts`。 |
| 工具 schema 与指导语 | `packages/dsh-plugin/src/tools.ts`。 |
| 入场与送达投影 | `packages/dsh-plugin/src/recall.ts`。 |
| 设置操作与浏览器页面 | `packages/dsh-plugin/src/management*.ts`、`src/client/`。 |
| 行为与回放回归 | `packages/dsh-plugin/tests/*.test.ts`；持久化无密钥 fixture 位于 `tests/fixtures/`。 |
| 构建与验收自动化 | `packages/dsh-plugin/scripts/`；公共开发命令经根清单路由至此。 |
| 当前用法与限制 | 双语包 README 和 `docs/dsh/compatibility*.md`。 |
| 源码来源与后续迁入 | 包 `NOTICE`、根 `UPSTREAM*.md` 和完整 `origin_main` 镜像。 |

## 命令与生成产物

根 `build`、`typecheck`、`test`、`lint`、`lint:fix`、`docs:check`、`test:install`、`benchmark`、`test:live` 转发至原生包。`structure:check` 拒绝额外工作区、过时锁文件归属和退役命令输入。`check` 组合静态与行为检查。使用 `bun run test` 确保测试在 Node 下执行。

构建将 Host 文件和独立浏览器 factory 输出到 `packages/dsh-plugin/dist/`，声明位于 `dist/types/`，这些都是生成产物。旧构建在包内 `.cache/builds/` 保留。安装、基准和模型脚本在 `.cache/` 保存回执，稳定且脱敏的摘要归入 `docs/dsh/evidence/`。

开发无需根 Cargo 工作区、其他包管理器锁文件、旧宿主 preload、独立文档站或桌面应用。退役源码、发布材料及非 DSH 文档仍可通过固定上游镜像和 Git 历史查询。
