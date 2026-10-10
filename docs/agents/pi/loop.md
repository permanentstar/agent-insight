---
id: "pi-loop"
title: "AgentSession：一次输入到实际执行"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-architecture"]
evidence: ["source"]
verified_scope: "prompt、loop 的主链路与列出的停止/继续分支静态核验；未运行请求与工具。"
---

# AgentSession：一次输入到实际执行

Pi 的默认执行方式是模型与工具反馈循环：程序准备一次请求，模型决定回答还是调用工具，程序执行并把结果送回模型。计划可以在这条链路中形成和修订；默认内核没有要求每个请求都先经过一份独立 Planner。

![AgentSession 先处理输入和请求准备；Agent loop 请求模型，工具结果和 steering 进入下一轮，自然结束后再检查 followUp](../../assets/pi-loop-flow.svg)

## 用一项完整任务读懂三个时间尺度

贯穿案例是：“读取需求和导出代码，将 CSV 导出调整为正确处理逗号、引号和换行，运行已有验证，并说明结果。”下面是用于解释机制的一条可能轨迹，工具选择和具体轮数由模型与实际资料决定。

| 尺度 | 在案例中是什么 | 源码对应 |
|---|---|---|
| 产品会话 | 这段对话及其历史，可接收很多用户任务 | AgentSession + SessionManager |
| 一次活跃运行 | 从提交本次要求，到循环自然结束或被停止 | Agent activeRun，包住 runLoop |
| 一个 turn | 一次 assistant 响应，以及它请求的工具结果 | runLoop 的内层推进单位 |

第一个 turn 可以请求 `read` 查看需求和代码；第二个 turn 根据结果调用 `edit`；第三个 turn 调用 `bash` 执行验证；第四个 turn 说明修改与测试结果。它们属于同一用户任务。**模型响应包含两个工具调用时，这两个调用也是同一个 turn 的工具批次，不会自动变成两份用户任务。** [内层与外层循环](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L163)。

## 第一步：产品输入先变成可执行的请求材料

`AgentSession.prompt` 接收文字和图片。输入如果命中扩展命令，可以直接被命令处理；普通输入经过 input handlers 后再展开 skill 命令和 prompt template。这样 `/skill:...` 的内容进入模型前，已经变成具体的任务资料，而不是让底层 loop 理解技能目录。

会话正在运行时，输入按指定行为进入 steer/followUp 队列。空闲时，产品检查模型和认证，按需要先处理上下文压缩，然后调用 `before_agent_start`。这个钩子可以参与模型、Prompt 和工具选择；完成图片规范化后，程序构造 user/custom/system 等消息，并调用 `_runAgentPrompt`。

这个顺序有教学意义：**用户文字、技能文本和工具集合都属于请求材料；开始执行之前，它们已经过产品层组织。** loop 不需要从原始终端命令重新推导它们。[完整 prompt 准备](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L1968)。

## 第二步：一个 turn 怎样从消息走到效果

进入 Agent 后，程序取得当前消息和工具的快照，创建运行控制。`runLoop` 在后续轮次调用 `prepareNextTurn`，在每次请求前调用 `prepareRequest`；随后 `streamAssistantResponse` 经过 context transform、消息转换和 provider stream 发起模型请求。

