# Agent Insight 协作规则

本仓库是跨 Agent 源码研究书的唯一维护来源。先读 README.md、docs/maintenance/contracts.md 和 docs/maintenance/update.md，再按研究对象读分册。正文默认中文，代码标识保留原文。

## 工作边界

- 这是研究文档项目。只读分析目标源码，不因分析需要运行目标 Agent、真实模型请求、NAS 服务或生产环境。
- 源码更新必须检查并保留目标 checkout 的 staged、unstaged 和 untracked 内容；只做明确授权的 fetch 与 fast-forward。禁止 stash、reset、clean 或覆盖用户改动。
- 不创建 worktree；路径迁移通过 AGENT_SOURCE_ROOT 或 gitignored 的 .source-map.json 解决。正文和基线清单不得依赖机器绝对路径。
- 飞书仅为迁移来源；不回写、不双向同步。不把原始导出包、运行时配置、凭据或完整会话写入仓库。

## 分析契约

- 当前实现、源码静态推断、运行观察、官方说明、历史转述和候选设计分开表达。
- 分册使用统一问题模板；独有机制可以增加专题，但必须注明所属对象和与共同章节的关系。
- Pi AgentSession 与持久运行架构分开比较。旧 Lane 基线不得作为最新主干实现证据。
- 基线集中定义在 baselines.json；页面只引用基线 ID，不各自维护另一份 SHA。目标源码使用 commit 固定链接。
- 多仓库依赖使用实际组合；框架最新主干与应用锁定版本不能混称为同一个运行组合。
- 页面 frontmatter 按 contracts.md 填写。更新日期不是核验完成证明；不允许只更新日期、SHA 或来源清单就把旧正文标成已核验。
- 新增页面必须进入目录；新增对象同时检查横向专题。引用结论变化时，检查调用它的比较页，不机械改写无关内容。
- 模板中的未知必须保留为未知；不可把“没找到”写成“没有能力”。运行验证必须说明是否实际运行，不能把读过测试当作测试通过。

## 交付验证

- 依赖固定到 exact version；npm install/npm ci 使用 --ignore-scripts。
- 运行 npm run check 与 npm run build；修改搜索或展示时，用中文词、英文符号及浅深主题检查代表页。
- SVG 必须自带不透明画布和显式颜色；不能依赖页面主题。图示必须准确标明历史与当前、组件与存储边界。
- 模板与治理脚本变更需要使用有效和无效资料验证门禁；不为正文措辞增加镜像测试。
- 提交使用 Asuka <asuka.noreply@gmail.com>，不添加 co-author。只 push 到已核实的私有 remote。
