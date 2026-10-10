---
id: "pi-index"
title: "Pi AgentSession 分册"
subject: "pi-session"
status: "index"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: []
evidence: []
verified_scope: "默认主链路与核心样例已核验；整个产品能力清单未完整刷新。"
---

# Pi AgentSession 分册

当前官方 pi 默认走 AgentSession。它负责产品会话编排，Agent/agent-loop 负责模型与工具循环；SessionManager 保存历史树并构造模型上下文。

阅读顺序：[概念词典](glossary.md)、[架构与构造](architecture.md)、[一次输入与循环](loop.md)、[历史与上下文](context.md)。[Pico5](../pi-durable/index.md) 为独立实验架构，[Lane](../../history/pi-lane/index.md) 为历史附录。

本版是代表性静态核验，尚未完整刷新原长文中的 TUI、全部扩展、认证、MCP、codemode 与平台边界。
