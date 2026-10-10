---
id: "home"
title: "Agent Insight"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "九对象的分层主链路与横向比较已形成；原稿全文消化、全部机制与运行验证尚未完成。"
---

# Agent Insight

这套书以可追溯的源码基线解释 Agent 的实现，并把同一问题放到多个对象中比较。Git 中的 Markdown、基线清单和图示是维护来源；VitePress 只是阅读界面。

当前是**九对象分层主链路版**：七个源码仓库锁定 2026-10-09 的官方主干观察点，当前/实验八个对象已有静态主链路正文，Claude 以冻结材料形成第九册。每册先给图和概念，再解释构造、生命周期、调用与状态边界；横向比较已覆盖全部九对象。

21 份历史研究原稿仍在 Git 归档，尚未全部提炼。TUI、部分压缩/权限/多 Agent、框架教学代码等剩余范围登记在迁移清单；“主链路已核验”不能解释成所有机制都已验证。

![阅读层次：基线、对象层次与词典、一次输入执行链、故障边界与比较](assets/book-map.svg)

先从[横向比较](comparisons/index.md)查看共同问题与取舍，再从[研究对象与阅读地图](guide/map.md)进入各对象分册；核对[基线登记](guide/baselines.md)后再引用结论。继续更新使用[统一模板](templates/project.md)和[维护流程](maintenance/update.md)。

正文比较 Pi AgentSession（当前官方默认）和 Pico5（当前实验）；旧 Lane 放历史附录。这里“转正”仅指官方 Agent 默认在生产使用，不以包导出或发布版本替代这个条件。
