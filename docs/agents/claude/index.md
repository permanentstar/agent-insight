---
id: "claude-index"
title: "Claude Code（冻结）分册"
subject: "claude"
status: "index"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-official", "claude-legacy"]
depends_on: ["claude-migrated", "claude-context"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# Claude Code（冻结）分册

Claude 依用户要求冻结历史材料，不跟踪线上更新。三个原稿的源码 snapshot SHA 未知，正文保持历史转述。

阅读顺序：[层次与主链路](architecture.md) → [压缩与记忆](context.md)。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 入口、工具、权限、多 Agent 粒度及上下文层次已重整。 | 原源码未独立核验；snip/contextCollapse 的缺失实现与显式队友接单问题保留未知。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。
