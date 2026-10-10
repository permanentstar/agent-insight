---
id: "hermes-index"
title: "Hermes 分册"
subject: "hermes"
status: "index"
baselines: ["hermes-20261009"]
sources: ["hermes"]
depends_on: ["hermes-migrated", "hermes-context", "hermes-capabilities"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# Hermes 分册

Hermes 的 AIAgent 是原生运行门面，不同宿主负责会话身份、生命周期和输出。对话阶段、工具调度、记忆与压缩由各自模块执行；先确认宿主，再追门面下的实际调用。

| 章节 | 要回答的问题 |
|---|---|
| [宿主与循环](architecture.md) | CLI/Gateway 如何构造 AIAgent，一次 turn 如何推进？ |
| [记忆与提交许可](context.md) | 摘要候选、fence、会话轮换和数据库提交怎样衔接？ |
| [平台与委派](capabilities.md) | ACP、工具目录、子 Agent、cron 和交付由谁控制？ |

先走完主链路，再进入状态、能力和故障边界。每次遇到持久记录或临时快照，都重新确认它的所有者和采用时机。
