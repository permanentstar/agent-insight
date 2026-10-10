---
id: "durable-index"
title: "Pico5 / pi-durable 分册"
subject: "pi-durable"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary", "durable-architecture", "durable-loop", "durable-documents"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Pico5 / pi-durable 分册

Pico5 把进行中的模型与工具工作表示为持久 Task，用事务对齐历史、任务状态和可观察资料。本分册先建立对象层次，再沿同一项“读、改、验证、回答”任务学习接纳、调度、模型决策和上下文组织。

| 阅读顺序 | 要回答的问题 |
|---|---|
| [概念词典](glossary.md) | Entry、Task、Document、Submission 与运行句柄各指什么？ |
| [事务与 Task 状态机](architecture.md) | status 和 phase 有什么区别？提交与工具效果怎样分工？ |
| [一项任务怎样推进](loop.md) | 一份输入为什么对应多个 generation？工具结果怎样回到模型？ |
| [Document 与上下文](documents.md) | 当前状态、模型输入和摘要采用怎样协作？ |

建议对照 [AgentSession 循环](../pi/loop.md)阅读。两者都保留模型按观察选择动作的反馈机制，工作推进在进程与持久记录中的表示不同。模式层面的共同概念见[执行模式比较](../../comparisons/execution-modes.md)。
