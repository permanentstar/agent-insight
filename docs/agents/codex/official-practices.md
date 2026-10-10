---
id: "codex-official-migrated"
title: "Codex：任务组织与运行配置"
subject: "codex"
status: "frozen-document"
baselines: []
sources: ["codex-official"]
depends_on: ["codex-plan", "codex-context"]
evidence: ["historical-document"]
verified_scope: "历史官方研究原稿全部主题按用途归并，并映射本书源码章节；原产品入口/参数时效未复查，不作为当前配置指南。"
---

# Codex：任务组织与运行配置

任务组织与运行机制相互影响：输入约束决定请求准备，工作区和权限约束决定动作范围，验收决定如何判断完成。下表把使用问题与 Rust core 的执行边界对应起来。

| 任务问题 | 使用方式与条件 | 实现关系 |
|---|---|---|
| Goal / Context / Constraints / Done | 给任务输入与验收，错误报告给复现 | 使用实践，不等同固定内部 Planner |
| Plan first | 方案未定或风险跨模块先规划 | 没有“所有复杂任务必须调用某工具”的通用约束 |
| AGENTS.md | 稳定规则分层、版本化，临时信息不无限累积 | [project instructions](context-capabilities.md)，trust、目录链、environment 与预算 |
| thread / worktree | 线程保留对话；有文件并发再考虑隔离 | [Session/Thread](architecture.md) 与 Git checkout 分开 |
| approval / sandbox / network | 按效果面设置权限与批准 | [orchestrator](architecture.md)；命令匹配与真实 OS/远端限制分层 |
| 验证闭环 | 以目标行为与证据判断完成 | 工具结果、业务验收、交付确认分别报告 |
| 运行面 | CLI/desktop/cloud/exec 面向不同宿主 | 本书 Rust core 不推定桌面私有服务或 cloud 环境全部实现 |
| 主 Agent / 子 Agent | 调查上下文隔离、父汇总结果，权限按任务限界 | [AgentControl 准入与驻留](context-capabilities.md)；不是固定 PM/Explorer/Test 角色路由 |
| Auto-review / reviewer | 可作为动作审批的产品策略 | 模型判断仍有不确定性；审批策略由具体工具和宿主采用 |
| Skills / MCP / Plugins | 知识、连接、分发/组合分别管理 | [能力快照](context-capabilities.md)，可见不等于获准执行 |
| MCP server 运行 Codex | 外部平台可宿主 Codex 会话 | 外部协议是接入面，不是替代 SessionTask |
| traces / OTel / JSONL / schema output | 观察与机器可读接口有助于集成 | rollout 存储与工具效果不同；schema 不证明任务正确 |
| Memories | 检索加速，强制规则仍版本化 | 实践建议；不反推所有记忆数据写入/召回实现 |
| 模型/effort 和角色模板 | 按任务与证据成本选择 | 模型能力与成本需要按任务和验收要求选择 |
| skill / exec / CI 流程 | 稳定流程再脚本化，按实际痛点拆阶段 | 使用实践；脚本化不改变底层执行与权限契约 |

规划适合方案未定、跨模块或验证成本较高的任务；工作区隔离适合存在文件并发的场景。两者都需要按问题选择，不能由任务名称推定必须创建某种内部对象。trace、rollout 和结构化输出提供不同证据，最终仍要检查目标行为。

沿 [线程与执行](architecture.md)理解输入如何运行，再沿 [规则、快照与压缩](context-capabilities.md)理解运行配置如何生效。使用层的计划、角色模板和规则文件，与内核中的 SessionTask、StepContext 和 ToolRouter 有联系，但不是同一组对象。