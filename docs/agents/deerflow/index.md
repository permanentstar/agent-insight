---
id: "deerflow-index"
title: "DeerFlow分册"
subject: "deerflow"
status: "index"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: ["deerflow-migrated", "deerflow-middleware", "deerflow-runtime", "deerflow-context", "deerflow-capabilities"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# DeerFlow分册

DeerFlow 是产品应用与 Harness，LangChain 构图，LangGraph 执行。先区分 thread、run、graph instance 与存储，再理解配置和执行效果。

阅读顺序：[架构与主链路](architecture.md) → [中间件顺序与 hooks](middleware.md) → [Run 归属与事件读取](runtime.md) → [Prompt、持久上下文与压缩](context-prompt.md) → [工具、子 Agent 与 Sandbox](capabilities.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 两种入口/图复用、完整候选中间件顺序与直接 hooks、Run lease/手工 reservation、压缩投影和子 Agent 构造。 | 未运行多 worker、模型、sandbox 或外部后端；框架锁定组合与两框架主干不同。子 Agent checkpointer=False，不套用 Lead 恢复保证。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
