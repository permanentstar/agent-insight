---
id: "deerflow-index"
title: "DeerFlow 分册"
subject: "deerflow"
status: "index"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: ["deerflow-migrated", "deerflow-middleware", "deerflow-runtime", "deerflow-context", "deerflow-capabilities"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# DeerFlow 分册

DeerFlow 在框架之上增加接入、运行管理、产品策略、能力目录和执行环境。Gateway 与嵌入式 Client 共用装配能力，但图实例的复用方式不同，因而中间件的成员状态也有不同作用域。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | Gateway 管 thread/run 与投递；嵌入式 Client 管自己的实例范围。 |
| 工作推进 | 产品工厂创建 Lead 图；平台 RunManager 和图调度承担不同控制。 |
| 模型与动作 | 模型、工具与 middleware 接入 LangChain/LangGraph 执行。 |
| 历史与请求 | ThreadState/checkpointer 保存图资料，运行及事件存储面向其他消费者。 |
| 扩展与控制 | Prompt、Skills、工具策略、Sandbox 与子执行器按产品装配。 |

架构章先沿一次 run 说明四步交接；middleware 和上下文章放大图内请求与状态；能力章再沿 task 解释子执行；运行管理章最后核对平台归属和收口。

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [架构总览](architecture.md) | run、thread、graph instance 分别由谁拥有？ |
| [运行与存储](runtime.md) | 执行权、终态、checkpoint 和事件读取如何分工？ |
| [中间件](middleware.md) | 装配顺序怎样变成 hook 顺序与效果点控制？ |
| [Prompt 与压缩](context-prompt.md) | 稳定规则、请求事实、持久上下文和摘要怎样分层？ |
| [能力与环境](capabilities.md) | 工具、Skill、Sandbox 和子 Agent 怎样绑定生命周期？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
