---
id: "codex-index"
title: "Codex分册"
subject: "codex"
status: "index"
baselines: ["codex-20261009"]
sources: ["codex-official"]
depends_on: ["codex-plan", "codex-official-migrated"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# Codex分册

Codex 已从官方实践材料转为开源 Rust core 源码分析。Thread、SessionTask、TurnContext、StepContext 与 rollout 分开说明。

阅读顺序：[线程、轮次与执行](architecture.md)。[旧官方实践](official-practices.md)独立保留历史属性。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 构造、操作分派、模型流、工具编排与 writer 入队/确认已静态核验。 | 完整 compaction、现代 agent runtime、子 Agent、全部环境与桌面宿主尚未核验。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。
