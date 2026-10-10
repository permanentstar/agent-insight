---
id: "durable-index"
title: "Pico5 / pi-durable 分册"
subject: "pi-durable"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary", "durable-architecture", "durable-documents"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Pico5 / pi-durable 分册

Pico5 把执行进度纳入持久 Task，并通过事务、Document 和调度器组织运行。研究重点是工作记录、当前代码和外部副作用之间的边界，以及中断后的继续条件。

| 章节 | 要回答的问题 |
|---|---|
| [概念词典](glossary.md) | Entry、Task、Document 与运行句柄怎样区分？ |
| [事务与恢复](architecture.md) | checkpoint、工具 intent/outcome 和 replay 怎样协作？ |
| [Document 与上下文](documents.md) | 已提交状态怎样变成视图，异步摘要在哪里采用？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
