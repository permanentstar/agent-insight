---
id: "codex-index"
title: "Codex 分册"
subject: "codex"
status: "index"
baselines: ["codex-20261009"]
sources: ["codex-official"]
depends_on: ["codex-plan", "codex-context", "codex-official-migrated"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Codex 分册

Codex 的 Rust core 用长活 Session/Thread 承接提交，以 turn 和 step 的快照组织请求和执行。上下文、工具路由、审批环境与 rollout 记录各有 owner，不能把一个线程读成单个模型调用。

| 章节 | 要回答的问题 |
|---|---|
| [线程与执行](architecture.md) | Op、SessionTask、run_turn 和 ToolOrchestrator 怎样衔接？ |
| [规则、快照与压缩](context-capabilities.md) | 指令怎样进入请求，工具如何固定，压缩与子线程怎样提交？ |
| [任务组织与运行配置](official-practices.md) | 任务输入、规则、工作区和权限怎样配合执行机制？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