一次返回可以同时包含自然语言内容与结构化 toolCall。比如模型说明要先查看代码，并请求读取文件。下面仅展示教学需要的消息字段，省略 timestamp、usage 等字段；它不是一次真实运行日志：

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "先查看导出函数和已有用例。" },
    { "type": "toolCall", "id": "call-read", "name": "read",
      "arguments": { "path": "src/export.ts" } }
  ]
}
```

程序依据 `name` 找到工具定义，准备和校验参数，经 `beforeToolCall` 后执行 `tool.execute`，再处理结果。模型提供的是**动作请求**；工具调用的解析、可用性、参数处理和实际执行属于程序。一次工具批次可串行或并行，配置以及工具自己的 executionMode 决定选择。

```json
{
  "role": "toolResult",
  "toolCallId": "call-read",
  "toolName": "read",
  "content": [{ "type": "text", "text": "exportCsv 当前直接用逗号连接字段……" }],
  "isError": false
}
```

下一次模型请求携带 call 与 result。程序没有写死“read 后必定 edit”；模型可能改为继续查看测试、澄清要求或修改代码。这里同时存在两种结构：call ID、工具名、参数和结果角色是固定协议；“下一步怎样解决任务”是依据自然语言和观察动态决定的语义过程。[消息转换与真实模型请求](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L381)、[工具批次与策略](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L508)、[工具调用准备](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L708)。

## 第三步：模型完成响应以后，谁决定继续

一个 turn 结束并不必然结束整个运行。工具结果会促成下一次请求，steering 可以加入新要求，`finishTurn` 也可以要求继续或结束。先理解正常分支，再看必要的中断条件。

| 当前轮次的结果或控制 | 程序走向 | 案例中的含义 |
|---|---|---|
| 有工具调用，工具批次允许继续 | 内层循环进入下一请求 | 读完代码以后让模型决定修改方式 |
| 有 steering 输入 | 内层在规定边界加入消息后继续 | 用户补充“也要处理空字段” |
| 模型自然回答结束，仍有 followUp | 外层取出输入，再进入内层 | 当前修改说明完成，再补一段文档 |
| finishTurn 要求 continue | 保证有后续请求；已有续跑路径可满足 | 扩展需要模型继续完成未收口工作 |
| finishTurn 要求 end | 发布当前 turn 后结束运行 | 产品扩展明确决定本次停止 |
| 无工具、无队列、无继续要求 | agent_end，释放 activeRun | 本次任务结束 |

steering 不会直接改写正在返回的模型响应。它是在下一请求边界参与决策；followUp 则等当前工作自然可以停止时才消费。外层循环正是为了表达这个差别。[队列消费与 finishTurn](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L280)、[产品队列说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L2202)。

可以将正常控制流压缩为以下伪代码，但不能把它当成源码中的统一状态枚举：

```ts
while (workCanContinue) {
  prepareMessagesAndRequest()
  assistant = await model()
  results = await executeRequestedTools(assistant)
  decision = await finishTurn(assistant, results)
  if (decision === "end") break
  chooseNextRequest(tools, steering, followUp, decision)
}
```

## 执行模式：同一循环可以怎样规划

默认链路允许模型在消息中写方案、用工具获取事实，再调整动作。这符合“行动结果反馈下一次决策”的机制；是否使用严格的 ReAct 提示格式，取决于实际 Prompt 和模型协议。不能因为有工具循环，就声称复现了论文的全部设置。

Pi 仓库还提供 **Plan Mode 示例扩展**。开启后，它关闭内置 edit/write，过滤 bash 调用，注入规划上下文；从 `Plan:` 编号文本提取步骤，再由交互选择是否执行。执行阶段恢复工具，用 `[DONE:n]` 标记追踪进度，并把扩展状态记入会话。这个方案复用了 AgentSession 的输入、工具和结束事件，**没有换成独立的 Planner 模型和 Executor 调度器**。[示例说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/examples/extensions/plan-mode/README.md)、[工具控制与 Prompt 注入](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/examples/extensions/plan-mode/index.ts#L163)。

这里的规划有两层：模型用文字形成步骤，扩展保存清单并切换行为。若希望“步骤 1 完成后必须由程序派发步骤 2”，还需要显式步骤状态和调度契约。文本标记和工具过滤本身不能提供这种契约。模式概念与选型见[执行模式比较](../../comparisons/execution-modes.md)。

## 事件如何回到产品与历史

Agent 将 message_start/update/end、tool_execution 等事件送回 AgentSession。产品通过这些事件展示进度、运行扩展并追加历史。流中间内容与完整消息不同，完整消息与工具的实际效果也不同；这解释了为什么 UI 看见文字不意味着当前运行可以跨进程恢复。

必要的停止分支包括 error/aborted 的硬退出，以及 length 截断时对工具调用形成失败结果而不执行可能残缺的参数。它们保护循环边界，详细历史组织见下一章。本章依据源码展开正常路径，没有发起真实模型请求。

学习自检：能否沿本章案例指出每次模型请求的输入新增了什么？用户补充要求由哪一个队列进入？模型最后一句“已完成”和 `agent_end` 分别表达语义结论和程序终点，二者为什么还需要工具结果支持？
