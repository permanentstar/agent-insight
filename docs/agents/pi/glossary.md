---
id: "pi-glossary"
title: "AgentSession 概念词典"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: []
evidence: ["source"]
verified_scope: "词典中的层次、构造与对象关系已静态核验；未执行目标 Agent。"
---

# AgentSession 概念词典

这些名字处于不同层，尤其不要把 AgentSession 和 SessionManager 都理解成“存储 session”。

| 术语 | 层次 | 白话含义 / owner | 持久性与生命周期 |
|---|---|---|---|
| AgentSessionRuntime | 产品入口 | 管理可替换的活动 session 及构造工厂 | 进程内；不是历史文件 |
| AgentSession | 产品编排 | 组合 Agent、SessionManager、资源和设置，处理产品输入 | 进程内；事件处理会写会话 |
| Agent | 执行包装 | 持有当前消息、工具及流控制，调用 agent-loop | 进程内；不等同 durable Task |
| agent-loop | 执行流程 | 驱动模型 turn、工具和续跑 | 一次执行的控制流程 |
| SessionManager | 历史与投影 | 管理 append-only 条目树、leaf 与上下文投影 | 文件内容可保留；对象本身是进程内句柄 |
| ModelRuntime | 模型服务 | 管理模型、认证及 provider 请求入口 | 可由调用者注入和复用，不能笼统称全局单例 |
| turn | 模型执行 | 一次 assistant 响应及其工具结果 | 不能与一次用户 prompt 或整段会话混称 |
| steering / follow-up | 输入调度 | 流中插入输入 / 自然结束后续跑输入 | 由 Agent 队列消费；不是历史分支 |

构造证据见 [SDK](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/sdk.ts#L191)，词典与 [主链路](loop.md) 联读。
