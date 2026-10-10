---
id: "durable-glossary"
title: "Pico5 概念词典"
subject: "pi-durable"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: []
evidence: ["source", "official"]
verified_scope: "代表性对象、定义与运行句柄关系静态核验；未验证全部任务组合。"
---

# Pico5 概念词典

Pico5 的新模型不能把 Lane、Operation 换个名字就解释清楚。先区分不可变历史、可变工作状态和进程内句柄。

| 术语 | 所属层与白话含义 | owner 与关系 | 持久性/生命周期 |
|---|---|---|---|
| Harness | 应用运行门面，连接 Session、registry 和 scheduler | 应用调用 Harness.open | 进程内句柄，不是一个任务 |
| Session | 事务与存储边界，一条 mutation line | 拥有 conversations、entries、tasks、documents、submissions | 状态提交到 Storage；句柄会重建 |
| Conversation | 消息历史和运行范围 | Session 中的持久身份，可 fork | handle 不持有全部会话事实 |
| Entry | 不可变 transcript 记录 | Conversation 的历史内容 | 不等于模型当前可见的全部内容 |
| Task | 可恢复状态机，如模型生成或工具工作 | 归 Conversation 或父 Task 所有 | record 保存状态/checkpoint；代码来自 registry |
| TaskRuntime | 一次 Task 执行时的操作能力 | scheduler 创建并绑定当前 invocation | 进程内，不能保存作为恢复记录 |
| Document | 类型化可变 JSON 状态 | Session 事务更新，用 Chord 操作表达变化 | 值与任务状态可同批提交 |
| Submission | 输入接纳与核销记录 | submit 返回 handle，跟踪所属工作完成 | 取消 wait 不代表取消已接纳工作 |
| Registry | 任务/工具/扩展定义集合 | 应用构造，Harness 绑定 | 进程本地定义，不把函数存数据库 |

术语依据：[Harness 与 Conversation 实现](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/harness.ts)、[Task scheduler](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/scheduler.ts#L238)、[官方 Pico5 规范](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/docs/spec.md#L44)。规范属于官方设计说明；实际行为在 [架构章](architecture.md) 核验。
