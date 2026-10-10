---
id: "durable-loop"
title: "Pico5：输入接纳、生成状态机与工具协作"
subject: "pi-durable"
status: "verified-source"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary", "durable-architecture"]
evidence: ["source"]
verified_scope: "Submission、generation 主阶段、工具等待与 run 移交静态核验；教学轨迹为机制示例，未运行模型。"
---

# Pico5：输入接纳、生成状态机与工具协作

Pico5 的用户工作经过 Submission 接纳，在 Conversation 中由一串生成和工具 Task 推进。理解正常流程后，再讨论恢复；否则容易只看到 checkpoint 与事务，却不知道它们服务于哪一项任务。

![同一个 Submission 由 G1 读取、G2 修改、G3 验证、G4 回答推进；工具是各生成的 child，生成之间移交 pi.live.run，最终收口同一个输入](../../assets/pico5-work-chain.svg)

## 一份输入如何开始工作

贯穿案例仍是“读取需求和 CSV 导出代码，修复字段转义，运行已有验证并说明结果”。应用把它作为 input submission 交给 Conversation.submit。Submissions 在 Session 的事务中检查当前是否忙、是否已有排队输入，以及 requestId 是否已接纳。

空闲且没有排队项时，事务追加 UserEntry、创建 status=placed 的 Submission、创建首个 generation，并把 Submission ID 放进 `pi.live.run.inputs`。输入接纳时已经有持久身份，后续不需要通过模型文字判断“这还是不是刚才那份工作”。忙时可按 whenBusy 选择 reject、steer 或 followUp；排队内容进入 InboxDoc，等对应边界放置。[接纳实现](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/submissions.ts#L142)。

| 输入进度 | 记录状态 | 含义 |
|---|---|---|
| 忙时接纳并等待 | queued | 尚未放入运行历史，由队列边界处理 |
| 正式放入本次工作 | placed | 已有 UserEntry，由 run 跟踪收口 |
| 最终回答或相应写入完成 | done | Submission 有持久收口结果 |
| 被取消、重置或其他未回答条件收口 | unanswered + reason | 本次接纳有终点，但没有正常回答 |

状态不是模型写出的任务清单。queued 输入可以进展为 placed 再 done，也可以在放置前被撤回；具体输入模式影响它在哪个运行边界被消费。

## 生成 Task 的主要阶段

![Generation 从 prepare 保存请求 cutoff 后进入 request；回答则结束；请求工具则进入 tools 等待；工具完成后当前 generation 结束并创建 successor；retry 和 poll 是请求旁路](../../assets/pico5-generation-flow.svg)

GenerationTask 的调度 status 与 checkpoint.phase 同时存在。下表只列主要阶段；prepare 内部还可能等待阻塞压缩，但它不改变用户任务目标。

| phase | 输入与主要动作 | 保存或等待什么 | 正常走向 |
|---|---|---|---|
| prepare | 解析 agent/settings、渲染 Prompt sections、准备工具声明与预算 | model、thinkingLevel、streamOptions、cutoff | request |
| request | 从 cutoff 重建上下文，运行 beforeRequest，请求模型 | 模型调用在事务外；完成后分类并提交 | 回答终态或 tools |
| tools | 等待该轮工具 Task，按串行配置派发剩余调用 | assistant、tools IDs、pending call IDs | 处理结果、移交 successor |
| retry | 等待保存的重试时点 | attempt、until | prepare |
| poll | 等待 provider 延后结果 | handle、pollAt、cutoff | 再分类响应 |

cutoff 是这一请求包含的最新 Entry。prepare 完成后保存它，再从同一范围读取请求上下文。这让“模型这次依据哪段资料作判断”有明确边界。它不表示未来所有请求都使用相同历史；下一生成会准备新的范围。[checkpoint 字段与 prepare](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L51)、[request 实际调用](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L184)。

## 按“读、改、验证、回答”展开一项任务

图中 G1—G4 是教学命名。实际模型可能用更多或更少轮次，也可能先补查测试。下面的重点是对象和数据怎样推进，并非假定固定步骤。

**G1 获取事实。** 模型读到用户要求和当前 Prompt，返回 assistant toolCall 要求读需求与代码。事务保存 assistant Entry，创建相应 tool child Task，并把 G1 设为 waiting/phase=tools。工具执行后保存结果；G1 在工具全部收口后重新进入 tools 阶段处理结果。

**G2 作出修改。** G1 的工具轮次结束，程序创建 G2，并将 `pi.live.run.taskId` 从 G1 移到 G2；G1 自己成为 terminal/completed。G2 的上下文包含读工具结果，模型据此选择修改方式。若要求继续查文件，也会形成另一个工具轮次，而不是被程序强迫直接修改。

**G3 验证并可能调整。** 新生成读到修改结果，选择运行验证。工具给出失败时，下一生成可以据失败内容继续修改。它遵循同一个反馈循环；内核并没有将“测试失败”写死为某个唯一修复动作。

**G4 收口输入。** 模型产生正常最终回答。answer 路径保存 assistant Entry，在最终边界处理队列，并由 endRun 收口 run.inputs 中的 Submission。若存在 onYield 的继续要求，满足相应条件时也可以把同一 run 再交给 successor，而不是立刻 done。[创建工具轮次](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L540)、[工具后移交](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L593)、[最终回答与继续钩子](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/durable/src/harness/generation.ts#L508)。

## 同一个时刻的三份数据

假设 G1 正在等待读工具，存储中有以下关系。代码块为字段节选的教学样例，ID 经过简化；不是可导入的完整记录：

```json
{
  "generation": {
    "id": "G1", "kind": "pi.generation",
    "state": {
      "status": "waiting",
      "checkpoint": { "phase": "tools", "assistant": "E2",
                      "tools": ["T1"], "pending": [] },
      "on": ["T1"], "policy": "allSettled"
    }
  },
  "tool": {
    "id": "T1", "kind": "pi.tool", "owner": "G1",
    "state": { "status": "running",
               "checkpoint": { "phase": "execute",
                               "arguments": { "path": "src/export.ts" },
                               "replay": "safe" } }
  },
  "pi.live": {
    "run": { "taskId": "G1", "inputs": ["S1"] },
    "tools": [{ "callId": "read-1", "name": "read",
                "taskId": "T1", "status": "running" }]
  }
}
```

generation 的 checkpoint 管理这一轮应等待谁；tool 的 checkpoint 管理具体效果的恢复；pi.live 管理会话当前归属与展示。它们可能同批改变，却不能互换。样例假设工具明确声明 replay=safe；未声明时源码默认 unsafe。

工具完成后，T1 有结果 outcome 和结果 Entry；G1 处理该轮后终止，pi.live.run.taskId 改为 G2。S1 仍在 run.inputs 中，直到最终收口。这个中间状态解释了为什么“一个生成已经完成”不能作为用户任务完成判定。

## 自然语言、结构化控制与动态选择

用户目标、Prompt sections、工具返回文本、摘要主要表达语义。Entry 的 model 贡献承载这些消息，ContextView 负责组织；模型产生 toolCall，再由程序转换成工具 Task。模型并不直接修改 Task status，调度器也不负责理解自然语言中的下一步计划。

Pico5 默认提供的是反馈循环。应用可用 Registry、任务定义、hooks 与 Document 构建额外规划流程，但内置 generation/tools 主链路没有固定的独立 Planner→Executor→Replanner。Task 持久化与 Plan & Execute 属于两个维度：前者回答工作怎样保存，后者回答决策怎样分工。

与 AgentSession 相比，两者都让工具结果参与下一次模型选择。差别在于 AgentSession 在同一进程内 loop 连续推进，Pico5 把每次生成、工具等待和控制移交写入记录。这个差异比“都叫 Agent loop”更能说明实现策略。[模式比较](../../comparisons/execution-modes.md)将两者放到同一任务中对照。

学习自检：G1 终止时 S1 为什么还未 done？cutoff 与 checkpoint.phase 各限定什么？工具结果如何影响模型，却不直接代替调度状态？能沿图回答这些问题，就能继续阅读 [Document 与上下文](documents.md)。
