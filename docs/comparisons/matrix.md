---
id: "comparison-matrix"
title: "对象矩阵：同一问题与不同阶段"
subject: "comparison"
status: "index"
baselines: []
sources: []
depends_on: ["pi-architecture", "durable-architecture", "deerflow-index", "claude-index", "codex-index", "hermes-index", "langchain-index", "langgraph-index", "deepseek-index"]
evidence: []
verified_scope: "完整研究对象与共同维度已登记；尚未完成所有对象的机制矩阵。"
---

# 对象矩阵：同一问题与不同阶段

本矩阵只回答对象处于什么层，以及本书能支持哪些结论。正式默认与实验方案分别列出，不能等同于对生产能力排名。

| 对象 | 层次与核验状态 | 证据入口 |
|---|---|---|
| Pi AgentSession | 当前默认产品 session；核心主线静态核验 | [架构](../agents/pi/architecture.md) |
| Pico5 | 当前实验持久架构；代表性 Task/tool 语义核验 | [架构](../agents/pi-durable/architecture.md) |
| DeerFlow | 目录已建立，最新机制待核验 | [DeerFlow分册](../agents/deerflow/index.md) |
| Claude Code（冻结） | 历史材料已初步整理；快照版本未知，不跟踪更新 | [Claude Code（冻结）分册](../agents/claude/index.md) |
| Codex | 目录已建立，最新机制待核验 | [Codex分册](../agents/codex/index.md) |
| Hermes | 目录已建立，最新机制待核验 | [Hermes分册](../agents/hermes/index.md) |
| LangChain | 目录已建立，最新机制待核验 | [LangChain分册](../frameworks/langchain/index.md) |
| LangGraph | 目录已建立，最新机制待核验 | [LangGraph分册](../frameworks/langgraph/index.md) |
| DeepSeek Harness | 目录已建立，最新机制待核验 | [DeepSeek Harness分册](../agents/deepseek/index.md) |

共同能力字段固定为：输入入口、组合根、状态 owner、loop driver、持久单元、context 投影、tool 授权、扩展、子 Agent 所有权、并发、取消、恢复、事件与部署。初版不把迁移稿填成当前值；每个专题按同一字段继续补证。

Lane 为 [历史参考](../history/pi-lane/architecture.md)，不与当前默认能力并列打分。
