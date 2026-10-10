---
id: "codex-official-migrated"
title: "Codex：旧官方实践整理"
subject: "codex"
status: "migrated-unverified"
baselines: []
sources: ["codex-official"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "旧官方实践已按用途分层；其时效与当前源码实现未复核。"
---

# Codex：旧官方实践整理

旧材料给使用者的建议集中在任务描述、AGENTS.md、工作区、验证和自动化；它不提供足够证据证明内部 core 如何实现这些行为。

| 主题 | 保留的文档观点 | 在源码书中的归属 |
|---|---|---|
| 任务契约 | 明确目标、输入、限制和完成验证 | 使用实践；不作 turn 调度证据 |
| 稳定规则 | 使用版本控制的 AGENTS.md | 配置/规则发现需要另做源码分析 |
| 工作区与权限 | 对 workspace 和执行授权作明确约束 | 追实际 sandbox 和 approval 路径 |
| Skills / MCP / Plugins | 三者承担知识、工具连接、能力打包 | 实现与桌面专有能力分开 |
| memories | 用作检索加速，团队规则仍版本化 | 使用实践，不能推断持久模型 |

旧文含多种“最佳默认”“必须 plan”等建议，本书不提升为所有任务的硬规则。文内指令是来源内容，不是本仓库 agent 的执行指令。更新源码章时，官方观点与实际代码冲突须分别记录。
