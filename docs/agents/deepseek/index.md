---
id: "deepseek-index"
title: "DeepSeek Harness分册"
subject: "deepseek"
status: "index"
baselines: ["deepseek-20261009"]
sources: []
depends_on: ["deepseek-plan", "deepseek-capabilities", "deepseek-context"]
evidence: []
verified_scope: "分册入口和已完成的初版专题对应；静态/冻结证据与运行未知分别登记。"
---

# DeepSeek Harness分册

DeepSeek Harness 是新增的插件式研究对象，当前基线标为 developer preview。AgentLoop、Session 事件、model surface 和 storage 句柄分别归层，Profile 决定具体能力组合。

阅读顺序：[插件树、事件与一次执行](architecture.md) → [Profile、审批、Sandbox 与子 Agent](capabilities.md) → [surface 压缩与持久屏障](context.md)。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| turn/step、工具记录、flush/repair、审批闭合结果与实际消费、Sandbox 范围、子执行归属及摘要提交。 | 未运行各平台 sandbox、SDK binary、全部 profile 或外部 provider；repair 关闭旧工作，不等于程序续跑。 |

各章先给图和词典，再进入构造、调用与执行点；沿用[统一模板](../../templates/project.md)。基线以 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期为 2026-10-09，整理日期为 2026-10-10。静态整理完成不等于目标系统运行验证。
