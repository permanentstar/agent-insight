---
id: "claude-migrated"
title: "Claude Code：层次与主链路"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-legacy", "claude-official"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "冻结研究原稿的层次重整；源码 snapshot 的来源和 SHA 未知，原稿描述未独立核验，不代表当前线上实现。"
---

# Claude Code：层次与主链路

Claude Code 可以分成入口与会话、query 循环、工具执行和上下文四层。会话层保存交互状态，query 决定一次输入如何请求模型和继续调用工具，执行器落实校验、权限与反馈。分清这四层，才能解释长会话与单次运行的关系。

![Claude 的 CLI 模式分发、REPL/SDK 会话、query 模型循环与工具权限层](../../assets/claude.svg)

## 概念与职责

| 名词 | 所在层次 | 谁创建/持有、控制什么 |
|---|---|---|
| CLI / main | 模式分发 | 交互 REPL 或非交互/SDK 入口 |
| REPL / AppState | 产品会话与 UI | 持有 messages、工具池、MCP、命令、权限上下文，消费流事件 |
| QueryEngine | 非交互/SDK 会话门面 | 管理非交互会话；query.ts 承担内部循环，两者分别定位 |
| query.ts | 单次 query 的模型循环 | async generator 产出流、assistant、tool result、compact boundary 等 |
| Tool / tool_use / tool_result | 定义、模型请求、执行反馈 | schema/校验/权限/实际 call 分开处理 |
| ToolSearch / deferred tool | 按需发现工具定义 | 按关键词匹配或定名选择，返回定义引用，不执行工具 |
| Skill Discovery / SkillTool | 任务知识发现与加载 | 提示可用技能或载入正文，不直接授予工具执行权限 |
| stop hook | 收口阶段 | 可阻止结束并要求续跑；不是只有通知副作用 |

QueryEngine 与 query.ts 的职责需要分别阅读：前者面向会话与调用方，后者推进模型工具循环。不能因为二者都处理“查询”就把它们合成同一执行层。 参见：[会话层与循环研究](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L60)、[QueryEngine 的另一组描述](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-legacy.md#L95)。

## 一次输入到实际效果

| 当前位置 | 上层 → 下层 | 状态/控制权与输出 |
|---|---|---|
| 接收输入 | REPL handlePromptSubmit / SDK submit | 普通文本、附件、slash command 分流 |
| query 准备 | 会话层 → query.ts | 构建 messagesForQuery，治理过大工具结果和上下文 |
| 模型请求 | query → provider stream | 形成 assistant 内容或 tool_use；runtime 决定工具可见集合 |
| 效果执行 | executor → schema / validateInput / canUseTool → tool.call | 校验和权限在效果之前；允许流式工具执行器参与 |
| 结果回填 | tool_result → messages → 下轮 query | 继续生成模型请求，单次输入可含多轮工具反馈 |
| 结束检查 | 无 tool_use → stop hooks | 可直接结束，或追加信息继续循环 |

模型在给定上下文和工具中选择动作；runtime 准备请求，执行权限检查，安排并发并回填反馈。一次用户输入因此可以包含多个模型请求和工具批次。 参见：[核心链路](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L114)。

## 工具发现、执行与授权

| 边界 | 运行机制 | 作用与边界 |
|---|---|---|
| 定义可发现 | inline 与 deferred tools；ToolSearch 返回引用 | 按需暴露 schema，减少初始定义负担；没有权限保证 |
| 参数可受理 | Tool 的输入 schema 与 validateInput | 模型生成参数仍需校验 |
| 效果可执行 | REPL 绑定 canUseTool 与审批 UI；allow/deny/ask | 需按规则、hook、模式等进一步判定 |
| 并发可安排 | read-only 与 concurrency-safe 属性 | 按声明和批次分组；声明是否正确仍需检查具体工具 |
| 输出可反馈 | tool_result、大小限制与持久输出引用 | 结果参与下一轮请求，不等于活动执行可恢复 |

Skill 的知识加载与 ToolSearch 的 schema 加载服务不同对象。把两者合为“搜索插件”，会掩盖它们进入请求的位置；把任一加载视作执行授权，也会漏掉 canUseTool 的实际调用边界。来源：[发现机制](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L391)、[权限链](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L547)。

## 多 Agent：三种工作粒度

| 类型 | 工作与执行载体 | 共享内容与不能推出的结论 |
|---|---|---|
| background Bash | 单个命令任务 | 与子 Agent 的上下文/模型循环不是同一种工作 |
| AgentTool / LocalAgentTask | 同进程内的异步子 Agent 工作 | Agent type 定义能力和提示边界；不等于 durable Task 重放 |
| teammate / swarm | 长期队友，可用 tmux 进程或 in-process 路径 | 任务表、owner、依赖与 mailbox 协调，不是只传一条 prompt |

auto-claim 在任务 pending、owner 空且依赖满足时争取认领；显式分配则写入 owner，并发送 task_assignment 消息。显式分配后可靠接单的完整执行路径仍缺少证据，因此“写了 owner”不能直接当作工作已经开始的证明。 参见：[任务分配研究](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L470)。

## 状态与故障边界

会话消息、transcript、AppState、活动 query 和长期记忆分属不同生命周期；会话恢复和压缩重建可以重建请求状态，不足以证明工具效果跨崩溃恰好一次。上下文治理的内部层次另见[压缩与记忆专题](context.md)。

| 场景 | 运行行为 | 机制边界 |
|---|---|---|
| prompt too long | 压缩或重建后重试；失败进入收口 | 重试与压缩按触发分支判断 |
| stop hook 阻止结束 | 消息回填后继续 query | “无工具调用”不总是终态 |
| 外部工具已成功但反馈前中断 | 缺少统一 intent/replay 的执行证据 | 不能类比 Pico5 的工作恢复 |
| 客户端与托管平台的能力不同 | 按宿主和对象契约区分 | 使用建议不能直接反推内部实现 |

任务约束、上下文选择、持久规则和 Hooks/MCP 的使用问题，见 [任务与托管边界](practices.md)。使用方式与内部机制相互联系，但仍分别需要配置契约和执行证据。