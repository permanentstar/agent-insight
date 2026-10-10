---
id: "comparison-index"
title: "横向比较入口与范围"
subject: "comparison"
status: "index"
baselines: ["pi-20261009", "deerflow-20261009", "codex-20261009", "hermes-20261009", "langchain-20261009", "langgraph-20261009", "deepseek-20261009", "claude-frozen-documents"]
sources: ["comparison-legacy"]
depends_on: ["pi-architecture", "durable-architecture", "deerflow-migrated", "claude-migrated", "codex-plan", "hermes-migrated", "langchain-migrated", "langgraph-migrated", "deepseek-plan"]
evidence: ["source", "historical-document", "static-inference"]
verified_scope: "九个对象的共同维度已填入静态机制；Claude 为冻结转述；无性能排名或故障运行测量。"
---

# 横向比较入口与范围

本版比较九个对象：Pi AgentSession 与 Pico5 分开，Claude 只用冻结材料，LangChain/LangGraph 分别列出构图与运行层。先从共同问题选择页面，再沿证据链接下钻；这里的“能保证”指已定位的源码契约，运行效果仍需独立验证。

| 共同问题 | 页面 | 本版覆盖 |
|---|---|---|
| 应用、框架、实验分别处于哪层 | [对象矩阵](matrix.md) | 定位、入口、驱动器、部署载体与基线 |
| 谁构造谁、谁持有活动工作 | [所有权](ownership.md) | owner、复用、每次运行与长期身份 |
| 恢复历史、工作还是外部效果 | [状态与恢复](state-recovery.md) | 投影、提交边界、未知结果与同一故障 |
| 定义如何到真实执行 | [执行边界](execution.md) | 可见性、校验、授权、hook、并发、取消与观测 |

每页沿用[比较模板](../templates/comparison.md)，列出共同场景、机制表、条件化取舍和未验证项。后续新增对象追加同一组行，不能只在目录登记。跨对象数据不做一个总分：产品功能、框架内核和实验恢复机制不是同一种交付。

旧横向原稿只覆盖部分对象并混有应用设计建议；本版以固定源码章节重新组织共性，旧候选方案保留历史属性。Lane 只在[历史附录](../history/pi-lane/index.md)参与演进说明，不作为当前正式对象。源码和依赖组合见[基线](../guide/baselines.md)。
