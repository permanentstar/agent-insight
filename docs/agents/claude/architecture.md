---
id: "claude-migrated"
title: "Claude Code：冻结架构材料"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-official", "claude-legacy"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "冻结历史材料的层次整理；未验证原源码哈希，也不证明当前线上行为。"
---

# Claude Code：冻结架构材料

以历史源码材料为边界，可以读到 CLI/REPL、query 循环、工具执行与权限、上下文管理四个层次；官方最佳实践应作为使用契约另看，不能反推私有实现。

| 层次 | 历史材料中的机制 | 分析边界 |
|---|---|---|
| CLI / REPL / SDK | 输入、模式分发、会话 UI 和事件流 | 两种入口不能自动认作同一生命周期 |
| query 循环 | 请求模型、处理 tool_use、继续或结束 | Meta Tool / Deferred Tool / stop hook 要分别解释控制权 |
| 工具与权限 | Tool 抽象、注册池、参数校验、执行授权 | 模型选工具不等于被授予执行权限 |
| 上下文与记忆 | system/messages、CLAUDE.md、自动/手动压缩 | 记录 history 与下次模型快照分别核验 |

独有专题保留 Skill Discovery 与 ToolSearch：前者找到可加载的任务知识，后者发现可调用工具；二者不能只因都使用搜索就合并。历史多 Agent 材料还区分 background command、子 Agent 和团队任务，比较时注明工作粒度及实际共享状态。

原分析明确标注 leak 版本不是 Anthropic 当前线上版本。本版只保存概念整理与文档 revision，不复制来源不明确的源码，也不臆造 commit。冻结意味着不定时追新；补齐已有 snapshot 的来源、版本和哈希仍有价值。

官方实践材料中的组织建议、MCP 或权限说明只作为文档观点保留。当前线上产品行为不在本页结论范围。
