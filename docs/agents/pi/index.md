---
id: "pi-index"
title: "Pi AgentSession 分册"
subject: "pi-session"
status: "index"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-architecture", "pi-loop", "pi-context", "pi-extensions", "pi-platform"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Pi AgentSession 分册

当前官方 pi 默认走 AgentSession。AgentSession 负责产品会话编排，Agent/agent-loop 负责模型与工具循环，SessionManager 保存历史树并构造模型上下文。

阅读顺序：[概念词典](glossary.md) → [构造与生命周期](architecture.md) → [一次输入与循环](loop.md) → [历史与上下文](context.md) → [资源与扩展](extensions.md) → [MCP、codemode 与 TUI](platform.md)。[Pico5](../pi-durable/index.md) 为独立实验架构，[Lane](../../history/pi-lane/index.md) 为历史附录。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 默认组合根、循环、历史投影、扩展绑定和平台资源/调用边界。 | 所有 provider、认证服务、TUI 交互和外部效果没有运行验证；不将源码存在当全配置启用。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
