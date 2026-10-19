---
id: "home"
title: "Agent Insight"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "九对象的架构、主线、执行模式与比较入口；静态分析与教学示意分开，不声明目标运行验证。"
---

# Agent Insight

Agent 的一次回答可能包含多次模型请求、工具调用和状态更新。理解它的实现，需要同时回答三个问题：谁决定继续执行，谁拥有正在变化的状态，发生中断后能恢复到哪里。

本书从源码出发，研究 Pi、DeerFlow、Claude Code、Codex、Hermes、LangChain、LangGraph 与 DeepSeek Harness 的架构和运行机制。Pi 的 AgentSession 与 Pi Durable 分开讨论：前者围绕交互会话组织执行，后者把工作进度纳入持久状态。横向章节比较共同问题，各对象分册再展开自己的概念和调用链。

![从对象关系、概念词典进入执行链，再分析状态边界与设计取舍](assets/book-map.svg)

## 从共同问题开始

建议按[学习路径](guide/learning.md)阅读。先读[共同架构](comparisons/common-model.md)，从一次模型调用建立完整工作闭环的认知，再进入[横向比较](comparisons/index.md)，再从[研究对象地图](guide/map.md)选择分册。版本与研究范围统一见[版本说明](guide/baselines.md)。

| 研究问题 | 阅读入口 |
|---|---|
| 会话、运行实例和持久记录由谁拥有？ | [所有权与生命周期](comparisons/ownership.md) |
| ReAct、Plan & Execute 与产品 Plan Mode 怎样区分？ | [执行模式与模型决策](comparisons/execution-modes.md) |
| 模型理解、计划、工具调用和子 Agent 如何衔接？ | [决策、委派与控制](comparisons/control-delegation.md) |
| 模型读到哪些资料，压缩摘要何时生效？ | [Prompt、压缩与长期记忆](comparisons/context-compaction.md) |
| 中断后恢复的是历史、程序进度，还是外部效果？ | [状态、持久化与恢复](comparisons/state-recovery.md) |
| 工具定义怎样走到实际执行，权限在哪里生效？ | [工具、扩展与执行边界](comparisons/execution.md) |
| 流事件、持久确认和业务完成分别证明什么？ | [观测、终态与交付确认](comparisons/observability-delivery.md) |
| 开放的模型决策怎样进入有契约的业务系统？ | [从 Agent 循环到业务系统](comparisons/agent-in-business.md) |

## 沿层次深入源码

每个机制章先给全程图和步骤概览，再沿执行顺序解释对象与数据交接。嵌套较深的概念先由词典定位，关键调用在正文内以短代码节选或明确标注的教学骨架展开。从入口走完一次输入的主链路后，再研究取消、重试、并发和恢复。需要追踪复杂调用时，可按[调用链阅读方法](guide/reading.md)持续标出当前位置、上下层和状态归属。


## 用同一任务建立设计认知

全书以读取资料、修复 CSV 导出并验证为反复出现的学习案例。读者可以先预测下一请求、下一状态与结果消费者，再到真实实现中核对。不同分册的工具名、状态和持久记录保持各自语义；共同职责帮助比较，具体接口帮助判断组合条件。
