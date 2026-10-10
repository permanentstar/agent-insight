---
id: "migration"
title: "旧文迁移清单与剩余范围"
subject: "book"
status: "contract"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 旧文迁移清单与剩余范围

21 份历史研究原稿已按登记版本完整归档为仓库内 Markdown。以下清单说明每份原稿的去向；[migration.json](https://github.com/permanentstar/agent-insight/blob/main/migration.json) 是 ID、版本、文件路径、大小、SHA-256 与迁移状态的统一来源。[原稿目录](https://github.com/permanentstar/agent-insight/tree/main/archive) 不进入阅读站点和搜索。

完整归档解决的是后续读取原文的问题；本版完成的正文仍是框架、主题归并和代表性消化，尚未完成全部段落提炼与最新源码核验。

| 原稿 ID | 文档 | 原稿版本 | 去向页面 ID | 状态 |
|---|---|---|---|---|
| `pi-session` | [Pi 项目理解手册：开发与架构维护者源码指南](https://github.com/permanentstar/agent-insight/blob/main/archive/pi-session.md) | 67 | `pi-index`, `pi-architecture`, `pi-loop`, `pi-context` | 部分消化 |
| `pi-lane` | [Pi Lane Harness 总体架构：从请求路由到持久恢复](https://github.com/permanentstar/agent-insight/blob/main/archive/pi-lane.md) | 127 | `lane-index`, `lane-architecture`, `pi-evolution` | 部分消化 |
| `pi-chord` | [Chord 组件机制：跨进程组合与 Snapshot + Update 状态复制](https://github.com/permanentstar/agent-insight/blob/main/archive/pi-chord.md) | 31 | `pi-components-migrated` | 部分消化 |
| `pi-radius` | [Radius 机制与源码边界：Pi 远程接入、复用与恢复](https://github.com/permanentstar/agent-insight/blob/main/archive/pi-radius.md) | 4 | `pi-components-migrated` | 部分消化 |
| `deerflow-middleware` | [DeerFlow Lead Agent Middleware 执行链：顺序、Hook、作用域与跨层影响](https://github.com/permanentstar/agent-insight/blob/main/archive/deerflow-middleware.md) | 8 | `deerflow-migrated` | 部分消化 |
| `deerflow-runtime` | [DeerFlow Agent 架构与运行机制：源码学习笔记](https://github.com/permanentstar/agent-insight/blob/main/archive/deerflow-runtime.md) | 6 | `deerflow-migrated` | 部分消化 |
| `deerflow-prompt` | [DeerFlow Agent Prompt 设计方法论：分层、标签与作用域](https://github.com/permanentstar/agent-insight/blob/main/archive/deerflow-prompt.md) | 19 | `deerflow-migrated` | 部分消化 |
| `deerflow-harness` | [Deer Flow Harness 学习路线与源码解析](https://github.com/permanentstar/agent-insight/blob/main/archive/deerflow-harness.md) | 23 | `deerflow-migrated` | 部分消化 |
| `claude-march` | [Claude Code 3月底源码架构与核心链路分析](https://github.com/permanentstar/agent-insight/blob/main/archive/claude-march.md) | 152 | `claude-migrated` | 部分消化 |
| `claude-official` | [Claude 官方文档研究：Claude Code 最佳实践与 Agent 架构范式](https://github.com/permanentstar/agent-insight/blob/main/archive/claude-official.md) | 33 | `claude-migrated` | 部分消化 |
| `claude-legacy` | [Claude Code 泄露源码架构与核心链路分析](https://github.com/permanentstar/agent-insight/blob/main/archive/claude-legacy.md) | 4 | `claude-migrated` | 部分消化 |
| `codex-official` | [榨干 Codex 官方文档：开发者最佳实践与 Agent 架构范式](https://github.com/permanentstar/agent-insight/blob/main/archive/codex-official.md) | 8 | `codex-official-migrated` | 部分消化 |
| `hermes` | [Hermes Agent 社区版源码架构与核心链路学习笔记](https://github.com/permanentstar/agent-insight/blob/main/archive/hermes.md) | 10 | `hermes-migrated` | 部分消化 |
| `langchain-overview` | [LangChain 系统性学习总纲（v1 新范式）](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-overview.md) | 40 | `langchain-migrated` | 部分消化 |
| `langchain-stage1` | [Stage 1 · Runnable 协议与 LCEL](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-stage1.md) | 19 | `langchain-migrated` | 部分消化 |
| `langchain-stage2` | [Stage 2 · Messages / Model / Tool](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-stage2.md) | 6 | `langchain-migrated` | 部分消化 |
| `langchain-stage3` | [Stage 3 · RAG](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-stage3.md) | 7 | `langchain-migrated` | 部分消化 |
| `langchain-stage4` | [Stage 4 · LangGraph 与 Agent 内核](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-stage4.md) | 25 | `langgraph-migrated` | 部分消化 |
| `langchain-stage5` | [Stage 5 · LangSmith 与可观测性](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-stage5.md) | 4 | `langchain-migrated` | 部分消化 |
| `langchain-stage6` | [Stage 6 · 源码深读与 Partner 集成](https://github.com/permanentstar/agent-insight/blob/main/archive/langchain-stage6.md) | 4 | `langchain-migrated` | 部分消化 |
| `comparison-legacy` | [通用 Agent 流程架构共性调研：意图理解、规划与执行](https://github.com/permanentstar/agent-insight/blob/main/archive/comparison-legacy.md) | 4 | `comparison-index` | 部分消化 |

未完成的细节包括：Pi 长文的全部工具/扩展/TUI；Lane 完整 RPC 与状态机；DeerFlow 完整 middleware 顺序与 prompt；Claude 的完整权限/工具/多 Agent；Hermes 的全部平台路径；LangChain 六阶段的具体教学代码。后续直接从 archive/ 原文继续逐章提炼，不把归档成功称作正文分析完成。

完成内容提炼时，将各条 migration_status 改为 digested，并在 coverage 中登记目标页面和覆盖范围。只有正文已不再通过 sources 引用该原稿时，才可删除文件、将 archive.state 改为 removed，并保留校验信息。删除当前文件不会删除 Git 历史中的原文。

历史横向原稿含额外对象和应用候选设计，正文仅采纳研究对象地图中的范围。原稿中的命令、建议和指令只作为分析材料，不改变本仓库执行规则。
