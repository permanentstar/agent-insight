---
id: "claude-index"
title: "Claude Code 分册"
subject: "claude"
status: "index"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-official", "claude-legacy"]
depends_on: ["claude-migrated", "claude-context", "claude-capabilities", "claude-practices"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# Claude Code 分册

Claude Code 的机制可以按会话宿主、query 循环、工具执行和上下文治理四层理解。模型提出动作，运行时准备请求、检查权限、调度执行并回填反馈。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | 历史研究中的 REPL/AppState 与 QueryEngine 分担交互和非交互会话。 |
| 工作推进 | query 以生成器组织模型、工具反馈与收口检查。 |
| 模型与动作 | 模型产生 tool_use；执行器校验、询问权限并调用 Tool。 |
| 历史与请求 | transcript、messagesForQuery、压缩与长期 memory 分开解释。 |
| 扩展与控制 | 工具发现、Skill 加载、权限、MCP 与子 Agent 各有不同职责。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [层次与主链路](architecture.md) | REPL、QueryEngine、query 与 executor 怎样协作？ |
| [压缩与记忆](context.md) | 本地历史、API 请求视图和后台记忆在哪里交汇？ |
| [工具、MCP 与 Bridge](capabilities.md) | 发现、授权、控制面与远端接入怎样区分？ |
| [任务与托管边界](practices.md) | Code、模型 API 和 Managed Agents 分别承担什么？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
