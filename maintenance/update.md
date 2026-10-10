---
id: "update"
title: "增量更新与换机流程"
subject: "book"
status: "contract"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 增量更新与换机流程

更新以“哪些结论受到变化影响”为单位，不能只把日期和 SHA 改成今天。后续 agent 接到本页即可开始，历史原稿从仓库 archive/ 读取。

## 教学主线与本轮完成范围

2026-10-10 在已登记源码上完成一轮教学深化。正文继续按“横向比较、对象分册、历史附录”组织，版本集中在前置说明；本页记录维护范围，不进入书籍导航。

读者按具备基础编程知识、首次系统学习 Agent 实现设定。共同任务为“读取需求和 CSV 导出代码，修复字段转义，运行已有验证并说明结果”。这些任务轨迹与字段节选是教学示意，不是实测日志；真实控制关系以各自固定源码为依据。

| 范围 | 本轮正文落点 | 已补齐的学习内容 |
|---|---|---|
| 横向执行模式 | comparisons/execution-modes.md | 反馈循环、ReAct、Plan & Execute 与固定编排；九对象的支持方式、计划载体和控制入口；模式嵌套与独立维度 |
| 信息与状态比较 | comparisons/context-compaction.md、state-recovery.md | 语义资料如何进入模型；历史、当前状态和模型视图；状态层次与三类恢复 |
| Pi AgentSession | architecture、loop、context | 构造与生命周期、一次输入、多轮工具反馈、队列与收口；历史树、编辑及压缩投影样例 |
| Pico5 | glossary、architecture、loop、documents | Entry/Task/Document 层次；status/phase/live 区别；Submission 接纳与 generation 移交；工具意图、模型 cutoff 和摘要采用 |
| DeerFlow 与两框架 | DeerFlow architecture/runtime；LangChain 与 LangGraph architecture | 产品 run 与图内循环分开；Todo 有限续跑；消息变化；超步稳定读视图、reducer、checkpoint 与动态路由 |
| Codex、Hermes、DeepSeek、Claude | 各分册 architecture | 同一任务跨过真实对象与阶段；请求和反馈资料；长期与当次对象；主要状态/控制；模式边界与自检 |
| Lane 历史 | history/pi-lane/runtime.md | Session/Harness/Lane/Operation/Drive 的正常推进；持久 state.at 与内存 Drive；模型决策、提交及外层通信的关系 |

验证记录：62 个阅读页面通过元数据、链接与构建检查；333 个固定引用对应的 191 个源码／归档文件和行号均存在；15 项文档契约检查通过。包含新图的 16 个章节在浅深主题均加载成功，代表状态图已目视核对，中文“生成状态机”及英文 cutoff 搜索可定位章节。源码链接存在性不代替语义核验，图例和伪代码也不作为运行证据。

本轮新增 19 幅可编辑 SVG，正文补充消息/状态节选、必要伪代码和学习自检。完成判断是读者能够沿图复述正常任务，区分主要对象与状态，并通过引用定位实现；章节质量不按字数或页数评分。原有独有专题继续承接深入阅读，不因采用统一模板删去有效解释。

核验采用目标 Git commit 的只读内容，不执行目标 Agent、真实模型或生产服务。Claude 继续保持历史材料范围，缺失源码 snapshot 不补造。恢复能力与模式优劣均未用故障注入或任务性能实验验证；模板与构建检查也不能证明正文语义。这些边界在版本说明和相关机制处保留。

