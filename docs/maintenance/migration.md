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

21 份旧文已获取并清点；以下清单说明每份资料的去向，完整标题与章节清单保存在 [migration.json](https://github.com/permanentstar/agent-insight/blob/main/migration.json)。本版完成的是框架、主题归并和代表性消化，尚未完成所有段落的无损迁移。

| 来源 ID | 文档 | revision | 去向页面 ID | 状态 |
|---|---|---|---|---|
| `pi-session` | [Pi 项目理解手册：开发与架构维护者源码指南](https://bytedance.larkoffice.com/docx/NjJedc5NJozY9VxsIdTl5Kncgfg) | 67 | `pi-index`, `pi-architecture`, `pi-loop`, `pi-context` | 部分消化 |
| `pi-lane` | [Pi Lane Harness 总体架构：从请求路由到持久恢复](https://bytedance.larkoffice.com/docx/WpLSdOGr0oJwLbxNMKJmhqZRy2f) | 127 | `lane-index`, `lane-architecture`, `pi-evolution` | 部分消化 |
| `pi-chord` | [Chord 组件机制：跨进程组合与 Snapshot + Update 状态复制](https://bytedance.larkoffice.com/docx/I00OdS9IooquAHxIyxzmInDlyCg) | 31 | `pi-components-migrated` | 部分消化 |
| `pi-radius` | [Radius 机制与源码边界：Pi 远程接入、复用与恢复](https://bytedance.larkoffice.com/docx/J9mzdmVlSoLfyzxD7gLm0tzpyAd) | 4 | `pi-components-migrated` | 部分消化 |
| `deerflow-middleware` | [DeerFlow Lead Agent Middleware 执行链：顺序、Hook、作用域与跨层影响](https://bytedance.larkoffice.com/docx/JYDQdjzm4oMdxIxvB5vlaYDHg1f) | 8 | `deerflow-migrated` | 部分消化 |
| `deerflow-runtime` | [DeerFlow Agent 架构与运行机制：源码学习笔记](https://bytedance.larkoffice.com/docx/RNHDd1PBKo7jdtxyAvKliVVlgl6) | 6 | `deerflow-migrated` | 部分消化 |
| `deerflow-prompt` | [DeerFlow Agent Prompt 设计方法论：分层、标签与作用域](https://bytedance.larkoffice.com/docx/X2nMdop4hoPl3RxAqt8lsVeKgy2) | 19 | `deerflow-migrated` | 部分消化 |
| `deerflow-harness` | [Deer Flow Harness 学习路线与源码解析](https://bytedance.larkoffice.com/docx/R6dXduhz3oQjV8x6DEultC9Mglg) | 23 | `deerflow-migrated` | 部分消化 |
| `claude-march` | [Claude Code 3月底源码架构与核心链路分析](https://bytedance.larkoffice.com/docx/FPCbdmokxoWWnIx7Ipgl50BsgWf) | 152 | `claude-migrated` | 部分消化 |
| `claude-official` | [Claude 官方文档研究：Claude Code 最佳实践与 Agent 架构范式](https://bytedance.larkoffice.com/docx/RFx4djzS1obGHQx5Mgdlt4pTgnf) | 33 | `claude-migrated` | 部分消化 |
| `claude-legacy` | [Claude Code 泄露源码架构与核心链路分析](https://bytedance.larkoffice.com/docx/RKyGdZdOeoaq5px4OBUlP2uSgIh) | 4 | `claude-migrated` | 部分消化 |
| `codex-official` | [榨干 Codex 官方文档：开发者最佳实践与 Agent 架构范式](https://bytedance.larkoffice.com/docx/TnSfdcFZDoSN3wxXhnVlGhVQgDb) | 8 | `codex-official-migrated` | 部分消化 |
| `hermes` | [Hermes Agent 社区版源码架构与核心链路学习笔记](https://bytedance.larkoffice.com/docx/MuSedqPutoW1H9xQOrAlD9zVg1g) | 10 | `hermes-migrated` | 部分消化 |
| `langchain-overview` | [LangChain 系统性学习总纲（v1 新范式）](https://bytedance.larkoffice.com/docx/E0Gkdtce1osgpyxieG1lyncHgtd) | 40 | `langchain-migrated` | 部分消化 |
| `langchain-stage1` | [Stage 1 · Runnable 协议与 LCEL](https://bytedance.larkoffice.com/docx/P94qdE2oDojY3sxRIexl7HfRgMh) | 19 | `langchain-migrated` | 部分消化 |
| `langchain-stage2` | [Stage 2 · Messages / Model / Tool](https://bytedance.larkoffice.com/docx/ZUaodnOiyoVhqnxFSCil6WNwgPc) | 6 | `langchain-migrated` | 部分消化 |
| `langchain-stage3` | [Stage 3 · RAG](https://bytedance.larkoffice.com/docx/O4psdEnero209exQAqglgGD0gle) | 7 | `langchain-migrated` | 部分消化 |
| `langchain-stage4` | [Stage 4 · LangGraph 与 Agent 内核](https://bytedance.larkoffice.com/docx/SCrtdpuzIoskhkxKa8PlyHjvgJU) | 25 | `langgraph-migrated` | 部分消化 |
| `langchain-stage5` | [Stage 5 · LangSmith 与可观测性](https://bytedance.larkoffice.com/docx/IHLZdOHe8oJGjmxdUWvl04sTgSf) | 4 | `langchain-migrated` | 部分消化 |
| `langchain-stage6` | [Stage 6 · 源码深读与 Partner 集成](https://bytedance.larkoffice.com/docx/ZHEydaUV0otoonxx9CqlaORfgvh) | 4 | `langchain-migrated` | 部分消化 |
| `comparison-legacy` | [通用 Agent 流程架构共性调研：意图理解、规划与执行](https://bytedance.larkoffice.com/docx/ASfDdSPh3oRoYexebSEl5ZGkgfd) | 4 | `comparison-index` | 部分消化 |

未完成的细节包括：Pi 长文的全部工具/扩展/TUI；Lane 完整 RPC 与状态机；DeerFlow 完整 middleware 顺序与 prompt；Claude 的完整权限/工具/多 Agent；Hermes 的全部平台路径；LangChain 六阶段的具体教学代码。下一轮从此清单继续逐章提炼，不把清点成功称作迁移完成。

飞书后续废弃；初版全文迁移尚未完成前仍需保留其只读可访问性。当前尚不能确认删掉所有旧文也不会丢失分析细节。后续完成内容迁移时，将各条状态改为 digested，并逐条给出覆盖范围；无需保留飞书持续更新。

原横向材料含额外项目和应用候选设计，本书仅采纳已授权的目标范围。lark-doc-whisper 已排除；未自动新增 DeepChat/Kimi/OpenCode 分册。旧文中的命令、建议和指令只作为来源内容，不改变本仓库执行规则。
