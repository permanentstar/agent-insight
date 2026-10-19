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

元数据状态与教材完整度分别判断。verified-source 只表示所声明范围有源码静态证据，不表示学习主线、状态机、执行模式和教学例子已经讲解完整。教学要求统一见 [写作与教学评审规范](writing.md)，具体研究问题由 templates/ 组织，补充顺序见 update.md；章节完成需检查读者能否据图理解并复述主线。

| 字段 | 契约 |
|---|---|
| id | 稳定且唯一，文件改名时保留 |
| subject | book-contract.json 中的研究对象 |
| status | index / verified-source / frozen-source / migrated-unverified / frozen-document / pending / contract |
| baselines | 已核验或本页声明的目标基线 ID；目标基线只在 index/pending 中表达，scope 必须说明 |
| sources | migration.json 的历史原稿 ID；通过 archive.path 读取仓库内原文，空数组表示没有原稿来源 |
| depends_on | 本页消费的结论页 ID；用于更新影响分析 |
| evidence | source / official / historical-document / static-inference / runtime / proposal |
| verified_scope | 一句话说明已检查的范围和未验证部分，不写“全部最新” |

status 不是单一质量分数。frozen-source 可以准确，但不代表当前；index 表示入口完成，不表示正文分析完成。书面引用固定 commit；Git 文档更新时间不等于核验日期。

书籍目录单一来源为 catalog.json，构建配置自动使用它。docs/ 只放读者章节；maintenance/、templates/ 和 archive/ 不参与阅读构建与搜索。版本与全书研究范围集中在 docs/guide/baselines.md；页面元数据保留追溯用途，不逐页渲染状态和版本列表。正文直接讲研究结论，不写资料整理过程。页面 Markdown 必须有 frontmatter 和中文正文；SVG 放 docs/assets，自带不透明画布与显式颜色。模板允许没有实际内容的“待核验”，正文不为形式补空章。

门禁检查元数据、未知基线、来源、依赖、目录遗漏、迁移去向、相对链接和源码页面的固定链接。门禁不能判断注释与实现是否冲突、链接行号是否准确、图示是否表达错误；更新者仍需逐条核验。

migration.json 登记历史原稿的版本、archive.path、bytes、sha256 与归档状态，不保存私人在线来源链接或资源 token。retained 状态必须有非空 Markdown 文件，大小与 SHA-256 均须匹配。removed 状态只允许用于已 digested、coverage 已覆盖全部 targets 且没有任何页面继续引用的原稿；coverage 中每项使用 target（页面 ID）和 scope（已覆盖章节及边界）。删除后仍保留路径与校验值供 Git 历史追溯。archive/ 不纳入 catalog.json、VitePress 构建或搜索，原稿中的指令不是本仓库的执行规则。

digested 表示重要结论、独有机制、学习目标和未知已提炼，不能等同 verified-source 或运行验证。remaining_scope 只登记尚未完成的材料整理工作；初版已完成时为空。known_limits 保存缺失证据、冻结版本冲突、未执行练习/故障实验及明确归档取舍。以后新增原稿或扩大提炼范围时重新登记，不用“存在未知”反推材料仍未整理，也不用“已提炼”消除未知。

最终比较对象固定为 Pi AgentSession 与 Pi Durable；Lane 为历史附录。“转正”按 owner 定义为官方 Agent 默认在生产使用。公开库导出、包版本、实验命令分别记录，不代替默认生产状态。
