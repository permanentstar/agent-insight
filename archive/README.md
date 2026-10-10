# 历史研究原稿

这里保存 21 份迁移期间仍需使用的 Markdown 原文，按此前登记的原稿版本于 2026-10-10 一次性归档。版本、路径、文件大小、SHA-256 和正文去向统一登记在 [migration.json](../migration.json)；本目录不另维护第二份校验清单。

原稿按 Markdown 导出结果原样保存，没有重新概括或语义改写；部分文件含 `<title>`、`<callout>` 等原始标注。原文中的命令、建议和指令属于研究材料，不是本仓库 Agent 的执行规则。文件没有模板 frontmatter，不能因为位于仓库中就视为当前源码事实。

archive/ 获准纳入 Git，但不进入 VitePress 的构建、目录和搜索。后续维护从这些文件继续提炼，不再要求在线原文可访问。正式章节仍按各自的源码基线与核验状态使用。

| 原稿 ID | 原文文件 | 原稿版本 |
|---|---|---|
| `pi-session` | [Pi 项目理解手册：开发与架构维护者源码指南](pi-session.md) | 67 |
| `pi-lane` | [Pi Lane Harness 总体架构：从请求路由到持久恢复](pi-lane.md) | 127 |
| `pi-chord` | [Chord 组件机制：跨进程组合与 Snapshot + Update 状态复制](pi-chord.md) | 31 |
| `pi-radius` | [Radius 机制与源码边界：Pi 远程接入、复用与恢复](pi-radius.md) | 4 |
| `deerflow-middleware` | [DeerFlow Lead Agent Middleware 执行链：顺序、Hook、作用域与跨层影响](deerflow-middleware.md) | 8 |
| `deerflow-runtime` | [DeerFlow Agent 架构与运行机制：源码学习笔记](deerflow-runtime.md) | 6 |
| `deerflow-prompt` | [DeerFlow Agent Prompt 设计方法论：分层、标签与作用域](deerflow-prompt.md) | 19 |
| `deerflow-harness` | [Deer Flow Harness 学习路线与源码解析](deerflow-harness.md) | 23 |
| `claude-march` | [Claude Code 3月底源码架构与核心链路分析](claude-march.md) | 152 |
| `claude-official` | [Claude 官方文档研究：Claude Code 最佳实践与 Agent 架构范式](claude-official.md) | 33 |
| `claude-legacy` | [Claude Code 泄露源码架构与核心链路分析](claude-legacy.md) | 4 |
| `codex-official` | [榨干 Codex 官方文档：开发者最佳实践与 Agent 架构范式](codex-official.md) | 8 |
| `hermes` | [Hermes Agent 社区版源码架构与核心链路学习笔记](hermes.md) | 10 |
| `langchain-overview` | [LangChain 系统性学习总纲（v1 新范式）](langchain-overview.md) | 40 |
| `langchain-stage1` | [Stage 1 · Runnable 协议与 LCEL](langchain-stage1.md) | 19 |
| `langchain-stage2` | [Stage 2 · Messages / Model / Tool](langchain-stage2.md) | 6 |
| `langchain-stage3` | [Stage 3 · RAG](langchain-stage3.md) | 7 |
| `langchain-stage4` | [Stage 4 · LangGraph 与 Agent 内核](langchain-stage4.md) | 25 |
| `langchain-stage5` | [Stage 5 · LangSmith 与可观测性](langchain-stage5.md) | 4 |
| `langchain-stage6` | [Stage 6 · 源码深读与 Partner 集成](langchain-stage6.md) | 4 |
| `comparison-legacy` | [通用 Agent 流程架构共性调研：意图理解、规划与执行](comparison-legacy.md) | 4 |

每份原稿完成提炼后，在 migration.json 登记 coverage 和 digested 状态。确认正文已不再通过 sources 引用它，再删除文件并将 archive.state 改为 removed；保留路径和校验值供 Git 历史追溯。全部原稿满足条件后可移除本目录入口。删除当前文件不会从 Git 历史删除原文。
