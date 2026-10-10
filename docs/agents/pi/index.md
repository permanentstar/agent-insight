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

AgentSession 围绕交互会话编排模型和工具；Agent 执行循环，SessionManager 保存历史树，资源与扩展在会话边界绑定。读这一册时，先分清编排对象、活动执行和持久历史。

| 章节 | 要回答的问题 |
|---|---|
| [概念词典](glossary.md) | AgentSession、Agent、SessionManager 和 Runtime 分别是什么？ |
| [层次与构造](architecture.md) | CLI/SDK 怎样创建并绑定这些对象？ |
| [一次输入](loop.md) | 输入如何进入模型、工具和结束判断？ |
| [历史与模型视图](context.md) | 历史树、压缩记录和请求消息怎样衔接？ |
| [扩展绑定](extensions.md) | 注册、激活、hook 与 reload 改变哪一层？ |
| [MCP 与终端宿主](platform.md) | 资源冲突、重连和 codemode 怎样走到执行点？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
