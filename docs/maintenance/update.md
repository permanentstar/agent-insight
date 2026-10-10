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

更新以“哪些结论受到变化影响”为单位，不能只把日期和 SHA 改成今天。后续 agent 接到本页即可开始，不依赖飞书或这次会话。

![维护者先锁定基线与范围，再追对象层次及执行链，最后更新依赖比较页](../assets/book-map.svg)

1. 阅读 README、AGENTS、contracts、对象分册与依赖比较页；判断目标是跟踪主干、冻结材料补证还是新对象分析。
2. 通过 AGENT_SOURCE_ROOT 或本机 .source-map.json 找源码。先记录 branch、HEAD、remote、staged/unstaged/untracked；更新必须已有授权，只使用 fetch 与可安全 fast-forward，不清理用户改动。
3. 锁定 fetch 后的完整 SHA。脏 checkout 用 `git show <sha>:<path>` 读上游，不把本机修改带入结论。主干分叉、网络失败或文件冲突必须具名报告，不自动 stash/reset。
4. `git diff --name-status <old> <new>` 定位影响路径，再阅读相关构造、调用、存储及测试。架构改名同时核验“同一机制改名”还是“新模型重写”。
5. 新增不可变基线 ID。对核验过的章节迁移 baselines；没有检查的正文留在旧基线。更新词典、层次图、主链路和边界表，再更新消费这些结论的 comparisons 页面。
6. 新对象先补 subject、repo、基线和分册入口，再按统一模板建章，给所有比较维度添加该对象；未分析单元格写待核验。
7. 运行 `npm run check`、`npm run build` 和门禁反例检查；展示变更检查中文搜索、英文符号、浅深主题。报告已解决、未解决、未验证，注明源码静态分析是否有运行验证。

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
