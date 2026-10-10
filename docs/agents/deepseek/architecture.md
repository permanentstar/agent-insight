---
id: "deepseek-plan"
title: "DeepSeek Harness：新增研究范围"
subject: "deepseek"
status: "pending"
baselines: ["deepseek-20261009"]
sources: []
depends_on: []
evidence: []
verified_scope: "已完成源码更新和新增分册；尚未分析执行、对象与恢复机制。"
---

# DeepSeek Harness：新增研究范围

该对象从官方 master 基线新建，不沿用其他 Harness 的概念解释它。仓库包含 packages、native、python 与 website；必须先判定哪些是运行内核、系统能力、SDK 和展示。

| 顺序 | 要回答的问题 | 初版边界 |
|---|---|---|
| 层次与词典 | 自造术语归哪层，谁持有状态 | 尚未建立，不能套用 Pi Lane/Task |
| 构造与输入 | CLI/服务入口如何选择模型、工具和 Session | 待分析 |
| 一次执行 | 真正的模型请求与工具执行点在哪里 | 待分析 |
| 持久与恢复 | session-persistence 保存什么、什么时候写 | 目录名不能证明语义 |
| 原生与跨语言 | native 和 Python SDK 如何接入 | 待分析 |

已确认 packages/session/session-persistence 存在并有 README；这仅是定位入口，不是其持久化保证已核验。完成源码分析后，本页按模板替换成有词典和主链路图的正文，横向矩阵再从“待核验”迁移为有证据的单元格。
