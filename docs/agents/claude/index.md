---
id: "claude-index"
title: "Claude Code（冻结）分册"
subject: "claude"
status: "index"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-official", "claude-legacy"]
depends_on: []
evidence: ["historical-document"]
verified_scope: "历史材料入口冻结；源码 snapshot 版本未确定，不跟踪上游更新。"
---

# Claude Code（冻结）分册

三份材料分别覆盖历史源码快照、官方使用实践和早期分析。用户指定不跟踪更新；文档 snapshot 不代表 Anthropic 当前实现。

本分册按照 [统一对象模板](../../templates/project.md) 组织。读 [初版整理](architecture.md) 时，先核对状态条；旧材料的具体机制尚未逐条核对其对应的历史快照。

| 章节方向 | 本版状态 |
|---|---|
| 定位、层次、概念与所有权 | 已整理研究入口；正式词典待源码核验后补齐 |
| 构造、一次请求与执行点 | 下页保存旧材料的主链路问题；原始历史快照版本待确定 |
| 状态、上下文、工具与权限 | 不把旧实现自动认作当前行为 |
| 故障、取消、恢复与独有机制 | 以统一边界表继续深化 |
