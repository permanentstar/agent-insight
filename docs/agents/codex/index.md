---
id: "codex-index"
title: "Codex 分册"
subject: "codex"
status: "index"
baselines: ["codex-20261009"]
sources: ["codex-official"]
depends_on: ["codex-plan", "codex-context", "codex-official-migrated"]
evidence: []
verified_scope: "入口按共同职责定位并连接实现专题；正文的静态证据、历史范围与教学核验各自说明。"
---

# Codex 分册

Codex 的 Rust core 用长期存活的 Session/Thread 承接提交，以 turn 和 step 的快照组织请求和执行。架构章沿一份任务串起线程、Turn 与 Step；上下文章继续解释资料如何固定、压缩和继承，实践章再把任务输入与这些边界对应起来。

## 在共同架构中定位

先把本实现放到[共同职责地图](../../comparisons/common-model.md)，再沿下面的章节追到实际对象。这里对齐的是问题，具体类型和作用域仍按本分册解释。

| 共同职责 | 本实现中的定位 |
|---|---|
| 产品宿主 | 宿主通过 ThreadManager 和 SessionIo 接纳操作。 |
| 工作推进 | SessionTask 驱动用户 Turn，StepContext 固定一次采样视图。 |
| 模型与动作 | ModelClientSession 组织请求；ToolRouter/handler/runtime 落实调用。 |
| 历史与请求 | ContextManager 投影活跃历史；RolloutRecorder 另管理写入及确认。 |
| 扩展与控制 | skills/plugins、MCP、协作模式与工具执行政策作用在各自边界。 |

## 分册阅读

| 章节 | 要回答的问题 |
|---|---|
| [线程与执行](architecture.md) | Op、SessionTask、run_turn 和 ToolOrchestrator 怎样衔接？ |
| [规则、快照与压缩](context-capabilities.md) | 指令怎样进入请求，工具如何固定，压缩与子线程怎样提交？ |
| [任务组织与运行配置](official-practices.md) | 任务输入、规则、工作区和权限怎样配合执行机制？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
