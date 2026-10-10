---
id: "comparison-index"
title: "横向比较入口与范围"
subject: "comparison"
status: "index"
baselines: []
sources: ["comparison-legacy"]
depends_on: []
evidence: []
verified_scope: "比较维度与对象范围已建立；只有注明证据的单元格可作为源码结论。"
---

# 横向比较入口与范围

横向页先选共同问题，再沿各对象的证据链比较。初版先落地 Pi AgentSession 与 Pico5；其他对象的空缺保留为待核验，不做无依据评分。

| 维度 | 页面与当前覆盖 |
|---|---|
| 定位、分层、构造、生命周期、循环控制 | [对象矩阵](matrix.md) 与 [所有权](ownership.md) |
| 状态、上下文、压缩、持久化、恢复 | [状态与恢复](state-recovery.md) |
| 工具、权限、hook、扩展、多 Agent、取消与观测 | [执行边界](execution.md) |

每个专题使用 [固定比较格式](../templates/comparison.md)，逐页 depends_on 记录引用来源。新增对象时更新四页，避免只在目录出现、比较页永远遗漏。

原横向材料中 Pi/DeerFlow 之外的对象不自动扩为新分册；与本任务无关的项目候选设计不迁入。本版不包含 lark-doc-whisper。
