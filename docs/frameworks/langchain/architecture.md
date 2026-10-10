---
id: "langchain-migrated"
title: "LangChain：框架与教程分层"
subject: "langchain"
status: "migrated-unverified"
baselines: []
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage5", "langchain-stage6"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "教程按共同层次归并，源码入口已定位；API 与主干机制未逐章刷新。"
---

# LangChain：框架与教程分层

旧材料同时包含框架学习路线和应用示例。初版保留教学价值，但把 Runnable、模型/消息/工具、create_agent 与 middleware 划成明确层次。

| 层次 | 问题 | 对应旧材料 |
|---|---|---|
| 通用组合 | Runnable/LCEL 的输入输出、invoke/stream/batch | Stage 1 |
| 模型协议 | messages、model wrapper、tool schema 与结果 | Stage 2 |
| 应用工作流 | two-step RAG 与 agentic RAG 的取舍 | Stage 3 |
| Agent 构图 | create_agent、middleware 与 ToolNode 协作 | Stage 4，与 LangGraph 分册互链 |
| 观测 | tracing 能看到哪些事件，能否证明业务成功 | Stage 5 |
| 包边界 | core、langchain、partners 各自承担什么 | Stage 6 |

教学代码不能证明最新版 API、执行顺序或生产行为。旧“仅看最新版”“必须补框架”等学习建议不是本仓库指令。实际源码入口已找到 libs/langchain_v1/langchain/agents/factory.py、agents/middleware/types.py 和 libs/core/langchain_core/runnables/base.py；下一轮从它们的构造和调用点补证。

LangChain 最新主干与 DeerFlow 的实际 lock 组合单独核验，不将两仓库恰好同日更新视为兼容验证。
