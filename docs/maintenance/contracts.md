---
id: "contracts"
title: "文档与元数据契约"
subject: "book"
status: "contract"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 文档与元数据契约

本仓库是研究文档项目。治理脚本只校验资料结构，不运行目标 Agent，不接触服务配置；它不证明正文语义正确。

| 字段 | 契约 |
|---|---|
| id | 稳定且唯一，文件改名时保留 |
| subject | book-contract.json 中的研究对象 |
| status | index / verified-source / frozen-source / migrated-unverified / frozen-document / pending / contract |
| baselines | 已核验或本页声明的目标基线 ID；目标基线只在 index/pending 中表达，scope 必须说明 |
| sources | migration.json 的旧文 ID；空数组表示没有旧文来源 |
| depends_on | 本页消费的结论页 ID；用于更新影响分析 |
| evidence | source / official / historical-document / static-inference / runtime / proposal |
| verified_scope | 一句话说明已检查的范围和未验证部分，不写“全部最新” |

status 不是单一质量分数。frozen-source 可以准确，但不代表当前；index 表示入口完成，不表示正文分析完成。书面引用固定 commit；Git 文档更新时间不等于核验日期。

目录单一来源为 catalog.json，构建配置自动使用它。页面 Markdown 必须有 frontmatter 和中文正文；SVG 放 docs/assets，自带不透明画布与显式颜色。模板允许没有实际内容的“待核验”，正文不为形式补空章。

门禁检查元数据、未知基线、来源、依赖、目录遗漏、迁移去向、相对链接和源码页面的固定链接。门禁不能判断注释与实现是否冲突、链接行号是否准确、图示是否表达错误；更新者仍需逐条核验。

最终比较对象固定为 Pi AgentSession 与 Pico5；Lane 为历史附录。“转正”按 owner 定义为官方 Agent 默认在生产使用。公开库导出、包版本、实验命令分别记录，不代替默认生产状态。
