---
id: "deerflow-index"
title: "DeerFlow分册"
subject: "deerflow"
status: "index"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: ["deerflow-migrated", "deerflow-middleware"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# DeerFlow分册

DeerFlow 是产品应用与 Harness，LangChain 构图，LangGraph 执行。最新主链路已经按 run、thread、graph instance 和存储分层。

阅读顺序：[架构、构造与主链路](architecture.md) → [中间件、Prompt 与门禁](middleware.md)。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 两种入口、图复用、代表工具 policy 与 prompt 已静态核验。 | 完整压缩、所有扩展排序与多 worker 故障未验证；锁定框架组合见基线页。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。
