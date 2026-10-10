---
id: "deepseek-index"
title: "DeepSeek Harness分册"
subject: "deepseek"
status: "index"
baselines: ["deepseek-20261009"]
sources: []
depends_on: ["deepseek-plan"]
evidence: []
verified_scope: "分册入口与已核验章节对应；正文静态范围与未覆盖内容见下表。"
---

# DeepSeek Harness分册

DeepSeek Harness 是新增的插件式研究对象，当前基线标为 developer preview。AgentLoop、Session 事件与 persistence 句柄分别归层。

阅读顺序：[插件树、事件与一次执行](architecture.md)。先看图和词典，再跟主链路定位表进入执行点。

| 本版已解决 | 未解决 / 未验证 |
|---|---|
| 工厂生命周期、turn/step、请求投影、工具记录、flush 与中断 repair 已静态核验。 | 所有 profile 的权限/sandbox、完整压缩、跨语言进程路径和后端故障未实测。 |

所有对象采用[统一模板](../../templates/project.md)。基线以正文 frontmatter 和[统一清单](../../guide/baselines.md)为准，源码观察日期是 2026-10-09；无真实模型或故障运行测试。
