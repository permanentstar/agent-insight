---
id: "codex-official-migrated"
title: "Codex：历史实践与源码对应表"
subject: "codex"
status: "frozen-document"
baselines: []
sources: ["codex-official"]
depends_on: ["codex-plan", "codex-context"]
evidence: ["historical-document"]
verified_scope: "历史官方研究原稿全部主题按用途归并，并映射本书源码章节；原产品入口/参数时效未复查，不作为当前配置指南。"
---

# Codex：历史实践与源码对应表

原稿讲的是使用方式与平台启发；本书重新用 Rust core 分析执行机制。下表保留有用的实践问题，明确哪些已经对应源码，哪些只作为历史设计建议。

| 原稿主题 | 保留观点与条件 | 当前源码/正文落点 |
|---|---|---|
| Goal / Context / Constraints / Done | 给任务输入与验收，错误报告给复现 | 使用实践，不等同固定内部 Planner |
| Plan first | 方案未定或风险跨模块先规划 | 没有“所有复杂任务必须调用某工具”的通用约束 |
| AGENTS.md | 稳定规则分层、版本化，临时信息不无限累积 | [project instructions](context-capabilities.md)，trust、目录链、environment 与预算 |
| thread / worktree | 线程保留对话；有文件并发再考虑隔离 | [Session/Thread](architecture.md) 与 Git checkout 分开 |
| approval / sandbox / network | 按效果面设置权限与批准 | [orchestrator](architecture.md)；命令匹配与真实 OS/远端限制分层 |
| 验证闭环 | 以目标行为与证据判断完成 | 工具结果、业务验收、交付确认分别报告 |
| 运行面 | CLI/desktop/cloud/exec 面向不同宿主 | 本书 Rust core 不推定桌面私有服务或 cloud 环境全部实现 |
| 主 Agent / 子 Agent | 调查上下文隔离、父汇总结果，权限按任务限界 | [AgentControl 准入与驻留](context-capabilities.md)；不是固定 PM/Explorer/Test 角色路由 |
| Auto-review / reviewer | 可作为动作审批的产品策略 | 模型判断仍有不确定性；不把旧材料用法当各工具默认政策 |
| Skills / MCP / Plugins | 知识、连接、分发/组合分别管理 | [能力快照](context-capabilities.md)，可见不等于获准执行 |
| MCP server 运行 Codex | 外部平台可宿主 Codex 会话 | 外部协议是接入面，不是替代 SessionTask；旧命令参数须按版本核验 |
| traces / OTel / JSONL / schema output | 观察与机器可读接口有助于集成 | rollout 存储与工具效果不同；schema 不证明任务正确 |
| Memories | 检索加速，强制规则仍版本化 | 实践建议；不反推所有记忆数据写入/召回实现 |
| 模型/effort 和角色模板 | 按任务与证据成本选择 | 旧型号与价格/参数不沿用，不承诺 mini 对所有调查足够 |
| skill / exec / CI 模板与 30 天计划 | 稳定流程再脚本化，按实际痛点拆阶段 | 使用建议归纳，原示例保留 archive；不执行任何自动化 |

这些主题已消化为“配置与 owner → 真实执行 → 结果证据”的阅读路径。原稿“必须 plan”“默认 worktree”“把所有 traces 视为默认件”等强表述改为适用条件，避免把推荐变成事实。原始示例可用于历史对照，复制命令前必须核验当前官方版本；本页没有更新参数指南或创建 skill/定时任务。

Codex 的初版从官方材料重构为 [主链路](architecture.md) 与 [上下文/能力](context-capabilities.md) 两章源码分析，历史实践本页与它们分别标注证据等级。记录的源码观察点是基线清单的 commit，而非旧网页整理日期。
