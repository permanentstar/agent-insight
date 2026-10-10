---
id: "pi-platform"
title: "AgentSession：MCP、codemode、资源冲突与终端宿主"
subject: "pi-session"
status: "verified-source"
baselines: ["pi-20261009"]
sources: ["pi-session"]
depends_on: ["pi-extensions", "pi-context"]
evidence: ["source"]
verified_scope: "核验资源冲突诊断、MCP 重连与 codemode 嵌套执行；TUI/认证按当前入口整理，未执行终端或登录流程。"
---

# AgentSession：MCP、codemode、资源冲突与终端宿主

Pi 默认产品仍以 AgentSession 为运行边界；MCP、codemode、资源和终端是它的能力与宿主层。它们不因名字带“runtime”就成为另一个持久执行引擎。

![资源加载进入 ExtensionRunner 与工具注册；MCP 连接提供工具；codemode 脚本经上下文 executeTool 进入同一工具管线；终端只观察和控制](../../assets/pi-capabilities.svg)

| 概念 | 所属层 / owner | 创建和消费 | 生命周期 |
|---|---|---|---|
| ResourceLoader | 发现与诊断 | SDK/CLI 注入，AgentSession 消费 | reload 重新扫描；冲突规则按资源类型 |
| MCP connection | 外部能力连接 | 内置 MCP extension 构造 server connections | 会话开始后台连接，调用可重连；关闭停止连接 |
| codemode | 工具组合 | extension tool 创建受限 JS sandbox | 一次脚本执行；嵌套工具仍经 AgentSession |
| ModelRuntime / provider auth | 模型和凭证 | 组合根配置，模型请求消费 | OAuth refresh 与模型选择不同职责 |
| TUI Component / screen | 显示宿主 | interactive mode 订阅事件并绑定 UI | 不拥有会话存储或工具副作用 |

## 资源冲突不是统一拒绝

PromptTemplate 和 Theme 按名字保留先出现项并产生 collision diagnostics。扩展 tools/flags 冲突记入 errors，但保留 extensions，最终 precedence 由加载/注册顺序处理。命令、Skill、资源路径和可替换内置扩展有各自规则，因此重名的处理需要按资源类型判断，并非整个插件一律加载失败。诊断必须让维护者看见来源与采用项。

`reload` 会重建 runner 与运行绑定，旧引用失效；保存 active tool 名并不让旧插件对象继续拥有 UI/会话。注册、激活、模型可见和执行门禁的区别见 [扩展章](extensions.md)。证据：[扩展冲突诊断](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/resource-loader.ts#L795)、[Prompt/Theme 去重](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/core/resource-loader.ts#L1160)。

## MCP：连接、曝光、调用

当前配置支持 direct、deferred、codemode 工具曝光。direct 给模型 schema；deferred 经 tool_search 披露；codemode 由脚本搜索并调用。曝光影响模型怎么发现工具，不能当作执行授权。SDK 不自动加载 CLI 内置 extensions，MCP/codemode/tool-search 要显式加入 ResourceLoader。

会话开始后台连接 enabled server，首次 prompt 等待相关准备。工具调用经 MCP tool → McpServerConnection.callTool → withClient → McpClient，再由 stdio / Streamable HTTP 等 transport 完成协议。OAuth 的 server 业务授权与模型 OAuth、TLS 链路加密不同。

withClient 对标记 readOnly 的 transient HTTP 错误允许一次重试；tool effect 不因此盲目重试。MCP session expired 分支因服务端不再认识该会话而用新会话重试一次，和“结果未知仍重放”不同。needs-auth 会更新状态并要求登录，不能把断线都归为没有权限。

证据：[当前配置/曝光与 SDK 说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/docs/mcp.md#L189)、[调用和重试边界](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/runtime.ts#L265)、[MCP OAuth](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/mcp/oauth.ts)。

## codemode：脚本的权限来自可调用工具

模型给 raw JavaScript，执行工具在 QuickJS sandbox 运行异步脚本；没有 Node、文件系统或直接网络 API。宿主提供 tools / store / model globals。脚本通过 ctx.executeTool 调嵌套工具，携带父调用身份并产生结果；MCP 的 tool_call/tool_result hooks 仍作用于嵌套调用。脚本环境限制并不撤销底层工具已获准的文件或网络权限。

工具含 outputSchema 且有 structuredContent 时返回结构化值，否则文本/错误按 outcome 转换。脚本失败前已经运行的工具效果不会回滚；store 的会话分支数据与 JS 局部变量也不是同一持久性。证据：[脚本到 executeTool](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/extensions/codemode/execute.ts#L416)、[codemode 运行说明](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/docs/codemode.md)。

## 终端、认证与平台

TUI 使用 Component/Container、布局、输入与 renderer 分层，main-screen 与 alt-screen 是显示策略；不能据 UI 支持分支/恢复推断两种 screen 有不同 Agent 存储。主屏关注终端滚动历史，备用屏关注受控视口；它们都消费产品事件。[组件与屏幕导出](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/tui/src/index.ts)、[交互渲染宿主](https://github.com/earendil-works/pi/blob/f1b2e77f5b13b2a199b1052cb79c235451afe7d7/packages/coding-agent/src/modes/interactive/tui-renderer.ts)。

模型 provider 决定 API 请求协议与响应事件，auth 模块决定 API key/OAuth 获取/刷新；ModelRuntime 组合二者。新增 provider 要同时检查发现、凭证、stream、usage、tool result 与错误路径，不能只加模型名称。模型名称进入目录，只完成发现；请求协议、认证、响应解析和工具结果接回循环后，才形成完整调用链。
