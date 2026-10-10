# Agent Insight

面向维护者的 Agent 源码研究书，独立私有仓库 permanentstar/agent-insight。Markdown 是维护来源，VitePress 是可搜索阅读层。正文中文。

**当前：框架与代表样例版，尚未完成旧文全文迁移与所有对象的最新源码分析。**7 个源码仓库更新到 2026-10-09 的官方主干观察点；21 份飞书材料已清点并映射。Pi AgentSession/Pico5 有代表性静态核验；Lane 冻结为附录；其他对象部分消化或待分析。没有定时任务与站点发布。

| 从哪里开始 | 内容 |
|---|---|
| [阅读首页](docs/index.md) / [对象地图](docs/guide/map.md) | 分册、层次、默认/实验/冻结状态 |
| [源码基线](docs/guide/baselines.md) / [baselines.json](baselines.json) | 完整 SHA、主干观察点与历史版本 |
| [对象模板](docs/templates/project.md) / [机制模板](docs/templates/mechanism.md) | 层次图、概念词典、构造与执行点 |
| [比较页](docs/comparisons/index.md) / [比较模板](docs/templates/comparison.md) | 同一问题下的机制与取舍 |
| [更新流程](docs/maintenance/update.md) / [契约](docs/maintenance/contracts.md) | 后续 agent 的更新与换机入口 |
| [迁移清单](docs/maintenance/migration.md) | 每份旧文去向与尚未迁移内容 |
| [选型记录](docs/maintenance/tooling.md) | 独立 repo 与 VitePress 决策 |

## 本地阅读

需要 Node.js 22 与 npm。目标源码不作为 Git 子模块，不随本书安装运行。

```sh
npm ci --ignore-scripts
npm run build
npm run preview
```

阅读 http://127.0.0.1:4173；只在本地预览。重新 build 后重启 preview，以刷新阅读脚本与路由缓存。`npm run dev` 为开发服务器；依赖风险见选型记录，不开放到网络。主干 CI 只构建，不部署静态网站。

```sh
export AGENT_SOURCE_ROOT=/your/community-root
npm run sources
npm run check
npm run test:contracts
```

路径迁移只改变 AGENT_SOURCE_ROOT。也可以在 gitignored 的 .source-map.json 中填写 repo ID 到本机绝对路径的 JSON 映射。sources 是只读校验，origin ref 仅是本地 fetch 缓存；它不会联网、拉取或改写基线。

当前正式 Pi 默认为 AgentSession；实验持久路线已从 Lane 迁到 Pico5。“转正”仅指官方 Agent 默认在生产使用，库 API 发布另行记事实。Claude 冻结历史分析，不自动追新；Codex 旧官方实践与新源码分析分开。

原飞书细节尚未全部迁完，当前不能删除旧材料。后续先完成 migration.json 覆盖，再结束旧来源保留。Git 记录正文历史，不另起无索引 archive。

本版验证：43 页元数据/引用检查与静态构建通过；7 项契约测试通过；中英文搜索、四张 SVG 在浅深主题中实测通过。源码仅作静态核验，没有运行目标 Agent、模型请求或崩溃测试。构建依赖的已知报告项及本地使用范围见选型记录。
