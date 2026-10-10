---
id: "claude-index"
title: "Claude Code（冻结）分册"
subject: "claude"
status: "index"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-official", "claude-legacy"]
depends_on: ["claude-migrated", "claude-context", "claude-capabilities", "claude-practices"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Claude Code（冻结）分册

Claude 按用户要求冻结历史材料，不追踪线上更新。三个原稿的源码 snapshot SHA 未知，正文保持历史转述；Code、API 与 Managed Agents 的官方实践分开。

阅读顺序：[层次与主链路](architecture.md) → [压缩与记忆](context.md) → [工具、MCP、Bridge 与交互](capabilities.md) → [冻结官方实践](practices.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 原稿的重要结论、独有能力、官方实践和相互冲突的版本描述已整理。 | 原源码未独立核验；精确版本、snip/contextCollapse、部分 gates 与显式 teammate 接单路径缺证据，已登记未知。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
