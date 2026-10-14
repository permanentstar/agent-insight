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

任务组织与运行机制相互影响：输入约束决定请求准备，工作区和权限约束决定动作范围，验收决定如何判断完成。本章用一份任务说明这几个输入怎样交给前两章的执行对象，再给使用问题索引。

## 先组织任务，再选择运行配置

例如“修复 CSV 转义”需要补充代码位置、保持公开接口的约束和已有验证命令。用户输入提供目标和验收，稳定规则来自项目指令，工作环境提供文件和工具。进入 Turn 后，这些资料经 StepContext 组织为模型请求；具体修改再经过工具审批与环境限制。

| 使用步骤 | 给 Agent 的资料 | 对应执行位置 |
|---|---|---|
| 1. 明确任务 | 目标、事实、约束、验收 | Turn 输入及后续请求消息 |
| 2. 准备环境 | cwd、项目规则、允许能力 | 规则加载、environment 和 Step 视图 |
| 3. 推进工作 | 需要时先讨论方案，按观察执行 | 同一模型工具循环与具体模式入口 |
| 4. 检查结果 | 行为证据、工具结果、交付情况 | 结果反馈与产品收口 |

这份结构用于解释工作方式。具体产品入口和参数按版本说明的研究范围理解。

## 使用问题与执行机制的对应索引

下表把常见问题放回上述步骤，按需进入相应源码章节。

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
