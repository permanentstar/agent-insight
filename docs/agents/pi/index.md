---
id: "pi-index"
title: "Pi AgentSession 分册"
subject: "pi-session"
status: "index"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-architecture", "pi-loop", "pi-context", "pi-extensions", "pi-platform"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# Pi AgentSession 分册

在 Pi 中，一份用户任务先由 AgentSession 准备输入，再交给 Agent 请求模型、执行工具；结果保存到 SessionManager，供后续决策使用。任务变长时压缩上下文，需要新能力时接入扩展。这一册沿对象装配、任务推进、上下文管理和能力接入逐层展开。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | CLI/SDK 的 createAgentSession 装配产品会话。 |
| 工作推进 | AgentSession 准备输入；Agent/agent-loop 执行模型与工具反馈。 |
| 模型与动作 | pi-ai 组织模型协议；当前工具 loadout 接到实际执行对象。 |
| 历史与请求 | SessionManager 的会话记录经分支选择、压缩和编辑成为请求消息。 |
| 扩展与控制 | 扩展 hook、输入队列与 finishTurn 在相应边界影响行为。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [概念词典](glossary.md) | AgentSession、Agent、SessionManager 和 Runtime 分别是什么？ |
| [层次与构造](architecture.md) | CLI/SDK 怎样创建并绑定这些对象？ |
| [一次输入](loop.md) | 输入如何进入模型、工具和结束判断？ |
| [上下文压缩与请求构建](context.md) | 当前分支怎样生成摘要，再进入下一次模型请求？ |
| [扩展绑定](extensions.md) | 注册、激活、hook 与 reload 改变哪一层？ |
| [MCP、codemode 与终端交互](platform.md) | 外部工具和脚本怎样接入同一执行流程？ |

构造章说明对象如何就位，执行章用 CSV 任务贯穿一次运行；上下文章接着解释观察如何用于后续请求，扩展和平台章再说明新能力如何加入这条主线。

## 本册的代码怎样读

正文先用图和案例说明职责，再给对应的关键代码路径。标为“源码节选”的片段保留真实符号和判断，用中文阅读注释标出省略部分与交接目的；标为“流程骨架”的片段按源码顺序整理，但不作为可直接运行的完整函数。新增注释解释职责、采用时机和省略范围，不逐句翻译实现。JSON 消息例子是教学数据。每段旁边的固定源码链接供进一步核查，阅读主线不必先跳到完整实现。

遇到调用其他方法时，先确认它交出了什么、下一层负责什么，再展开下层。构造与绑定从架构章开始；prompt、模型、工具与收口从循环章进入；历史记录怎样成为下一次模型输入，则在上下文章沿同一案例解释。
