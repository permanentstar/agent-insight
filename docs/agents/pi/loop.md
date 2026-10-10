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

一次 prompt 先经过产品输入处理，才进入 Agent loop。循环不是简单“有 tool call 就继续”：steering、follow-up、finishTurn 和请求准备钩子都会影响下一轮。

![Pi 输入在 AgentSession 处理后进入 Agent loop，模型和工具由下层执行，事件再回到会话存储](../../assets/pi-session.svg)

| 当前位置 | 上层 | 下层与真实执行 | 状态归属 |
|---|---|---|---|
| 产品输入 | UI / SDK | AgentSession.prompt | 输入处理、压缩和产品事件由 Session 编排 |
| 模型轮次 | Agent.prompt | runLoop / streamAssistantResponse | Agent 当前消息与队列 |
| 工具批次 | runLoop | executeToolCalls → tool.execute | prepare/execute/finalize 分层，权限须追执行钩子 |

主路径从 AgentSession.prompt 开始：extension slash command 可提前处理；输入 handler 可转换或处理输入；skill/template 展开；运行中输入须选择 steer/followUp；请求前检查模型/auth 和压缩；before_agent_start 等钩子参与 prompt 与工具选择；最后调用 `_runAgentPrompt` 进入 Agent。

runLoop 有内外两层循环。prepareNextTurn/prepareRequest 可以在规定边界调整上下文、模型或 thinking；streamAssistantResponse 发起真实请求；模型若返回有效工具调用，执行工具批次并追加结果。执行策略可以串行或并行，不能沿用旧“始终串行”结论。

| 条件 | 实际走向 | 限制 |
|---|---|---|
| error / aborted 响应 | finishTurn 通知后 turn_end / agent_end | 保持硬退出 |
| length 截断且含 tool calls | 为调用形成失败结果 | 不执行可能损坏的参数 |
| finishTurn 返回 end | 当前 turn 发布后结束 | 不消费剩余队列 |
| finishTurn 返回 continue | 保证下一次请求 | 已有工具/队列续跑可满足，无需重复加轮 |
| steering 有输入 | 内层继续 | 与 follow-up 消费时机不同 |
| 自然结束且 follow-up 有输入 | 外层重新开始 | 不能把 follow-up 当同一模型响应 |

证据：[产品 prompt](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session.ts#L1968)、[循环](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent-loop.ts#L169)、[Agent 包装](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/agent/src/agent.ts#L371)。嵌套工具调用应追同一工具 hook 路径；不能把存在 guard 名称当安全边界已验证。本文没有发起真实模型或工具请求。
