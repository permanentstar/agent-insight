---
id: "comparison-control"
title: "比较：理解、规划、委派与控制"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: ["comparison-legacy"]
depends_on: ["pi-platform", "durable-documents", "deerflow-context", "deerflow-capabilities", "claude-capabilities", "codex-context", "hermes-capabilities", "langchain-components", "langgraph-advanced", "deepseek-capabilities"]
evidence: ["source", "historical-document", "static-inference", "proposal"]
verified_scope: "九对象固定基线的静态机制比较；Claude 是冻结转述，候选设计明确标注；未做运行或性能测量。"
---

# 比较：理解、规划、委派与控制

开放任务的理解会随工具结果改变；身份、会话和具体效果授权则需要在确定的位置执行。因此接纳输入、模型决策、计划更新、子 Agent 委派和工具授权应分别追踪，不能用一个 Planner 概念覆盖它们。

![身份与能力接纳进入模型循环，模型可回答或请求工具及子 Agent；每次效果先经过控制，观察结果后继续决策，最终验收和交付分开](../assets/comparison-control.svg)

九个对象的定位见 [对象矩阵](matrix.md)。下表比较谁决定动作、谁拥有活动工作，以及结果回到哪里；具体行为仍受所选配置约束。

| 对象 | 权威状态与所有者 | 构造与生命周期 | 实际机制与执行点 | 提供的能力 | 机制边界 | 深入阅读 |
|---|---|---|---|---|---|---|
| AgentSession | Session 的模式/扩展，Agent 当前循环 | SDK 装配 active tools；扩展绑定会话 | 输入 hook → 模型循环 → 工具；扩展按需加 plan/委派 | 自然语言和工具反馈在同一循环消费 | core 不因 plan 示例存在就变成强制 Planner；未穷举子扩展 | [循环](../agents/pi/loop.md)、[扩展](../agents/pi/extensions.md) |
| Pico5，实验 | Submission/Task 的持久归属 | Harness Registry 提供当前代码，scheduler 恢复任务 | generation → tool child Task → outcome → generation | 工作身份与推进恢复点显式 | 内核与实验产品子会话暴露不同；不是强制语义分类器 | [Task](../agents/pi-durable/architecture.md) |
| DeerFlow，应用 | Lead 图、RunManager 与子执行器 | Lead 按入口持有；子 Agent 另建图 | task_tool → executor → create_agent(checkpointer=False) | child 输出通过工具/Command 回父，不混同 Lead checkpoint | 子图不提供同等持久恢复；prompt 规约不等同执行授权 | [子 Agent](../agents/deerflow/capabilities.md)、[Run](../agents/deerflow/runtime.md) |
| Claude | 主 query、异步子 Agent/团队各自状态 | 隔离上下文，执行环境可以共享 | Task、团队通知与工具 executor 分层 | 命令、子 Agent 与团队协作粒度不同 | 显式分配后可靠接单的执行路径缺少证据 | [架构](../agents/claude/architecture.md)、[能力](../agents/claude/capabilities.md) |
| Codex，core | Thread/AgentControl/registry | 父身份、容量、驻留先准入，再启动子线程 | spawn_agent_internal → reserve slot → inherit environment → publish | 子线程有独立身份与准入，fork/resume 与 Git 分开 | V1/V2/source 分支不同；不代替任务验收 | [子线程](../agents/codex/context-capabilities.md) |
| Hermes，原生 | 宿主 prompt 排队、AIAgent 与 delegate child | ACP 同会话认领 turn；delegate 新 AIAgent | slash/queue → run_conversation；child 返回 typed status | transport 与对话工作分层，child 结果具名 | 后台任务的恢复与交付由各宿主/provider 分别承担 | [ACP/委派](../agents/hermes/capabilities.md) |
| LangChain，构图 | create_agent 配置与 AgentState | hooks 在建图期组合，模型调用期消费 | 模型/工具循环 + middleware 控制 | 提供可组合决策循环，不要求统一 Planner | 产品路由、身份和多 Agent 由应用实现 | [构图](../frameworks/langchain/architecture.md) |
| LangGraph，执行 | 图边、channels 与 task | compile 注册节点；每超步调度 | static edge + conditional + Command；子图 namespace | 显式状态/路由，动态 goto 可和静态边并存 | 子图不天然是独立 Agent；END 不取消所有兄弟工作 | [图控制](../frameworks/langgraph/advanced.md) |
| DeepSeek，preview | SubagentManager、parent catalog、activation | Profile 选 provider；先保留父归属与容量 | 本地 continuable child 或 external run；delivery parent/caller | 区分持久 child 与一次在线 activation，避免重复父通知 | unknown 可发现不代表可继续；外部一次执行不自动多轮 | [子执行](../agents/deepseek/capabilities.md) |

## 同一输入：任务先查资料，随后发现需要修改

| 时点 | 应承担的判断 | 错误合并的后果 |
|---|---|---|
| 请求到达 | 确认 principal、session、资源引用与显式模式 | 一次自然语言分类可能丢失复合目标 |
| 首次模型调用 | 理解目标、缺口与当前可行路径 | 强制额外分类模型不自动提高准确性 |
| 读完资料 | 修订计划，决定继续、澄清或委派 | 冻结 intent 标签会阻止纠错 |
| 具体写操作 | 检查当前参数、资源、授权和环境 | “最初只读”或“低风险”标签无法阻断新效果 |
| 收到 child 结果 | 区分已完成、中断、失败与可继续身份 | 最终文字不证明文件或外部写入已确认 |
| 请求结束 | 业务验收，再确认投递 | 图/turn 完成不代替接收方 ACK |

## 显式路由与独立规划的取舍

以下是**候选设计**，不是九对象共有实现或本仓库待实现功能。确定性接纳层可以保存 request_id、principal、session、channel、原输入、resource references、显式模式、能力快照引用和 deadline；只有出现真实交付动作时才增加 publish target 与幂等键。不要求所有输入都有固定 intent_class。

开放目标与已观察事实属于可修改的任务状态。显式路由适合处理显式命令、已解析资源类型或明确能力选择；它不能从正文内容猜权限。独立 Planner 适合必须审核计划、重复执行明确流程或有可观测收益的场景；普通交互可由主循环按需规划，减少两份语义判断的同步成本。

评估是否增加 Router，可以在同一模型、环境和任务集下比较主循环、显式路由与额外语义模型。分别记录任务成功、误路由、澄清、授权违规、延迟和成本，才能判断增加一层判断是否值得。