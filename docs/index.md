---
id: "home"
title: "Agent Insight"
subject: "book"
status: "index"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "初版九对象分层专题与七个比较维度已完成；21 原稿已提炼，冻结/缺失证据与运行未知明确登记。"
---

# Agent Insight

这套书以可追溯的源码基线解释 Agent 的实现，并把同一问题放到多个对象中比较。Git 中的 Markdown、基线登记和可编辑 SVG 是维护来源，VitePress 提供可搜索阅读界面。

**初版整理已完成**：七个源码仓库锁定 2026-10-09 的官方主干观察点，形成八个当前/实验对象及一册 Claude 冻结分析。21 份原稿的重要结论、独有机制、练习目标和未知已提炼，原文继续保留。分析整理日期为 2026-10-10；这是静态研究书，没有运行目标 Agent、模型或故障实验。

![分册分析层次：基线、对象层次与词典、一次输入执行链、故障边界与比较](assets/book-map.svg)

先从[横向比较](comparisons/index.md)查看所有权、决策与委派、Prompt/压缩、恢复、执行和观测/交付，再从[对象地图](guide/map.md)进入分册。每册先给图和概念，再解释构造、生命周期、调用链与状态边界；独有机制增加专题，不改变统一问题模板。

正文比较 Pi AgentSession（当前官方默认）和 Pico5（实验）；Lane 为冻结历史附录。“转正”仅指官方 Agent 默认在生产使用。Claude 缺失 snapshot SHA 与部分实现、Radius 外部服务和目标运行效果保留明确未知，见[迁移与证据边界](maintenance/migration.md)。

引用结论前核对[基线登记](guide/baselines.md)。后续 agent 使用[统一模板](templates/project.md)、[比较模板](templates/comparison.md)和[更新流程](maintenance/update.md)增量维护；换机只改本机 source root，不改正文。
