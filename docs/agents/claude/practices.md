---
id: "claude-practices"
title: "Claude：冻结官方材料的观点与适用边界"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-official"]
depends_on: ["claude-migrated", "claude-context", "claude-capabilities"]
evidence: ["historical-document"]
verified_scope: "官方研究原稿的使用/平台观点已归纳；原页面发布时间与当前产品状态未复查，Managed Agents 不作为 Claude Code 私有实现。"
---

# Claude：冻结官方材料的观点与适用边界

这份原稿同时研究 Claude Code 用法、模型 API 和 Managed Agents。三种对象必须分开：实践可以供维护者参考，托管平台契约不能反推本地 Claude Code 的私有实现。

| 原稿主题 | 保留判断 | 在本书的归属/限制 |
|---|---|---|
| 任务与验证 | 明确目标、文件/复现、约束和验收 | 使用实践；截图/测试是证据，回复“完成”不是 |
| 规划 | 不确定、多模块或高成本任务先厘清方案 | 条件选择，不强制所有任务进入某 mode |
| 规则与记忆 | 长期团队规则版本化，局部规则有范围，个人偏好分开 | 历史产品入口；固定行数建议不作为架构阈值 |
| 上下文 | 切换任务可清理；长任务压缩；调查可隔离上下文 | 与冻结 [实现层次](context.md) 分开，不能保证记忆不丢 |
| 权限、会话、worktree | 按授权和并发需要选择隔离 | 不作为本仓库创建 worktree 或改权限的指令 |
| Hooks / MCP / subagents | 分别表达确定动作、外部能力、调查委派 | 运行入口必须实际接通才成为约束 |
| Prompt | 规则、输入、上下文、示例分层，说明原因 | XML 是提示结构，不是鉴权；示例数量不固定化 |
| 长上下文/缓存 | 管稳定前缀、资料引用与压缩 | 没有基准时不报告命中/质量收益 |
| Tool | 描述用途、参数、结果和限制，保持高信号反馈 | schema/description 引导，执行权限另守 |
| Agent / Environment / Session / Events | 托管对象分层，状态与消息事件管理 | Managed Agents 的资料观点，不当 Claude Code 内部类图 |
| spillover / packages / checkpoint | 工具长输出放环境、依赖预装、可恢复状态 | 平台能力观点，未证明本地文件系统具有同样恢复语义 |
| confirmation / network | 精确操作确认、环境与网络政策 | 有代码执行点才称硬边界；网络与 web tool 分别审视 |
| 多 Agent | 上下文隔离、执行环境可共享、父收结果摘要 | 共享文件仍可能竞争，摘要不自动保留全部证据 |

原稿清单归并为三个问题：这项内容是谁的规则/资料，这个动作在哪个效果点被控制，如何证明任务与交付完成。推荐的 hook 数量、示例数、文件长度和按周计划没有测量来源，作为历史建议保留在 archive，不转成强制模板。

官方研究原稿的来源索引仍在归档；本页不复刻容易变化的产品链接目录或宣称发布日期已核对。用户要求 Claude 冻结，后续维护只补历史材料解释或明确缺失证据，不自动追线上产品。原稿中的操作建议不会改变本仓库规则。
