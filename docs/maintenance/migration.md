---
id: "migration"
title: "旧文迁移完成与证据边界"
subject: "book"
status: "contract"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "21 份原稿重要主题已提炼并登记；校验原文不变，缺失证据和未运行项保留。"
---

# 旧文迁移完成与证据边界

21 份历史原稿的重要结论、独有机制、学习目标与未知边界已提炼为正文，迁移状态全部为 digested；原文件仍按登记字节和 SHA-256 保留。初版整理完成不表示所有目标能力经过运行验证，也不表示 Claude 缺失源码或外部服务实现已经补齐。

[migration.json](https://github.com/permanentstar/agent-insight/blob/main/migration.json) 是原稿 ID/revision、校验信息、targets、coverage 和 known_limits 的唯一登记来源。remaining_scope 为空表示没有初版材料整理事项遗留，known_limits 登记证据/运行边界。以下为登记快照；[archive 原稿](https://github.com/permanentstar/agent-insight/tree/main/archive)不进入站点与搜索。

| 原稿 ID / revision | 主要正文去向 | 已处理的剩余主题与边界 |
|---|---|---|
| `pi-session` / 67 | [AgentSession / pi-platform](../agents/pi/platform.md)、[AgentSession / pi-context](../agents/pi/context.md)、[AgentSession / pi-extensions](../agents/pi/extensions.md) | 所有外部 MCP/provider/认证和 TUI 交互未运行；逐工具效果按执行契约，不复制同类功能清单。 |
| `pi-lane` / 127 | [Lane 历史 / lane-runtime](../history/pi-lane/runtime.md)、[Pi 路线演进与“转正”口径 / pi-evolution](../history/pi-lane/evolution.md) | 冻结历史栈未运行；默认超时/计时常量保留源码，不提升成跨版本契约。 |
| `pi-chord` / 31 | [Chord 与 Radius / pi-components-migrated](../history/pi-lane/components.md) | 旧与当前 Chord 分别固定基线；未运行远端复制或 generation 替换。 |
| `pi-radius` / 4 | [Chord 与 Radius / pi-components-migrated](../history/pi-lane/components.md) | 公开 checkout 中缺外部 Radius 服务实现，认证/HA/服务端存储不作结论；接入与恢复源码已整理。 |
| `deerflow-middleware` / 8 | [DeerFlow / deerflow-middleware](../agents/deerflow/middleware.md) | 候选顺序与直接 hooks 全部登记；配置/扩展会改变最终列表，所有组合没有运行验证。 |
| `deerflow-runtime` / 6 | [DeerFlow / deerflow-runtime](../agents/deerflow/runtime.md) | 多 worker/重启/lease 故障未运行；事件批次 best effort，不声明完整交付。 |
| `deerflow-prompt` / 19 | [DeerFlow / deerflow-context](../agents/deerflow/context-prompt.md) | 真实 provider 缓存命中与抗注入未测；标签建议作为候选契约。 |
| `deerflow-harness` / 23 | [DeerFlow / deerflow-capabilities](../agents/deerflow/capabilities.md)、[DeerFlow / deerflow-context](../agents/deerflow/context-prompt.md) | 同类工具合并按效果边界解释；所有后端与 sandbox 平台未运行。 |
| `claude-march` / 152 | [Claude Code / claude-migrated](../agents/claude/architecture.md)、[Claude Code / claude-context](../agents/claude/context.md)、[Claude Code / claude-capabilities](../agents/claude/capabilities.md) | 原 snapshot SHA 未知，snip/collapse、部分 gates 和显式 teammate 接单缺原实现，保持冻结未知。 |
| `claude-official` / 33 | [Claude / claude-practices](../agents/claude/practices.md) | 官方实践作为历史转述；Code/API/Managed Agents 分开，不核验当前页面或服务。 |
| `claude-legacy` / 4 | [Claude Code / claude-capabilities](../agents/claude/capabilities.md)、[Claude Code / claude-migrated](../agents/claude/architecture.md) | 旧 QueryEngine/IDE Bridge 与 3 月 snapshot 的版本关系未知，不拼成一种当前实现。 |
| `codex-official` / 8 | [Codex / codex-plan](../agents/codex/architecture.md)、[Codex / codex-context](../agents/codex/context-capabilities.md)、[Codex / codex-official-migrated](../agents/codex/official-practices.md) | 历史建议对应当前固定源码执行点；模型价格/参数、30 天安排和模板建议不转成当前 API 契约。 |
| `hermes` / 10 | [Hermes / hermes-context](../agents/hermes/context.md)、[Hermes / hermes-capabilities](../agents/hermes/capabilities.md)、[Hermes / hermes-migrated](../agents/hermes/architecture.md) | 所有平台/provider 与 cron/压缩取消交接未运行；隔离 worker 契约不泛化到所有任务。 |
| `langchain-overview` / 40 | [LangChain / LangGraph / langchain-learning](../frameworks/langchain/learning.md) | 外部课程、按天安排与无统计比例留归档；学习目标已归并，练习未执行。 |
| `langchain-stage1` / 19 | [LangChain / langchain-components](../frameworks/langchain/components.md) | 例子保留学习目标而非重复大段旧代码；stream/batch 机制已核验，未跑练习。 |
| `langchain-stage2` / 6 | [LangChain / langchain-components](../frameworks/langchain/components.md) | message/text/tool 旧概括已校正；所有模型集成能力未运行。 |
| `langchain-stage3` / 7 | [LangChain / langchain-retrieval](../frameworks/langchain/retrieval.md) | 检索链与固定/Agentic/混合 RAG 已整理；切分、召回、权限过滤和答案质量无实测。 |
| `langchain-stage4` / 25 | [LangGraph / langgraph-migrated](../frameworks/langgraph/architecture.md)、[LangGraph / langgraph-advanced](../frameworks/langgraph/advanced.md) | LastValue/Command/middleware 旧错误已校正，Delta/Overwrite/子图已整理；真实 saver 与恢复练习未运行。 |
| `langchain-stage5` / 4 | [LangChain / langchain-observability](../frameworks/langchain/observability.md) | tracer/组树与两种 callback 集成路径已整理；外部后端未连接，某应用实证仅留原稿。 |
| `langchain-stage6` / 4 | [LangChain / langchain-observability](../frameworks/langchain/observability.md)、[LangChain / langchain-migrated](../frameworks/langchain/architecture.md) | OpenAI 代表 Partner/standard-tests/DeerFlow 工厂已整理；不逐包重复协议，集成练习未运行。 |
| `comparison-legacy` / 4 | [比较 / comparison-control](../comparisons/control-delegation.md)、[比较 / comparison-observability](../comparisons/observability-delivery.md)、[横向比较入口与范围 / comparison-index](../comparisons/index.md) | 范围外对象和某应用章节留归档；Router/Planner/验收/ACK 为候选设计，性能无实测。 |

## 什么被保留、校正或归档

| 内容类型 | 正文处理 | 保存理由 |
|---|---|---|
| 层次、构造、执行链、状态/恢复、独有机制 | 用统一章节提炼并给固定源码证据；Claude 单独标历史 | 后续 agent 按机制差异更新，不重新猜模板 |
| 原稿过度概括或与主干冲突 | 当页纠正，例如 LastValue、bind_tools、middleware 编译与 Bridge 版本 | 防止旧结论被日期刷新后继续传播 |
| 教学例子、练习、自检 | 提炼输入输出、学习目的和执行点；长代码原样留归档 | 未实际执行，不能写测试通过；旧代码不作为最新接口样例 |
| 外部课程、学习天数、无样本比例、版本默认计时 | 只在归档保留 | 不作为当前产品/性能契约 |
| 泛化 Router/Planner/验收/投递建议 | 单独标候选设计，说明适用条件与测量问题 | 不是本书实施计划或九对象共有事实 |
| 范围外对象、某应用的定制方案 | 仅归档 | 按用户决定不进入正文 |
| 缺失原源码、外部 service 或运行效果 | 在 known_limits 与章节保留未知 | 原稿指令或名称不能代证实现 |

## 归档仍然保留

本次没有删除原稿。原文获准随 Git 历史公开；正式正文不依赖在线私人来源。Claude 的历史叙述等仍通过 sources 使用原稿，删除前须先处理引用与证据等级，再经门禁核对 digested、coverage 全部 targets 和没有页面引用。删除当前文件不删除 Git 历史。

原稿中的命令、建议和指令只是材料，不改变操作规则。deepseek 是新增研究，没有旧原稿；Pico5 为当前源码分册，旧 Lane 不被当成它的当前实现。
