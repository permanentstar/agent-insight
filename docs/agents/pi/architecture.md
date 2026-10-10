---
id: "pi-architecture"
title: "AgentSession：层次、构造与生命周期"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-glossary"]
evidence: ["source"]
verified_scope: "默认组合根、SDK 注入与主要对象生命周期已静态核验；未运行 CLI 或模型请求。"
---

# AgentSession：层次、构造与生命周期

当前实现将产品会话和单次执行分层。CLI 的组合根构造 services，然后创建 AgentSession；SDK 也允许调用者直接提供底层对象。

![Pi 默认 CLI 或 SDK 组合 AgentSession，Agent loop 执行模型工具，SessionManager 保存历史和投影](../../assets/pi-session.svg)

| 当前位置 | 上层调用者 | 下层 | 状态与副作用 owner |
|---|---|---|---|
| 产品组合根 | main / SDK 调用者 | createAgentSessionServices、createAgentSessionFromServices | 入口决定资源、cwd 和对象复用 |
| 产品 session | SDK | Agent、SessionManager、SettingsManager、ModelRuntime | AgentSession 调输入、扩展和写历史 |
| 单次执行 | AgentSession.prompt | Agent.prompt / agent-loop | 当前运行和模型工具控制在进程内 |

`createAgentSession` 优先采用显式 cwd、提供的 SessionManager cwd，然后才使用进程 cwd。它可以采用注入的 ModelRuntime、SettingsManager、SessionManager 和 ResourceLoader；缺失时创建默认实现。先从 SessionManager 构造已有上下文，再创建 Agent，最后将这些对象注入 AgentSession。

Agent 的 streamFunction 路由到 ModelRuntime.streamSimple；extension request hooks 和 transformContext 位于相应请求边界。AgentSession 订阅 Agent 事件，管理产品消息持久化。AgentSessionRuntime 管理活动 session 的替换，因此“一个 CLI 进程”不等于“永远只有一个 AgentSession 实例”。

证据：[main 组合根](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/main.ts#L751)、[SDK 创建与注入](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/sdk.ts#L191)、[services 组合](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session-services.ts#L135)、[runtime 工厂](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/agent-session-runtime.ts)。下钻时先看 [词典](glossary.md)；模型循环见 [执行章](loop.md)，持久历史见 [状态章](context.md)。
