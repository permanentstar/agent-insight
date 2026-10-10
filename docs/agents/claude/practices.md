---
id: "claude-practices"
title: "Claude：任务、上下文与托管边界"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-official"]
depends_on: ["claude-migrated", "claude-context", "claude-capabilities"]
evidence: ["historical-document"]
verified_scope: "官方研究原稿的使用/平台观点已归纳；原页面发布时间与当前产品状态未复查，Managed Agents 不作为 Claude Code 私有实现。"
---

# Claude：任务、上下文与托管边界

Claude Code、模型 API 与 Managed Agents 有不同控制边界。客户端负责本地会话与工具执行，API 提供模型能力，托管平台则另外管理运行环境、会话与事件。研究任务组织时，先确定动作由哪一层执行。

| 任务问题 | 实践原则 | 机制边界 |
|---|---|---|
| 任务与验证 | 明确目标、文件/复现、约束和验收 | 使用实践；截图/测试是证据，回复“完成”不是 |
| 规划 | 不确定、多模块或高成本任务先厘清方案 | 条件选择，不强制所有任务进入某 mode |
| 规则与记忆 | 长期团队规则版本化，局部规则有范围，个人偏好分开 | 规则的范围与生命周期比固定行数更有解释力 |
| 上下文 | 切换任务可清理；长任务压缩；调查可隔离上下文 | 与 [实现层次](context.md) 分开，不能保证记忆不丢 |
| 权限、会话、worktree | 按授权和并发需要选择隔离 | 工作区隔离、执行权限与会话身份分别管理 |
| Hooks / MCP / subagents | 分别表达确定动作、外部能力、调查委派 | 运行入口必须实际接通才成为约束 |
| Prompt | 规则、输入、上下文、示例分层，说明原因 | XML 是提示结构，不是鉴权；示例数量不固定化 |
| 长上下文/缓存 | 管稳定前缀、资料引用与压缩 | 没有基准时不报告命中/质量收益 |
| Tool | 描述用途、参数、结果和限制，保持高信号反馈 | schema/description 引导，执行权限另守 |
| Agent / Environment / Session / Events | 托管对象分层，状态与消息事件管理 | 托管对象契约，不等于客户端内部类图 |
| spillover / packages / checkpoint | 工具长输出放环境、依赖预装、可恢复状态 | 托管环境的恢复边界不能直接推广到本地文件系统 |
| confirmation / network | 精确操作确认、环境与网络政策 | 有代码执行点才称硬边界；网络与 web tool 分别审视 |
| 多 Agent | 上下文隔离、执行环境可共享、父收结果摘要 | 共享文件仍可能竞争，摘要不自动保留全部证据 |

使用这些能力时，可以连续问三个问题：规则或资料属于谁，动作在哪个效果点被控制，任务与交付如何验收。上下文选择帮助模型决策，权限和环境约束限制动作，结果证据说明目标是否达成；它们不能相互替代。

Hooks 适合表达确定动作，MCP 适合接入外部能力，子 Agent 适合隔离调查上下文。组合时仍需追输入、权限、运行身份和回传结果，避免把提示中的意图当作已生效控制。使用与平台的讨论依据 [Claude 任务与架构研究](https://github.com/permanentstar/agent-insight/blob/9ecf6e00b17caa5c8930c538978b208300d3b19c/archive/claude-official.md)。