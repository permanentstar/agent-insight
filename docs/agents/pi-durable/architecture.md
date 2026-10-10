---
id: "durable-architecture"
title: "Pico5：事务、任务与副作用恢复"
subject: "pi-durable"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary"]
evidence: ["source", "official"]
verified_scope: "Task 恢复、工具 intent/replay 与 Session 提交顺序静态核验；未做 crash 注入及实际存储耐久性测试。"
---

# Pico5：事务、任务与副作用恢复

Pico5 把执行进度变成可保存的 Task 状态，再由调度器按 checkpoint 推进。Session 负责一批记录的提交；模型请求和工具效果发生在事务之外。这套设计首先改变的是**工作如何表示和恢复**，并不指定模型必须采用哪种规划策略。

![Harness 接纳用户 Submission；TaskScheduler 用 Registry 执行任务；Session 将 Entry、Task 和 Document 同批提交给 Storage 后发布](../../assets/pico5.svg)

## 从应用门面进入事务内核

应用打开 Harness 时，提供 Storage、Models、Registry 等能力。Harness 连接 Session 与 TaskScheduler，并提供 root Conversation 和相关会话操作。Session 是统一修改记录的地方；scheduler 观察提交，决定哪些 Task 可以推进；Registry 给出任务 kind/version 对应的当前代码。

| 层次 | 构造与调用关系 | 主职责 | 不应混入的职责 |
|---|---|---|---|
| 产品／应用 | 调用 Harness.open、root、submit | 准备环境、模型和可用能力 | 不直接替任务重写 checkpoint |
| 接纳与会话 | Conversation → Submissions | 接纳输入、排队、放置历史与收口记录 | 不靠模型文字表示执行所有权 |
| 任务执行 | scheduler → Registry phase → TaskRuntime | 认领工作、执行阶段、等待 child | 不把 JS 程序栈当持久状态 |
| 事务内核 | TaskRuntime.commit → Session.commit → Storage.commit | Entry、Task、Document 等同批变化 | 不包含任意外部工具效果 |
| 观察 | 已采用的记录／Document → 订阅与复制视图 | 向产品展示已提交进度 | 不接管模型或工具调度 |

应用门面与 session 的装配见[Harness](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/harness.ts)。这里的“一个 Session”是一条状态修改线；Conversation 可以有多个，Task 可以形成所有权树。要理解具体生成工作，接下来分别看 Task 调度状态和任务自身阶段。

## Task 状态机：能不能执行，与执行哪一步分开

![Task 从 pending 被认领为 running；可提交新 checkpoint、等待 child 后重新运行；完成时直接 terminal 或先 completing 等拥有的工作结束；重开将 surviving running 转为 pending](../../assets/pico5-task-state.svg)

Task record 保存身份、conversationId、kind、version、input、owner 和 state。`status` 是运行内核管理的状态，checkpoint 是任务定义自己的完整恢复资料。比如 `pi.generation` 的 checkpoint 可以指向 request，而 `pi.tool` 可以指向 execute；两者共享调度规则，却不共享业务阶段。

| 状态 | 表示什么 | 正常推进条件与下一状态 |
|---|---|---|
| pending | 已有 checkpoint，等待被认领 | scheduler 找到定义且满足调度条件后 → running |
| running | 被一个进程内 invocation 认领 | 提交新 checkpoint 保持 running；等待 → waiting；结束 → terminal/completing |
| waiting | 当前没有 invocation，等待指定 Task 收口 | 等待条件满足后重新认领 → running，以原 checkpoint 进入阶段 |
| completing | 结果已决定，但仍有普通 owned work 活着 | 不再执行任务代码；下属收口后 → terminal |
| terminal | 持久结果回执，任务不会再执行 | 保存 completed/failed/aborted 等 outcome |