执行模式的理论入口为 [ReAct 论文](https://arxiv.org/abs/2210.03629) 和 [LangChain 官方规划架构说明](https://www.langchain.com/blog/planning-agents)。各对象的支持程度仍以实际构造、配置和执行点为依据。例如 DeerFlow Todo 参与有限续跑，不等于独立 Planner；Codex Plan 协作模式与 update_plan 清单分别处理。

后续维护优先对照上游变动更新受影响的正文、图与比较页。只有具体学习问题或证据缺口出现时才扩展专题；不将同一任务的全部失败组合机械补进正文。若另行委托运行实验，先规定任务、模型、工具、验收与比较指标，结果与源码静态推导分别记录。

教学与源码核验建议使用当前会话模型及 xhigh；纯措辞可用 high；存在跨架构争议再提高 effort。初版未建立定时任务，调度授权和更新实施分别管理。

## 主干更新流程

![源码研究依次区分对象职责、概念层次、一次输入的执行链和机制边界](../docs/assets/book-map.svg)

1. 阅读 README、AGENTS、contracts、对象分册与依赖比较页；判断目标是跟踪主干、冻结材料补证还是新对象分析。
2. 通过 AGENT_SOURCE_ROOT 或本机 .source-map.json 找源码。先记录 branch、HEAD、remote、staged/unstaged/untracked；更新必须已有授权，只使用 fetch 与可安全 fast-forward，不清理用户改动。
3. 锁定 fetch 后的完整 SHA。脏 checkout 用 `git show <sha>:<path>` 读上游，不把本机修改带入结论。主干分叉、网络失败或文件冲突必须具名报告，不自动 stash/reset。
4. `git diff --name-status <old> <new>` 定位影响路径，再阅读相关构造、调用、存储及测试。架构改名同时核验“同一机制改名”还是“新模型重写”。
5. 新增不可变基线 ID。对核验过的章节迁移 baselines；没有检查的正文留在旧基线。更新词典、层次图、主链路和边界表，再更新消费这些结论的 comparisons 页面。
6. 新对象先补 subject、repo、基线和分册入口，再按统一模板建章，给所有比较维度添加该对象；未分析单元格写待核验。
7. 运行 `npm run check`、`npm run build` 和门禁反例检查；展示变更检查中文搜索、英文符号、浅深主题。报告已解决、未解决、未验证，注明源码静态分析是否有运行验证。

整理历史原稿时，先按 migration.json 的 ID、路径和 SHA-256 核对 archive/ 文件，再逐章提炼并与对应源码基线比对。全文归档不等于结论已经核验，不能因此把 migrated-unverified 改为 verified-source。重要结论、独有内容、学习目的和未知完成整理后，在 coverage 登记覆盖章节与边界，将 migration_status 改为 digested，并清空材料整理的 remaining_scope；缺失实现、运行边界和只保留归档的取舍写入 known_limits。只有正文已不再引用该原稿时，才可删除文件并将 archive.state 改为 removed，保留校验值供 Git 历史追溯。

初版未建立任何定时任务。后续调度器只负责触发一次更新任务；更新逻辑由此仓库控制。建议按对象分配任务，每次生成一个可评审 diff；同一本书同时更新时，各自限定对象章节，比较页串行汇总，避免多人改基线和目录。

换机仅重新 clone 本书和目标源码、安装 Node、设置本机根路径，再 `npm ci --ignore-scripts`。全局不保存机器路径；.source-map.json 不入 Git。

```sh
export AGENT_SOURCE_ROOT=/your/new/community-root
npm ci --ignore-scripts
npm run sources
npm run build
npm run preview
```

`sources` 只读本地与缓存的 origin ref，不联网、不更新源码。定时任务需要明确包含授权更新动作；若仅授予监测权限，先报告差异，不实施 merge。

可复用委托提示：

> 更新 agent-insight 中指定对象的研究。遵循 AGENTS.md 与本页。以登记基线为旧版本，核验授权范围内的官方主干。先列影响章节，逐页检查构造/注入/生命周期/入口到执行点/存储边界；更新词典与层次图，然后更新依赖比较页。未经核验保留原基线与状态。禁止把未找到当不支持，禁止把规范当实现。交付范围、证据、门禁结果和未验证项。

分析建议用当前会话模型的 xhigh；格式整理可用 high；跨架构争议再增加独立核验。无需仅因资料多就使用 ultra。
