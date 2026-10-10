---
id: "langgraph-index"
title: "LangGraph分册"
subject: "langgraph"
status: "index"
baselines: ["langgraph-20261009"]
sources: ["langchain-stage4"]
depends_on: ["langgraph-migrated", "langgraph-advanced"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# LangGraph分册

LangGraph 提供图执行与 checkpoint 恢复。先区分图定义、编译门面、每次调用 Loop 与持久 thread，再解释超步和通道。

阅读顺序：[超步、通道与 checkpoint](architecture.md) → [合并、子图、Overwrite 与恢复边界](advanced.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| compile/tick/runner、pending writes、interrupt 重跑、LastValue/Overwrite/Delta 的静态规则与子图差异。 | 未运行真实 saver、崩溃耐久性和重复外部效果实验；checkpoint 与 OS/数据库效果不共用一个事务。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
