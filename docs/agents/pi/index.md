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

AgentSession 围绕交互会话编排模型和工具；Agent 执行循环，SessionManager 保存历史树，资源与扩展在会话边界绑定。读这一册时，先分清编排对象、活动执行和持久历史。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | CLI/SDK 的 createAgentSession 装配产品会话。 |
| 工作推进 | AgentSession 准备输入；Agent/agent-loop 执行模型与工具反馈。 |
| 模型与动作 | pi-ai 组织模型协议；当前工具 loadout 接到实际执行对象。 |
| 历史与请求 | SessionManager 历史树经压缩/编辑投影，AgentSession 采用为活动消息。 |
| 扩展与控制 | 扩展 hook、输入队列与 finishTurn 在相应边界影响行为。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [概念词典](glossary.md) | AgentSession、Agent、SessionManager 和 Runtime 分别是什么？ |
| [层次与构造](architecture.md) | CLI/SDK 怎样创建并绑定这些对象？ |
| [一次输入](loop.md) | 输入如何进入模型、工具和结束判断？ |
| [历史与模型视图](context.md) | 历史树、压缩记录和请求消息怎样衔接？ |
| [扩展绑定](extensions.md) | 注册、激活、hook 与 reload 改变哪一层？ |
| [MCP 与终端宿主](platform.md) | 资源冲突、重连和 codemode 怎样走到执行点？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
