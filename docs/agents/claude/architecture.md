---
id: "claude-migrated"
title: "Claude Code：冻结材料中的层次与主链路"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-legacy", "claude-official"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "冻结研究原稿的层次重整；源码 snapshot 的来源和 SHA 未知，原稿描述未独立核验，不代表当前线上实现。"
---

# Claude Code：冻结材料中的层次与主链路

本分册按用户指定冻结历史研究。材料描述了入口/会话、query 循环、工具执行和上下文四层；下文均为**历史材料转述**，没有独立验证原源码，不能证明当前产品行为。原稿标题“3 月底”也不足以锁定准确源码版本。

![Claude 冻结材料中的 CLI 模式分发、REPL 或 SDK 会话、query 模型循环和工具权限层；快照 SHA 未知](../../assets/claude.svg)

## 概念与职责

| 名词 | 原稿中的所在层 | 谁创建/持有、控制什么 |
|---|---|---|
| CLI / main | 模式分发 | 交互 REPL 或非交互/SDK 入口 |
| REPL / AppState | 产品会话与 UI | 持有 messages、工具池、MCP、命令、权限上下文，消费流事件 |
| QueryEngine | 非交互/SDK 会话门面 | 三月底原稿将它与 query.ts 区分；早期原稿更笼统地称查询中枢 |
| query.ts | 单次 query 的模型循环 | async generator 产出流、assistant、tool result、compact boundary 等 |
| Tool / tool_use / tool_result | 定义、模型请求、执行反馈 | schema/校验/权限/实际 call 分开处理 |
| ToolSearch / deferred tool | 按需发现工具定义 | 原稿描述为关键词匹配与定名选择，不是替模型执行工具 |
| Skill Discovery / SkillTool | 任务知识发现与加载 | 提示可用技能或载入正文，不直接授予工具执行权限 |
| stop hook | 收口阶段 | 可阻止结束并要求续跑；不是只有通知副作用 |

来源：[三月底原稿的分层与循环](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L60)、[早期 QueryEngine 描述](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-legacy.md#L95)。两篇没有可核对的源码 SHA，故保留命名/职责描述差异，**不建立一个确定的版本演进关系**。

## 一次输入到实际效果

| 当前位置 | 上层 → 下层 | 状态/控制权与输出 |
|---|---|---|
| 接收输入 | REPL handlePromptSubmit / SDK submit | 普通文本、附件、slash command 分流 |
| query 准备 | 会话层 → query.ts | 构建 messagesForQuery，治理过大工具结果和上下文 |
| 模型请求 | query → provider stream | 形成 assistant 内容或 tool_use；runtime 决定工具可见集合 |
| 效果执行 | executor → schema / validateInput / canUseTool → tool.call | 校验和权限在效果之前；允许流式工具执行器参与 |
| 结果回填 | tool_result → messages → 下轮 query | 继续生成模型请求，单次输入可含多轮工具反馈 |
| 结束检查 | 无 tool_use → stop hooks | 可直接结束，或追加信息继续循环 |

上述 caller/callee 名称是原稿定位线索，未伪造可点击的原源码链接。原稿中具体入口位置见[核心链路](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L114)。模型负责在已给上下文/工具中选择动作；runtime 负责请求准备、权限、并发和反馈。这一职责解释可以比较，不能转换成对当前实现的测试结论。

## 工具发现、执行与授权

| 边界 | 原稿中的机制 | 可得出的历史解释 / 限制 |
|---|---|---|
| 定义可发现 | inline 与 deferred tools；ToolSearch 返回引用 | 按需暴露 schema，减少初始定义负担；没有权限保证 |
| 参数可受理 | Tool 的输入 schema 与 validateInput | 模型生成参数仍需校验 |
| 效果可执行 | REPL 绑定 canUseTool 与审批 UI；allow/deny/ask | 需按规则、hook、模式等进一步判定 |
| 并发可安排 | read-only 与 concurrency-safe 属性 | 安全可并行组与需串行组分开；未验证全部工具的正确标注 |
| 输出可反馈 | tool_result、大小限制与持久输出引用 | 结果参与下一轮请求，不等于活动执行可恢复 |

Skill 的知识加载与 ToolSearch 的 schema 加载服务不同对象。把两者合为“搜索插件”，会掩盖它们进入请求的位置；把任一加载视作执行授权，也会漏掉 canUseTool 的实际调用边界。来源：[发现机制](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L391)、[权限链](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L547)。

## 多 Agent：三种工作粒度

| 类型 | 工作与执行载体 | 共享内容与不能推出的结论 |
|---|---|---|
| background Bash | 单个命令任务 | 与子 Agent 的上下文/模型循环不是同一种工作 |
| AgentTool / LocalAgentTask | 原稿描述同进程内的异步子 Agent 工作 | Agent type 定义能力和提示边界；不等于 durable Task 重放 |
| teammate / swarm | 长期队友，可用 tmux 进程或 in-process 路径 | 任务表、owner、依赖与 mailbox 协调，不是只传一条 prompt |

原稿将 auto-claim 描述为 pending、owner 空且依赖满足时争取认领；显式分配则涉及 owner 写入与 task_assignment 消息。**原稿自己保留了显式分配后可靠接单链路的 TODO**，本书不将其补成已验证闭环，也不宣称存在确定的“角色→任务”路由器。见[任务分配及待复核项](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-march.md#L470)。

## 状态、故障与材料边界

会话消息、transcript、AppState、活动 query 和长期记忆分属不同生命周期；历史中可看到恢复会话与压缩重建，不足以证明工具效果跨崩溃恰好一次。上下文治理的内部层次另见[压缩与记忆专题](context.md)。

| 场景 | 历史材料描述 | 本书结论边界 |
|---|---|---|
| prompt too long | 压缩/重建后可重试；完整失败路径有收口 | 仅原稿转述，未运行 |
| stop hook 阻止结束 | 消息回填后继续 query | “无工具调用”不总是终态 |
| 外部工具已成功但反馈前中断 | 当前原稿未给统一 intent/replay 证明 | 不能类比 Pico5 的工作恢复 |
| 冻结分析与官方实践有差异 | 将实践作为另类资料保留 | 不能据官方使用建议反推私有实现 |

[官方实践原稿](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-official.md)归并为任务约束、上下文选择、持久规则、权限与 hooks/MCP 的使用观点；其产品描述和机制主张均保持历史属性。本分册已整理三个原稿的主题边界，Bridge/MCP 认证细节、全部 gates 与算法实现仍保留原稿，不宣称已全文核验。
