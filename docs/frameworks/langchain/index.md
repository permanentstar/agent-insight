---
id: "langchain-index"
title: "LangChain分册"
subject: "langchain"
status: "index"
baselines: ["langchain-20261009"]
sources: ["langchain-overview", "langchain-stage1", "langchain-stage2", "langchain-stage3", "langchain-stage5", "langchain-stage6"]
depends_on: ["langchain-migrated", "langchain-components", "langchain-retrieval", "langchain-observability", "langchain-learning"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# LangChain分册

LangChain 提供 Runnable、消息、模型和工具协议，并用 create_agent 构图。与负责运行/恢复的 LangGraph 配合阅读；六阶段原稿已收敛成可维护的专题。

阅读顺序：[统一协议与 Agent 构图](architecture.md) → [组合、消息和工具契约](components.md) → [检索链与 Agentic RAG](retrieval.md) → [回调树、Partner 与集成](observability.md) → [六阶段学习路径与校正](learning.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 六阶段重要机制、练习目的、自检与 Partner/DeerFlow 对应均已提炼；旧过度概括有明确校正。 | 没有运行教学练习、模型或 tracing 后端；不声明全部 Partner 能力一致或检索质量已验证。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
