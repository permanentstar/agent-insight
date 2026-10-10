---
id: "claude-index"
title: "Claude Code 分册"
subject: "claude"
status: "index"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-official", "claude-legacy"]
depends_on: ["claude-migrated", "claude-context", "claude-capabilities", "claude-practices"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Claude Code 分册

Claude Code 的机制可以按会话宿主、query 循环、工具执行和上下文治理四层理解。模型提出动作，运行时准备请求、检查权限、调度执行并回填反馈。

| 章节 | 要回答的问题 |
|---|---|
| [层次与主链路](architecture.md) | REPL、QueryEngine、query 与 executor 怎样协作？ |
| [压缩与记忆](context.md) | 本地历史、API 请求视图和后台记忆在哪里交汇？ |
| [工具、MCP 与 Bridge](capabilities.md) | 发现、授权、控制面与远端接入怎样区分？ |
| [任务与托管边界](practices.md) | Code、模型 API 和 Managed Agents 分别承担什么？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