status 为 terminal、outcome 为 completed 是不同层的字段：一个表示不再推进，一个表示工作结果。completed 的生成 Task 可能还把用户运行交给 successor；不能据它推断整个 Conversation 已经空闲。[TaskState 完整定义](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/types.ts#L448)、[调度认领](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/scheduler.ts#L773)、[完成与 owned work](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/scheduler.ts#L1048)。

## 一次 commit 为什么要同时改几类记录

模型返回读取代码的工具调用时，需要保存 assistant Entry、创建 tool child Task、让 generation 进入 waiting，并更新 `pi.live` 的工具视图。它们表达同一个推进动作。如果只保存 assistant，调度器不知道该执行谁；如果只创建工具 Task，模型历史又缺少它的来源。

Pico5 在一次事务中组织这些修改。TaskRuntime.commit 进入 Session 的 mutation line，读取当前事实并准备写入；Storage 接收一批 writes，成功后 Session 采用新的状态，再发布变化。概念性顺序如下：

```ts
await runtime.commit(async tx => {
  assistant = await tx.appendEntry(assistantMessage)
  child = await tx.createTask(toolDefinition, callReference)
  live = await tx.doc(LiveDoc, conversationId)
  live.tools = describeToolRound(child)
  return waitingOn(child, checkpointForToolRound)
})
```

这段是教学伪代码。实际操作使用 typed Entry/Task/Document；它想说明的是**同一工作变化的历史、调度与视图在一个提交边界对齐**。[工具轮次创建](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L540)、[存储、采用与发布顺序](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/session/session.ts#L403)。Storage 提交后的耐久性仍取决于所选后端。

## 恢复是重新进入阶段，不是恢复旧函数栈

打开 scheduler 会加载活跃 Task，将上次留下的 running 改回 pending，同时保留 checkpoint。这表示上一个进程的认领已经失效，任务可以重新被认领。`open` 本身不派发；`resume` 开启调度，submit/wait 等操作也会请求调度推进。[恢复与启用](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/scheduler.ts#L238)、[Submission 推进入口](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/submissions.ts#L54)。

恢复需要当前 Registry 中仍有适用定义。函数不随 Task 存储，因此定义与旧状态的兼容关系也是运行条件；它不是“任何旧状态都能用新代码直接继续”的承诺。这里最重要的区别是：AgentSession 重建历史再开始执行；Pico5 还能重读 Task 的状态，定位到明确阶段。

## 工具 intent：事务怎样靠近外部副作用

![工具 Task 正常进入 call，解析与校验后提交 execute intent；事务外运行工具，再提交结果 Entry 和终态；恢复 execute 时检查 replay](../../assets/pico5-tool-flow.svg)

工具工作先从 assistant Entry 读取调用，找到当前可用定义，准备参数并执行 beforeTool。参数确定后，提交 checkpoint：`phase=execute`、最终 arguments、replay 声明；随后才在事务外调用 `tool.execute`。结束时保存工具结果 Entry、更新视图并提交 outcome。

正常执行的 call handler 会跨过 intent 后直接执行工具并收口；`execute` 阶段 handler 主要用于恢复。这里的 intent 保存“已经决定去做什么”，结果保存“已观察到什么”。一旦提交 intent 后进程消失，外部效果是否发生可能未知，所以恢复只在历史 replay 和当前工具 replay 都为 safe 时重跑。[工具阶段与恢复](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/tool.ts#L35)。

| 中断位置 | 读者应怎样理解 |
|---|---|
| intent 之前 | 尚无这次工具执行的持久意图 |
| intent 之后、result 之前 | 操作可能执行过；恢复不能只凭缺结果判断未执行 |
| result 和终态已提交 | 调度有明确结果，可供 generation 消费 |
| 调用者停止等待 Submission | 只是停止等待；已接纳工作有自己的取消协议 |

这组条件足以理解恢复主线。持久内核保证自己的记录推进，不会把外部文件或 API 操作变成可回滚的数据库事务；是否适合重跑是工具契约的一部分。

## 设计选择

Pico5 增加 Task checkpoint、事务与观察层，使进行中的工作可以被保存和解释；代价是任务阶段必须明确建模，代码与旧记录必须相容。它没有取消模型的动态决策：下一个动作仍由模型根据上下文选择，内核负责把选择变成有身份的工作并推进。

学习自检：一个 Task 的 status 与 phase 各回答什么？为什么保存 assistant、创建 tool Task 和改变 waiting 状态应当同批提交？工具意图已保存为什么仍可能出现未知结果？下一章用完整案例把这些对象串起来。
