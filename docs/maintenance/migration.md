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

21 份历史研究原稿已完整归档，原稿文件保持原登记字节和校验值。当前正文从“框架与样例”推进到九对象的分层主链路版；原稿细节仍未全部消化，所有原稿继续保留。

[migration.json](https://github.com/permanentstar/agent-insight/blob/main/migration.json) 是 ID、revision、archive 路径、大小、SHA-256、targets、coverage 和 remaining_scope 的唯一登记来源。coverage 写明已落入正文的主题及限制，不表示原稿全文完成；remaining_scope 是接手 agent 的补证范围。[原稿目录](https://github.com/permanentstar/agent-insight/tree/main/archive) 不进入站点和搜索。

| 原稿 ID | 原稿版本 | 去向页面 ID | 尚未完整消化的范围 |
|---|---|---|---|
| `pi-session` | 67 | `pi-index`, `pi-architecture`, `pi-loop`, `pi-context`, `pi-extensions` | TUI、全量资源冲突、认证、MCP、codemode 与平台机制。 |
| `pi-lane` | 127 | `lane-index`, `lane-architecture`, `pi-evolution` | 完整 Operation 状态分派、RPC/worker 协议与恢复状态机。 |
| `pi-chord` | 31 | `pi-components-migrated` | 完整 Host/Facet 依赖解析、远程 Service/复制与当前 Pico5 Document 集成。 |
| `pi-radius` | 4 | `pi-components-migrated` | 所有远程接入/复用/断线路径及外部网关的公开证据。 |
| `deerflow-middleware` | 8 | `deerflow-migrated`, `deerflow-middleware` | 每个中间件的实际 hooks、配置精确顺序及所有扩展贡献。 |
| `deerflow-runtime` | 6 | `deerflow-migrated` | 多 worker 竞争、stream 重放与终态故障验证。 |
| `deerflow-prompt` | 19 | `deerflow-migrated`, `deerflow-middleware` | 所有标签/技能/子 Agent 提示与完整动态场景。 |
| `deerflow-harness` | 23 | `deerflow-migrated` | 全部工具、上下文压缩、Sandbox 与扩展策略。 |
| `claude-march` | 152 | `claude-migrated`, `claude-context` | Bridge/MCP 认证、全部 gates/工具、安全边界、缺失实现及原稿自身 TODO；需原 snapshot 补证。 |
| `claude-official` | 33 | `claude-migrated` | 官方观点的逐项归纳与历史发布时间核对；不用于当前私有实现。 |
| `claude-legacy` | 4 | `claude-migrated` | 旧 QueryEngine/Bridge/命令/状态的逐项核对及版本关系。 |
| `codex-official` | 8 | `codex-official-migrated` | 全部产品使用观点的历史归纳；与新 Rust core 逐项对应未完成。 |
| `hermes` | 10 | `hermes-migrated` | ACP、全部平台/provider、记忆、压缩提交 fence、cron、skills、多 Agent。 |
| `langchain-overview` | 40 | `langchain-migrated` | 学习路径细节与所有示例对主干的验证。 |
| `langchain-stage1` | 19 | `langchain-migrated` | LCEL 运算组合与 streaming/batch 的完整示例。 |
| `langchain-stage2` | 6 | `langchain-migrated` | 全部消息变形、provider 与 Tool 失败示例。 |
| `langchain-stage3` | 7 | `langchain-migrated` | RAG 的检索/切分/索引/召回与示例实现。 |
| `langchain-stage4` | 25 | `langgraph-migrated` | 子图、DeltaChannel/Overwrite 与复杂恢复示例。 |
| `langchain-stage5` | 4 | `langchain-migrated` | LangSmith/tracer/评估完整链路和实操代码。 |
| `langchain-stage6` | 4 | `langchain-migrated` | 所有 Partner 包和完整测试/源码阅读练习。 |
| `comparison-legacy` | 4 | `comparison-index`, `comparison-matrix`, `comparison-ownership`, `comparison-state`, `comparison-execution` | 范围外对象、应用候选设计保留历史；原稿逐段取舍理由尚未全部整理。 |

目前均为 partial-digestion。补齐正文后才将 migration_status 改为 digested；同时核对 coverage 是否覆盖原稿的重要结论、独有内容及未知边界。只有正文 sources 已不再依赖该原稿，才允许删除文件并将 archive.state 改为 removed，保留校验信息。删除当前文件不删除 Git 历史。

原稿中的命令、建议和指令均为材料内容，不改变本仓库操作规则。历史横向原稿的范围外对象与应用候选只作归档，本书不将它们写成目标 Agent 当前事实。未运行原稿教学练习，不称运行验证完成。
