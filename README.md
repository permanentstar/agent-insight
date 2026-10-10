# Agent Insight

面向维护者的 Agent 源码研究书，独立仓库 permanentstar/agent-insight，按可公开资料维护。Markdown 是维护来源，VitePress 是可搜索阅读层。正文中文。

**当前：九对象分层主链路版。**Pi AgentSession/Pico5、DeerFlow、Codex、Hermes、LangChain、LangGraph、DeepSeek 已形成固定源码基线的代表主链路正文；Claude 按冻结原稿整理，Lane 留在历史附录。新增 DeerFlow 中间件、Pi 扩展、Claude 压缩/记忆专题，横向比较覆盖全部九对象。源码仍锁定 2026-10-09 观察点，分析整理日期为 2026-10-10。21 份原稿均保留，尚未完成全文消化；未建定时任务或站点部署。

| 从哪里开始 | 内容 |
|---|---|
| [比较页](docs/comparisons/index.md) / [比较模板](docs/templates/comparison.md) | 同一问题下的机制与取舍；先比较，再进入各对象分册 |
| [阅读首页](docs/index.md) / [对象地图](docs/guide/map.md) | 分册、层次、默认/实验/冻结状态 |
| [源码基线](docs/guide/baselines.md) / [baselines.json](baselines.json) | 完整 SHA、主干观察点与历史版本 |
| [对象模板](docs/templates/project.md) / [机制模板](docs/templates/mechanism.md) | 层次图、概念词典、构造与执行点 |
| [更新流程](docs/maintenance/update.md) / [契约](docs/maintenance/contracts.md) | 后续 agent 的更新与换机入口 |
| [迁移清单](docs/maintenance/migration.md) | 每份旧文去向与尚未迁移内容 |
| [历史原稿](archive/README.md) | 迁移期间保留的 Markdown 原文；不进入阅读站点 |
| [选型记录](docs/maintenance/tooling.md) | 独立 repo 与 VitePress 决策 |

## 本地阅读

需要 Node.js 22 与 npm。目标源码不作为 Git 子模块，不随本书安装运行。

```sh
npm ci --ignore-scripts
npm run build
npm run preview
```

阅读 http://127.0.0.1:4173；只在本地预览。`npm run preview` 默认在前台运行，需保持终端开启；进程退出或重启电脑后须重新启动。重新 build 后重启 preview，以刷新阅读脚本与路由缓存。预览通过 Vite 显式绑定 127.0.0.1:4173，端口被占用时直接报错。`npm run dev` 为开发服务器；依赖风险见选型记录，不开放到网络。主干 CI 只构建，不部署静态网站。

```sh
export AGENT_SOURCE_ROOT=/your/community-root
npm run sources
npm run check
npm run test:contracts
```

路径迁移只改变 AGENT_SOURCE_ROOT。也可以在 gitignored 的 .source-map.json 中填写 repo ID 到本机绝对路径的 JSON 映射。sources 是只读校验，origin ref 仅是本地 fetch 缓存；它不会联网、拉取或改写基线。

当前正式 Pi 默认为 AgentSession；实验持久路线已从 Lane 迁到 Pico5。“转正”仅指官方 Agent 默认在生产使用，库 API 发布另行记事实。Claude 冻结历史分析，不自动追新；Codex 旧官方实践与新源码分析分开。

历史原稿的细节尚未全部提炼，当前保留 archive/ 中的完整 Markdown，后续维护从本仓库读取即可。migration.json 登记每份原稿的路径、SHA-256 与迁移去向；待覆盖范围登记完成且正文不再引用后，可删除相应原稿。原文获准纳入 Git；删除当前文件后，Git 历史仍保留旧内容。

本版验证：46 页元数据与引用门禁、13 项契约测试及静态构建通过；108 处固定源码链接已核对本地对应文件和行号范围，11 张新增 SVG 在目标页面浅深主题中检查。源码仅作静态分析，没有运行目标 Agent、模型请求或崩溃测试。每页 verified_scope 说明实际核验范围，migration.json 登记尚未消化细节。构建依赖的已知报告项及本地使用范围见选型记录。
