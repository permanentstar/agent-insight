---
id: "tooling"
title: "仓库与 Markdown 书籍选型"
subject: "book"
status: "contract"
baselines: []
sources: []
depends_on: []
evidence: []
verified_scope: "本页维护书籍组织与阅读契约，不声明目标 Agent 运行验证。"
---

# 仓库与 Markdown 书籍选型

采用独立私有仓库和 VitePress 阅读层。研究内容跨多个上游、有独立更新节奏、需要比较与基线治理；放到 MY-NAS assets 会把研究生命周期与 NAS 运维同步混在一起。MY-NAS 如需引用，保留指向本仓库的链接即可。

| 方案 | 与本任务的匹配 | 本次决定 |
|---|---|---|
| [mdBook](https://rust-lang.github.io/mdBook/) | 章节、搜索与单书阅读直接；自定义基线条较多时需主题或预处理器 | 不采用；若未来只保留线性阅读可重新评估 |
| [VitePress](https://vitepress.dev/guide/what-is-vitepress) | 技术文档主题，Markdown/Vue，可把基线信息统一展示；多个分册共享导航 | 采用 1.6.4 stable，lockfile 固定 |
| [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) | 文档站、主题和浏览器搜索；需要 Python 依赖链 | 可替代，但初版不维护第二套构建 |
| [Docusaurus](https://docusaurus.io/docs) | 多文档与版本站点，React 扩展 | 当前用不可变源码基线即可，不引入整站版本复制 |

文档版本用 Git 与页级基线管理，不按每次上游 commit 复制整套站点。这样新增一个 agent 不需要重新复制全部比较章节，也不会产生多份“最新”正文。

依赖核验日期为 2026-10-09，npm audit 的稳定构建链有 3 个报告项（Vite、esbuild、VitePress，含 1 high），当时没有稳定版自动修复。涉及开发服务器；本次只在 loopback 查看构建后的静态产物，不开放服务、不部署站点。保留 stable，不用强制升级绕过兼容检查。正式开放阅读服务前须重新核验依赖与访问控制。[Vite advisory](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)、[esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99)。

私有 repo 不等于发布出的静态站点自动私有。CI 只做检查与构建，本次没有 Pages 发布任务。后续若要在线阅读，先选能保留私有访问控制的部署方式。
