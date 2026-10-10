---
id: "durable-index"
title: "Pico5 / pi-durable 分册"
subject: "pi-durable"
status: "index"
baselines: ["pi-20261009"]
sources: []
depends_on: ["durable-glossary", "durable-architecture", "durable-documents"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Pico5 / pi-durable 分册

Pico5 是新持久运行架构，对外包名 pi-durable。旧 Lane 删除后，实验 TUI 与 Session Worker 已迁移到它；官方默认 coding-agent 仍是 AgentSession。

阅读顺序：[概念词典](glossary.md) → [事务、Task 与副作用恢复](architecture.md) → [Document、投影与异步摘要](documents.md)。Chord 与当前 Document 的关系见[独有专题](../../history/pi-lane/components.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 持久工作与数据分层、提交/发布顺序、工具 replay 条件和两类摘要放置边界。 | 所有 storage 后端、复杂交错没有运行验证；旧 navigation/nextRun/resume、子会话服务及 paging 的产品接口缺口保留，不声明会默认上线。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
