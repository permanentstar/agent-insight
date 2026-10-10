---
id: "comparison-index"
title: "横向比较入口与范围"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: ["comparison-legacy"]
depends_on: ["comparison-matrix", "comparison-ownership", "comparison-control", "comparison-context", "comparison-state", "comparison-execution", "comparison-observability"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "九对象七个共同维度已整理；源码静态机制、冻结转述与候选设计分开，无运行或性能排名。"
---

# 横向比较入口与范围

本版比较九个对象：Pi AgentSession 与 Pico5 分开，Claude 只用冻结材料，LangChain/LangGraph 分别列构图与运行层。横向比较位于对象分册之前；先选共同问题，再沿证据页下钻。“能保证”指已定位的条件化源码契约，不表示运行效果已经实测。

| 共同问题 | 页面 | 覆盖 |
|---|---|---|
| 应用、框架、实验分别处于哪层 | [对象矩阵](matrix.md) | 定位、入口、驱动器与基线 |
| 谁构造谁、谁持有活动工作 | [所有权](ownership.md) | owner、复用、长期身份与运行实例 |
| 理解、规划和委派由谁决定 | [决策与控制](control-delegation.md) | 显式接纳、模型循环、child/activation、候选 Router 取舍 |
| 模型读到什么，摘要何时生效 | [Prompt 与压缩](context-compaction.md) | 历史/投影/memory、逻辑覆盖、提交资格 |
| 恢复历史、工作还是外部效果 | [状态与恢复](state-recovery.md) | 提交边界、未知结果和同一故障 |
| 定义如何到真实执行 | [执行边界](execution.md) | 可见性、校验、授权、hook、并发和取消 |
| 看见、保存和交付各证明什么 | [观测与交付](observability-delivery.md) | run tree、事件、持久确认、业务验收和 ACK |

每页沿用[比较模板](../templates/comparison.md)，给九对象机制表、同一输入或故障、条件化取舍与未知。新增对象向全部维度追加同格式行；不做总分，因为产品功能、框架内核和实验恢复不是同一种交付。

旧原稿的请求封装、Soft Router、Planner、Completion Validator/ACK 仅保留为候选设计，未写成共有实现。范围外对象和某应用方案留在归档。[Lane 历史附录](../history/pi-lane/index.md)只用于演进；源码与依赖组合见[基线](../guide/baselines.md)。
