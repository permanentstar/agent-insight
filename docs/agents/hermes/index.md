---
id: "hermes-index"
title: "Hermes分册"
subject: "hermes"
status: "index"
baselines: ["hermes-20261009"]
sources: ["hermes"]
depends_on: ["hermes-migrated"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# Hermes分册

Hermes 的 AIAgent 是共享编排门面，实例生命周期由 CLI/Gateway 等宿主决定。正文追到 conversation_loop 与 tool_executor 的真实阶段。

阅读顺序：[宿主、循环与存储边界](architecture.md)。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| CLI/Gateway 构造、原生模型工具循环及消息批次提交已静态核验。 | ACP、全部平台/provider、压缩 fence、cron 和多 Agent 共享规则未穷举。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。
