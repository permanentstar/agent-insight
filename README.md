# Agent Insight

一本研究 Agent 架构、运行机制和设计取舍的源码书。正文中文，Markdown 与可编辑 SVG 保存研究内容，VitePress 提供导航和本地搜索。

研究对象包括 Pi AgentSession、Pi Durable、DeerFlow、Claude Code、Codex、Hermes、LangChain、LangGraph 与 DeepSeek Harness；Lane Harness 作为历史架构附录。横向比较位于各对象分册之前。

| 阅读入口 | 内容 |
|---|---|
| [书籍首页](docs/index.md) | 研究问题与阅读路径 |
| [版本说明](docs/guide/baselines.md) | 集中说明固定提交、实现阶段、依赖组合与研究范围 |
| [横向比较](docs/comparisons/index.md) | 所有权、决策、上下文、恢复、执行与观测的机制和取舍 |
| [架构归纳与设计取舍](docs/comparisons/agent-in-business.md) | 将模型决策、运行进度和业务事实组合成完整服务，承接横向比较与对象分册 |
| [对象地图](docs/guide/map.md) | 选择对象分册与独有专题 |
| [调用链阅读方法](docs/guide/reading.md) | 对象层次、生命周期、执行点与状态边界 |

## 本地阅读

需要 Node.js 22 与 npm。首次安装和构建：

```sh
npm ci --ignore-scripts
npm run build
npm run preview
```

打开 http://127.0.0.1:4173/。`npm run preview` 在前台运行，保持终端开启；按 Ctrl+C 停止。已经构建时只需运行 preview；电脑重启后重新启动即可。修改文档后重新 build，再重启 preview。服务只绑定 127.0.0.1，端口被占用时直接报错。CI 负责检查和构建。

本地审稿使用 `npm run review`，它先检查并构建带审稿界面的本地版本，再在同一地址启动。若 preview 正在运行，先按 Ctrl+C 停止，二者不同时占用 4173。选中正文点击“添加批注”，或通过右下角“批注”添加整章意见、查看全书意见。批注保存到 gitignored 的 `.review/annotations.json`，刷新与重启服务后保留；普通 `npm run build` 不包含审稿界面。存储与换机边界见[本地审稿资料](maintenance/tooling.md#本地审稿资料)。

## 仓库维护

书籍内容位于 docs/，目录由 catalog.json 管理。版本登记保存在 baselines.json，页面元数据保存引用、结论依赖和核验范围，不逐页显示版本条。

维护资料与阅读内容分开存放，不进入书籍构建或搜索：

- [写作与教学评审规范](maintenance/writing.md)：后续新增和修订内容共同遵循的主线、段落、概念、图文与源码讲解要求。
- [教学资料筛选](maintenance/research-sources.md)：外部 GitHub 教程的观察点、采用方式与不采用的结论。
- [教学深化与更新计划](maintenance/update.md)与[元数据契约](maintenance/contracts.md)：教学补充顺序、源码更新与换机入口。
- [对象模板](templates/project.md)、[机制模板](templates/mechanism.md)与[比较模板](templates/comparison.md)：统一研究问题和章节结构。
- [构建工具说明](maintenance/tooling.md)：VitePress、依赖及本地服务配置。
- [参考材料登记](maintenance/provenance.md)与[历史研究资料](archive/README.md)：保留引用依据及文件校验信息。

源码路径通过本机变量或 gitignored 的 .source-map.json 配置；书籍不依赖机器绝对路径，也不随安装运行目标 Agent。

```sh
export AGENT_SOURCE_ROOT=/your/community-root
npm run sources
npm run check
npm run test:contracts
```

sources 只读本地 checkout 与缓存的 origin ref，不联网、拉取或改写版本登记。引用固定源码，正文不把本机 WIP 作为上游实现。

Claude 源码采用 baselines.json 中登记的冻结原始提交，不纳入定时主干更新。新 checkout 的 source-status 只核对该提交可读，不要求其 HEAD 与源码快照相同。
