---
id: "claude-capabilities"
title: "Claude Code：冻结工具、权限、MCP 与 Bridge"
subject: "claude"
status: "frozen-document"
baselines: ["claude-frozen-documents"]
sources: ["claude-march", "claude-legacy"]
depends_on: ["claude-migrated", "claude-context"]
evidence: ["historical-document"]
verified_scope: "逐主题整理冻结原稿与冲突/缺失点；没有可复现源码 snapshot，全部为历史转述，不作当前实现证据。"
---

# Claude Code：冻结工具、权限、MCP 与 Bridge

冻结材料将工具执行放在客户端管线：模型提出 tool_use，运行时校验、询问权限、执行、回填结果。旧文中 MCP 协议能力、Bridge 总称与当前产品实现不能互相代证。

![冻结材料中用户命令走控制面，模型工具走校验、hook、权限和执行管线；MCP 连接提供工具，Bridge 另管远端会话与审批回传](../../assets/claude-capabilities.svg)

| 概念 | 冻结材料中的层次与 owner | 生命周期 / 限制 |
|---|---|---|
| Tool / ToolUseContext | 工具定义与当前运行上下文 | schema、readOnly/concurrencySafe、call 与结果预算各有作用 |
| StreamingToolExecutor | query 工具编排 | 可并发/需串行按工具声明和当前批次判断，非所有工具同时执行 |
| canUseTool | 宿主生成并注入 query | tool permission context、规则、hook、classifier/UI 各有分支 |
| deferred tools / ToolSearch | 能力目录与发现 | 搜索 schema，引用随对话保留；不是用 LLM 重新定义工具 |
| Skill | 操作知识 | 发现/加载过程资料；不是和 ToolSearch 同一对象 |
| MCP client | 外部协议 | initialize、工具/资源/prompt、通知；能力以实际 handler 为准 |
| Slash command | 用户控制面 | 会话、配置、登录、压缩、扩展管理；不经过模型决策也可生效 |
| Bridge | 远端连接/工作宿主 | 原稿对 IDE 与 Remote Control 混用名称，分开处理 |

## 工具定义到效果点

冻结原稿的路径是 tools.ts 构造工具池 → feature/config/permissions/MCP/agent 范围过滤 → query 交 orchestration/execution → 参数验证、pre hook 与权限 → Tool.call → result budget / post hook → tool_result → 下一轮模型。FileRead/FileEdit/Bash/Agent/Skill 是不同 handler，不把某个工具的 checkpoint/安全检查概括成全工具能力。

ToolSearch 保留 keyword/select:name 检索与 deferred schema 披露的结论；Skill Discovery 是知识入口。两者都可减少初始上下文，但原稿没有统一性能数据，本书不保留定量收益。工具输出过大写文件和预览由具体结果预算实现，路径不是模型自动可靠引用的证明。

## 权限链与拒绝语义

REPL 的 useCanUseTool 生成 canUseTool 后传给 query；执行前 hasPermissionsToUseTool 得到 allow/deny/ask。deny 回错误 tool_result，ask 才进入 UI、远端回调或对应协调通道。CLI permission mode、用户/项目/managed settings、工具规则、hook 与 classifier 参与决策，不能把自然语言 tool description 当安全政策。

这些是历史转述；Bash classifier 属分类判断，readOnly/concurrencySafe 属工具声明，不证明任意命令或环境完全安全。用户/组织配置的 gate 默认与所有代码分支是否启用未知，不能照原稿 API 列表断言全量功能在线。

## MCP 的原稿勘误必须保留

March 原稿记录 client capabilities 仅 roots 和 elicitation，列出 roots handler、elicitation handler、progress 与 list_changed 通知；**没有注册 sampling/createMessage handler**。协议存在 sampling，不等于这个 snapshot 的客户端支持。notifications/claude/channel 被原稿识别为私有扩展，不能当标准 MCP 功能。

原稿列 stdio、SSE/HTTP、Streamable HTTP/WebSocket 等连接形态，本书只保留“连接策略由 client/transport 管理”的边界，不声称每种 transport 都在相同版本已完整接通。远程 OAuth/Bearer 业务授权与 TLS 加密分别解释，登录不等同工具执行政策。

## 两种 Bridge 描述的处理

| 原稿 | 保留描述 | 不合并的原因 |
|---|---|---|
| March | bridgeMain 注册 environment、轮询 work、sessionRunner spawn Claude child、heartbeat、completion | 这是远控任务宿主链，CLI 子进程仍拥有模型工具执行 |
| Legacy | IDE ↔ Bridge ↔ Claude Session 的双向消息和审批转发 | 原文是概览，没有证明 IDE adapter 与 Remote Control 属同一模块 |

因此本页不写“Bridge 就是 IDE 插件”，也不推断两原稿是先后版本。snapshot SHA、构建版本与 module 对应关系缺失，存为未知。Bridge 完成回报与工具副作用持久完成的关系同样没有证据。

## UI 状态与缺失证据

旧文的 AppState 字段包括 messages/status/toolPermissionContext/model/settings/tasks/replBridgeEnabled；它描述 UI/会话管理视角，不能因此说全部运行状态都由 React 保存。QueryEngine 是非交互宿主，query 是循环，REPL 是显示与控制，三者边界见 [架构](architecture.md)。

原稿技术亮点中的性能/用户体验判断改为机制描述：stream、工具发现、渲染、状态通知各自解释，删去无数据的优越性断言。snip/contextCollapse 实现缺失与显式 teammate owner 后如何接单仍未知，见 [上下文章](context.md)。原源码未提供的情况下，不编造精确执行证据；这些未知已完成记录，不表示需不断追线上 Claude。
