---
id: "lane-index"
title: "Lane Harness 历史附录"
subject: "pi-lane"
status: "index"
baselines: ["pi-lane-20260916"]
sources: ["pi-lane", "pi-chord", "pi-radius"]
depends_on: ["lane-architecture", "lane-runtime", "pi-evolution", "pi-components-migrated"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Lane Harness 历史附录

Lane 围绕处理道与持久 Operation 编排输入，内存 Drive 负责推进，产品 Worker 连接模型、工具和远端接入。它提供一个研究“持久工作记录与进程内驱动如何分开”的案例。

| 章节 | 要回答的问题 |
|---|---|
| [层次与主线](architecture.md) | Worker、Harness、Lane、Operation、Drive 怎样关联？ |
| [状态与进程链](runtime.md) | Drive 如何分派，Client/Server/Worker 在哪里交接？ |
| [架构路线](evolution.md) | 公开 API 与产品默认入口怎样区分，持久路线如何改变？ |
| [Chord 与 Radius](components.md) | 组件组合、状态复制与远端传输怎样连接运行层？ |

先从层次章区分持久 Operation 和在线 Drive，再在运行章追一次分派与反馈；Chord/Radius 章把视线移到服务发布和远端采用。最后用架构路线说明这些机制与 AgentSession、Pico5 的关系。
