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

Pico5 将“历史贡献”“正在做的工作”“当前可变资料”分开建模。先学会辨认这些对象，再读调度流程；流程中的 Session 管提交，Conversation 定范围，Task 保存具体工作的身份。

![Harness 连接代码定义、调度与 Session；Session 管理 Conversation 下的 Entry、Task、Document 和 Submission，模型及工具在事务外执行](../../assets/pico5.svg)

## 先区分事实与句柄

**持久记录**描述过去与现在，能够重新读取；**运行句柄**提供当前进程操作这些记录的能力，重启后需要重建。比如 Task record 可以保存 checkpoint，TaskRuntime 则包含当前 invocation 的调用能力和停止信号；记录保存恢复资料，运行句柄由新进程重新建立。

| 术语 | 所属层与白话含义 | 谁拥有、谁消费 | 持久性／生命周期 |
|---|---|---|---|
| Harness | 应用运行门面，连接 Session、Registry 和 scheduler | 应用打开并持有；产品调用其会话接口 | 进程内句柄 |
| Session | 事务与存储边界，串行组织状态修改 | Harness 组合；TaskRuntime 等向它提交 | 状态落入 Storage，句柄重建 |
| Conversation | 一段历史和工作范围的持久身份 | Session 保存；模型生成和工具关联到它 | 可 fork；handle 不是全部事实 |
| Entry | 不可变历史贡献，例如用户消息、assistant 或工具结果 | Conversation 可见历史；ContextView 投影消费 | 追加记录，记录可有 model 贡献 |
| Task | 持久工作的身份、类型、输入、状态和 checkpoint | Conversation 或父 Task 拥有；scheduler 推进 | 可恢复记录 |
| TaskRuntime | 当前一次 Task invocation 的操作能力 | scheduler 创建；阶段函数消费 | 进程内；阶段结束或停止后失效 |
| Document | 类型化可变 JSON，保存当前资料和运行视图 | 按 session/conversation/task scope 寻址 | 事务更新；不是 Markdown 文件 |
| Submission | 输入／写入的接纳及收口记录 | submit 创建；调用者等待结果 | 独立持久身份 |
| Registry | 当前可执行任务、工具和扩展的代码定义 | 应用装配；scheduler 按 kind/version 查定义 | 代码留在进程里 |
| Storage | 读取记录、接收一批事务写入的后端 | Session 使用；Memory/JSONL/SQLite 等实现 | 耐久能力取决于后端 |

术语定义与关系见[类型契约](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/types.ts#L486)、[Harness 门面](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/harness.ts)、[Pico5 设计说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/docs/spec.md#L44)。实际推进以[架构](architecture.md)和[执行章](loop.md)的实现为准。

## status、phase 与当前视图各回答什么

Task 的 `status` 告诉调度器能否运行它，例如 pending、running、waiting、terminal。checkpoint 的 `phase` 告诉任务代码下一步做什么，例如 generation 的 prepare、request、tools。`pi.live` Document 则保存当前会话的工作归属和可展示进度。

以“模型请求读取代码”为例，生成 Task 可以处于 `status=waiting, phase=tools`；其工具 child Task 正在 `status=running, phase=execute`；同一个 Conversation 的 `pi.live.tools` 显示该调用正在运行。它们分别交给 scheduler、任务代码和产品观察者使用。

| 要问的问题 | 应看什么 |
|---|---|
| 这份 Task 是否被当前 invocation 认领？ | Task.state.status |
| 恢复后应该进入哪段任务代码？ | Task.state.checkpoint.phase |
| 用户这份输入最终由谁收口？ | Submission 与 pi.live.run |
| 当前可以展示哪些输出？ | 已提交 Document／Entry 的视图 |
| 下一次模型会看到哪些语义材料？ | ContextView.messages |

## 一个用户任务为什么会有很多 Task

用户提交一个输入后得到 Submission。该输入被放入 Conversation，开始一段运行；`pi.live.run` 保存 inputs 及当前负责收口的 generation Task。模型请求工具时，这个 generation 创建并等待工具 child Task；工具结束后，它创建 successor generation，并把 run 的控制权交过去。

因此，**一个生成 Task 终止，不表示用户任务已经结束**。一项需要读、改、验证的任务，可以对应多个 generation 和多个 tool Task，而用户仍等待同一个 Submission。`endRun` 才按当前归属收口输入并清理 live 状态。[run 归属字段](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/live.ts#L43)、[生成之间的移交](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L663)。

Pico5 的 Session 组织事务，AgentSession 编排交互产品；两者的具体职责在各自构造章展开。两者都组织对话，但对象边界和恢复方式不同。读完本词典，应能把“输入已接纳、生成正在请求、工具正在执行、视图已经更新”分别放到正确对象上。
