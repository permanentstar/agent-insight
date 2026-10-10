---
id: "deerflow-index"
title: "DeerFlow 分册"
subject: "deerflow"
status: "index"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: ["deerflow-migrated", "deerflow-middleware", "deerflow-runtime", "deerflow-context", "deerflow-capabilities"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# DeerFlow 分册

DeerFlow 在框架之上增加接入、运行管理、产品策略、能力目录和执行环境。Gateway 与嵌入式 Client 共用装配能力，但图实例的复用方式不同，因而中间件的成员状态也有不同作用域。

| 章节 | 要回答的问题 |
|---|---|
| [架构总览](architecture.md) | run、thread、graph instance 分别由谁拥有？ |
| [运行与存储](runtime.md) | 执行权、终态、checkpoint 和事件读取如何分工？ |
| [中间件](middleware.md) | 装配顺序怎样变成 hook 顺序与效果点控制？ |
| [Prompt 与压缩](context-prompt.md) | 稳定规则、请求事实、持久上下文和摘要怎样分层？ |
| [能力与环境](capabilities.md) | 工具、Skill、Sandbox 和子 Agent 怎样绑定生命周期？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
