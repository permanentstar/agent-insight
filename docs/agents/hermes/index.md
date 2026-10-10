---
id: "hermes-index"
title: "Hermes分册"
subject: "hermes"
status: "index"
baselines: ["hermes-20261009"]
sources: ["hermes"]
depends_on: ["hermes-migrated", "hermes-context", "hermes-capabilities"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Hermes分册

Hermes 的 AIAgent 是共享编排门面，实例生命周期由 CLI/Gateway/ACP 等宿主决定。正文追到 conversation_loop、tool_executor、压缩提交与平台反馈的边界。

阅读顺序：[宿主、循环与存储](architecture.md) → [记忆、压缩与提交许可](context.md) → [ACP、Skills、委派与 cron](capabilities.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 原生模型工具循环、消息批次、外部记忆 hooks、压缩 fence/in-place/rotate、ACP turn 队列、delegate 与 cron owner。 | 所有平台/provider、锁交接、重启及外部 delivery 未实测；仅明确隔离的外部后台 worker 适用其跨重启契约。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
