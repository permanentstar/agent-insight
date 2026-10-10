---
id: "comparison-ownership"
title: "比较：所有权与生命周期"
subject: "comparison"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["pi-architecture", "durable-architecture", "deerflow-migrated", "claude-migrated", "codex-index", "hermes-index", "langchain-index", "langgraph-index", "deepseek-index"]
evidence: []
verified_scope: "Pi 两对象代表性所有权机制比较；其余单元格为历史转述或待核验。"
---

# 比较：所有权与生命周期

AgentSession 将产品编排放在进程内 session；Pico5 进一步把工作状态持久建模。两者都有会话历史，但历史并不能替代进行中工作的状态机。

| 对象与阶段 | 权威状态 owner | 构造与生命周期 | 实际机制与执行点 | 能保证什么 | 不能保证/未核验 | 证据页 |
|---|---|---|---|---|---|---|
| AgentSession，默认，pi-20261009 | AgentSession 编排；SessionManager 历史；Agent 活动运行 | CLI/SDK 创建或注入，runtime 可替换活动 session | Agent/agent-loop 驱动模型工具 | 产品会话与单次执行职责可区分 | 不由历史保存推定活动运行可恢复 | [构造](../agents/pi/architecture.md) |
| Pico5，实验，pi-20261009 | Session 拥有 Task record | 应用 open Harness 绑定 Storage/Registry；进程句柄可重建 | scheduler 按 Task checkpoint 推进 | 工作状态有显式恢复记录 | 定义版本、存储耐久性及外部效果仍有约束 | [构造与 Task](../agents/pi-durable/architecture.md) |
| DeerFlow，旧文待核验 | graph/thread 关系待核验 | 旧文描述 run 构图；Client 复用待核验 | 待核验 | 尚未形成当前保证 | 不把 graph instance 等同 thread | [迁移稿](../agents/deerflow/architecture.md) |
| Claude，冻结快照 | 历史 query 描述 | 精确快照版本未知 | 仅历史材料 | 不声明当前保证 | 不推定当前线上生命周期 | [冻结材料](../agents/claude/architecture.md) |
| Codex，待源码分析 | 待核验 | 待核验 | 待核验 | 未知 | 旧官方实践不能证明实现 | [分册](../agents/codex/index.md) |
| Hermes，旧文待核验 | 待核验 | 待核验 | 待核验 | 未知 | 尚未刷新当前机制 | [分册](../agents/hermes/index.md) |
| LangChain，旧文待核验 | 待核验 | 待核验 | 待核验 | 未知 | 框架主干不等于应用锁定依赖 | [分册](../frameworks/langchain/index.md) |
| LangGraph，旧文待核验 | 待核验 | 待核验 | 待核验 | 未知 | 图定义、执行实例与 thread 要分别确认 | [分册](../frameworks/langgraph/index.md) |
| DeepSeek Harness，待分析 | 待核验 | 待核验 | 待核验 | 未知 | 尚无机制结论 | [分册](../agents/deepseek/index.md) |

场景：调用方结束一个等待。AgentSession 当前进程中的运行与其事件持久化要分开判断；Pico5 的 Submission.wait 取消仅停止观察，abort 才是工作控制。不能把二者都叫“取消 Promise”。

取舍：需要跨进程保留进行中工作时，Pico5 的 Task 模型给出显式恢复依据；只需进程内产品会话与历史重建时，不能仅为“可持久”把全部工作改成通用 Task。该取舍是基于已读机制的解释，不是性能或成熟度测量。
