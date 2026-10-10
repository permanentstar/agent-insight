---
id: "codex-index"
title: "Codex分册"
subject: "codex"
status: "index"
baselines: ["codex-20261009"]
sources: ["codex-official"]
depends_on: ["codex-plan", "codex-context", "codex-official-migrated"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Codex分册

Codex 已从旧官方实践材料重构为开源 Rust core 源码分析。Thread、SessionTask、TurnContext、StepContext 与 rollout 分开说明，历史产品建议不代替执行证据。

阅读顺序：[线程、轮次与执行](architecture.md) → [规则、工具快照、压缩与子线程](context-capabilities.md) → [历史实践与源码对应](official-practices.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 构造/操作分派、模型工具循环、writer 入队与确认、规则 trust/路径、local/remote compaction 和子线程准入。 | 全部环境与工具、远端摘要和桌面私有宿主未运行；V1/V2/source 分支不同，不推成一种全局默认驻留模型。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
