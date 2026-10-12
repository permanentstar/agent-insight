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

采用独立 Git 仓库和 VitePress 阅读层。研究内容跨多个上游、有独立更新节奏、需要比较与基线治理，因此由研究仓库管理；其他项目通过链接引用。

| 方案 | 与本任务的匹配 | 本次决定 |
|---|---|---|
| [mdBook](https://rust-lang.github.io/mdBook/) | 章节、搜索与单书阅读直接；自定义基线条较多时需主题或预处理器 | 不采用；若未来只保留线性阅读可重新评估 |
| [VitePress](https://vitepress.dev/guide/what-is-vitepress) | 技术文档主题，Markdown/Vue，可把基线信息统一展示；多个分册共享导航 | 采用 1.6.4 stable，lockfile 固定 |
| [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) | 文档站、主题和浏览器搜索；需要 Python 依赖链 | 可替代，但初版不维护第二套构建 |
| [Docusaurus](https://docusaurus.io/docs) | 多文档与版本站点，React 扩展 | 当前用不可变源码基线即可，不引入整站版本复制 |

文档版本用 Git 与页级基线管理，不按每次上游 commit 复制整套站点。这样新增一个 agent 不需要重新复制全部比较章节，也不会产生多份“最新”正文。

依赖核验日期为 2026-10-09，npm audit 的稳定构建链有 3 个报告项（Vite、esbuild、VitePress，含 1 high），当时没有稳定版自动修复。涉及开发服务器；本次只在 loopback 查看构建后的静态产物，不开放服务、不部署站点。保留 stable，不用强制升级绕过兼容检查。正式开放阅读服务前须重新核验依赖与访问控制。[Vite advisory](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)、[esbuild advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99)。

仓库按可公开资料维护，历史研究原稿获准以 Markdown 纳入 Git。archive/ 位于 docs/ 之外，不进入站点构建与搜索；正文和元数据只引用本地原稿 ID，不记录私人在线来源链接或资源 token。原稿不代表最新实现；完整归档后仍须逐章源码核验。

GitHub 仓库可见性和静态站点发布分别管理。当前 CI 只做检查与构建，没有 Pages 发布任务；仓库公开与站点上线由 owner 后续设置。删除 archive/ 的当前文件不删除旧提交中的内容。

本地预览使用同一依赖链中的 Vite 5.4.21，通过 scripts/preview.config.mjs 显式绑定 127.0.0.1:4173，只提供已构建的静态文件。VitePress 1.6.4 的 preview 实现调用 listen(port)，没有传入 host，因此不能依靠其 --host 参数限制监听地址。2026-10-10 已改用 Vite preview，并以实际监听地址和浏览器页面核验。前台进程退出后链接不可用；重新启动 npm run preview 即可，后台运行也不会跨电脑重启保留。

## 本地审稿资料

owner 的审稿批注统一保存在仓库根目录 `.review/`，整个目录由 `.gitignore` 忽略，不提交到 GitHub。该目录位于 `docs/` 之外，不进入书籍构建或搜索。换机时需单独保留目录，clone 仓库不会恢复这些批注。不得强制添加审稿文件到 Git；若文件已被跟踪，忽略规则不能使它自动退出版本管理。

启动命令为 `npm run review`。它检查书籍结构，生成单独的 `docs/.vitepress/review-dist/`，通过只绑定 `127.0.0.1:4173` 的本地预览提供审稿界面和保存接口。普通 `npm run build` 生成 `docs/.vitepress/dist/`，编译时排除审稿组件；普通 preview 不挂载批注接口。两个输出目录均被 Git 忽略，内部版本不用于公开发布。

正文选文后可添加批注，也可添加整章意见；面板支持当前章节／全书、待处理／已处理筛选，以及编辑意见、定位小节和切换处理状态。批注保留稳定页面 ID、源文件路径、章节标题、正文 SHA-256、小节锚点、原文摘录、意见和时间。定位采用小节锚点；正文调整后的旧摘录仍保留，不把它假装成新正文的精确位置。无需 GitHub 登录或外部评论服务。

`scripts/review-contract.mjs` 定义共享协议，`review-store.mjs` 负责目录登记与批注数据，`review-server.mjs` 负责本地 HTTP 适配，Vue 组件负责选文和显示。单进程内写入串行化，先写临时文件再原子替换 `annotations.json`；已有文件损坏时具名报错并保留原文件。服务器检查 Host、Origin 和浏览器请求来源，并对读写使用每次启动生成的 token。输入页面必须来自书籍目录，客户端不能指定保存路径；不提供跨域访问。

验证命令为 `npm run test:review`。用临时数据验证中文批注重启后读取、并发保存、编辑与处理状态、过期章节与无效输入拒绝、损坏文件保留，以及跨来源／无 token 请求拒绝。网页选文、刷新恢复和浅深主题另在浏览器检查，不把存储测试当作 UI 成功。审稿文件与本地构建均须用 `git check-ignore` 核对，且不得成为 Git tracked 文件。
