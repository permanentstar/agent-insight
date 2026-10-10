---
id: "deerflow-migrated"
title: "DeerFlow：旧材料消化与核验入口"
subject: "deerflow"
status: "migrated-unverified"
baselines: []
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "四份旧文按统一层次消化；主干目标已登记，具体实现尚未逐章刷新。"
---

# DeerFlow：旧材料消化与核验入口

旧材料的共同结论是：Gateway 负责接入和 run 生命周期；Agent 产品层决定 prompt、tools 和 state；Harness 提供通用机制；LangChain/LangGraph 负责构图和调度。以下是旧文转述，当前目标基线尚未核验。

| 层次 | 旧文中的对象 | 主链路职责 | 最新核验要回答 |
|---|---|---|---|
| 接入与 run | Gateway、RunManager、worker.run_agent | 接纳、准入、取消、SSE 与终态 | run 状态×事件、最终写入点、跨 run 互斥 |
| 产品组合 | make_lead_agent、ThreadState、prompt | 组合模型、工具、middleware | 谁构造 graph；Gateway 与 Client 是否复用不同 |
| 通用能力 | middleware、sandbox、memory、MCP、subagents | 在模型和工具边界插入行为 | hook 顺序、实例范围、跨层状态传递 |
| 构图 | create_agent | 生成节点、条件边与工具节点 | 应用锁定框架版本与当前框架源码的差异 |
| 调度与存储 | LangGraph/Pregel、checkpointer/store | 实际 astream、checkpoint、恢复 | checkpoint 写入与外部效果何时各自完成 |

旧文主链路为 Gateway 接纳 run、RunManager 准入、worker 构造 graph、绑定 checkpointer/store、调用 astream、发布流与保存终态。agent instance 被重建不等于 thread 会话新建；会话事实应追到 checkpoint/storage。

middleware 独有专题需保留：模型钩子、工具包装、before/after 以及跳转，不以一个“拦截器列表”概括。prompt 独有专题区分产品 system prompt、请求上下文临时注入、工具结果和 skills 内容；中间件包含应用代码不等于拥有 prompt。

下一轮按 [模板](../../templates/project.md) 拆正式架构、运行状态、middleware、prompt 与扩展章。本页不把 2026-08-26 的旧源码路径行号迁作今天证据。
