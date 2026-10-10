---
id: "home"
title: "Agent Insight"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "已建立组织、迁移清单与代表性源码样例；整套资料的最新核验尚未完成。"
---

# Agent Insight

这套书以可追溯的源码基线解释 Agent 的实现，并把同一问题放到多个对象中比较。Git 中的 Markdown、基线清单和图示是维护来源；VitePress 只是阅读界面。

当前是**框架与样例版**：7 个目标仓库已更新并登记主干观察点；21 份历史研究原稿已按登记版本归档并建立迁移映射。Pi 默认主链路、Pico5 的持久工具语义和 Lane 演进已有代表性源码章节。其他对象的旧结论只标为迁移稿，尚未完成逐章最新源码核验；DeepSeek Harness 从新建分册开始。

![阅读层次：基线、对象层次与词典、一次输入执行链、故障边界与比较](assets/book-map.svg)

先从[横向比较](comparisons/index.md)查看共同问题与取舍，再从[研究对象与阅读地图](guide/map.md)进入各对象分册；核对[基线登记](guide/baselines.md)后再引用结论。继续更新使用[统一模板](templates/project.md)和[维护流程](maintenance/update.md)。

正文比较 Pi AgentSession（当前官方默认）和 Pico5（当前实验）；旧 Lane 放历史附录。这里“转正”仅指官方 Agent 默认在生产使用，不以包导出或发布版本替代这个条件。
