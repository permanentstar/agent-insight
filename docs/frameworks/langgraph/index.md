---
id: "langgraph-index"
title: "LangGraph分册"
subject: "langgraph"
status: "index"
baselines: ["langgraph-20261009"]
sources: ["langchain-stage4"]
depends_on: ["langgraph-migrated"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# LangGraph分册

LangGraph 提供图运行与 checkpoint 恢复机制。先区分图定义、编译门面、每次调用的 Loop 与持久 thread，再解释超步。

阅读顺序：[超步、通道、checkpoint 与恢复](architecture.md)。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| compile、tick/runner/after_tick、pending writes、interrupt 重跑已静态核验。 | DeltaChannel、Overwrite 完整算法及各后端崩溃耐久性未验证。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。
