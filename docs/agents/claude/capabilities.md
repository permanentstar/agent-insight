---
id: "claude-capabilities"
title: "Claude Code：工具、权限、MCP 与 Bridge"
subject: "claude"
status: "frozen-source"
baselines: ["claude-source-20260331"]
sources: ["claude-march", "claude-legacy"]
depends_on: ["claude-migrated", "claude-context"]
evidence: ["source", "historical-document"]
verified_scope: "固定源码的 query、工具权限、压缩及相关宿主路径已静态核验；feature gate 引用的缺失模块保持未知，未运行目标或私有依赖。"
---

# Claude Code：工具、权限、MCP 与 Bridge

工具执行发生在客户端管线中：模型提出 tool_use，运行时校验输入、判断权限、执行动作并回填结果。工具目录、MCP 协议、用户命令和远端 Bridge 分别扩展这条链的不同位置。

![用户命令走控制面，模型工具走校验、hook、权限和执行管线；MCP 连接提供工具，Bridge 另管远端会话与审批回传](../../assets/claude-capabilities.svg)


先沿模型的一次动作请求展开：工具池提供可见能力，执行器准备参数并取得权限，handler 返回结果供下一请求采用。MCP 将外部能力接入同一工具管线，Bridge 将远端任务接入会话宿主；它们的位置不同，因此在主动作链之后分别解释。

| 概念 | 所属层次与所有者 | 生命周期 / 限制 |
|---|---|---|
| Tool / ToolUseContext | 工具定义与当前运行上下文 | schema、readOnly/concurrencySafe、call 与结果预算各有作用 |
| StreamingToolExecutor | query 工具编排 | 可并发/需串行按工具声明和当前批次判断，非所有工具同时执行 |
| canUseTool | 宿主生成并注入 query | tool permission context、规则、hook、classifier/UI 各有分支 |
| deferred tools / ToolSearch | 能力目录与发现 | 搜索 schema，引用随对话保留；不是用 LLM 重新定义工具 |
| Skill | 操作知识与执行方式 | inline 进入当前请求；fork 构造独立 Agent 执行；与 schema 发现分开 |
| MCP client | 外部协议 | initialize、工具/资源/prompt、通知；能力以实际 handler 为准 |
| Slash command | 用户控制面 | 会话、配置、登录、压缩、扩展管理；不经过模型决策也可生效 |
| Bridge | 远端连接/工作宿主 | 远控子进程宿主、REPL远端桥与IDE transport 分开 |

## 第一步：准备工具定义与运行上下文

调用链是 tools.ts 构造工具池 → feature/config/permissions/MCP/agent 范围过滤 → query 交 orchestration/execution → 参数验证、pre hook 与权限 → Tool.call → result budget / post hook → tool_result → 下一轮模型。FileRead/FileEdit/Bash/Agent/Skill 是不同 handler，不把某个工具的 checkpoint/安全检查概括成全工具能力。

ToolSearch 使用 keyword/select:name 检索与 deferred schema 披露；Skill Discovery 是知识入口。两者按需提供定义或知识，减少初始请求需要携带的内容；具体收益取决于目录规模和使用方式。工具结果预算把超大输出写入文件并返回预览；后续工具可按该路径继续读取。

## 第二步：执行前消费权限决定

REPL 的 useCanUseTool 生成 canUseTool 后传给 query。执行器先取得 PreToolUse 的结果，再由 resolveHookPermissionDecision 协调 hook 与规则；默认权限路径进入 canUseTool，得到 allow/deny/ask。hook 允许也要先检查显式规则，deny/ask 规则优先；规则为空时可直接采用 hook 的 allow。deny 回错误 tool_result，ask 才进入 UI、远端回调或对应协调通道。CLI permission mode、用户/项目/managed settings、工具规则、hook 与 classifier 参与决策，不能把自然语言 tool description 当安全政策。

Bash classifier 做分类判断，readOnly/concurrencySafe 是工具声明，二者都不保证任意命令或环境完全安全。feature/settings gates 决定具体分支是否启用；接口存在与本次运行采用该接口是不同条件。

## 第三步：执行 handler，再回填结果

允许执行后，`Tool.call` 处理实际文件、命令或外部操作。返回值经过预算治理与后处理，包装为 tool_result，再由 query 采用。拒绝时形成对应反馈，下一次 query 据此处理这项未执行的动作。

以读取文件后修改为例：Read 的反馈提供当前实现，后续 Edit 提供修改结果，Bash 的验证反馈说明检查事实。三个结果可以在同一 query 中先后出现，也可以受并发安全规则分批执行。执行器组织这些调用的受理与反馈，具体后续动作仍由模型结合观察决定。

下面按执行器整理三个交接位置的源码骨架，**不是连续的完整函数**。前后参数解析、hook 处理、拒绝返回、日志与结果预算省略；第二次检查消费 processedInput，效果使用最终 callInput。

```ts
const isValidCall = await tool.validateInput?.(parsedInput.data, toolUseContext)
// 省略：无效返回；PreToolUse 处理及规范化参数。
const resolved = await resolveHookPermissionDecision(
  hookPermissionResult, tool, processedInput, toolUseContext,
  canUseTool, assistantMessage, toolUseID,
)
const permissionDecision = resolved.decision
// 省略：deny/ask 与允许路径处理；确定最终 callInput。
const result = await tool.call(
  callInput,
  { ...toolUseContext, toolUseId: toolUseID,
    userModified: permissionDecision.userModified ?? false },
  canUseTool, assistantMessage, progress => { /* 省略进度回调 */ },
)
const mappedToolResultBlock = tool.mapToolResultToToolResultBlockParam(result.data, toolUseID)
```

这条链将参数受理、有效权限、实际效果与返回关联起来。ToolSearch 提供 deferred 定义；Skill inline 加载正文，fork 则另起 Agent，两者在请求准备和子执行位置接入这条主线。[查看参数校验](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/services/tools/toolExecution.ts#L683)、[权限协调](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/services/tools/toolExecution.ts#L921)、[实际 call 与反馈映射](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/services/tools/toolExecution.ts#L1207)、[Skill fork 分支](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/tools/SkillTool/SkillTool.ts#L621)。

## 扩展支路一：通过 MCP 接入外部能力

MCP client 声明 roots 和 elicitation，包含对应 handler，以及 progress、list_changed 通知；没有注册 sampling/createMessage handler。协议提供某项能力，不意味着客户端实现了它。[查看客户端能力与 handler 注册](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/services/mcp/client.ts#L985)。notifications/claude/channel 是私有扩展，也不能当作标准 MCP 功能。

连接策略由 client/transport 管理；transport 的选择、可用 handler 和业务授权分别决定能接入什么、能处理什么、获准执行什么。OAuth/Bearer 解决业务授权，TLS 解决传输加密，登录成功也不代替工具执行政策。

## 扩展支路二：远控、会话桥与 IDE 接入

| 接入方式 | 执行链 | 作用范围 |
|---|---|---|
| 远控任务宿主 | bridgeMain 注册 environment、轮询 work、sessionRunner spawn Claude child、heartbeat、completion | 这是远控任务宿主链，CLI 子进程仍拥有模型工具执行 |
| REPL 远端桥 | initReplBridge → replBridge.initBridgeCore 或 remoteBridgeCore.initEnvLessBridgeCore（按配置） | 给已有 REPL/SDK 转发 Web/mobile 消息与审批，不另造同一 query owner |

远控 Bridge 接纳 work、管理子进程并回传状态；REPL 远端桥按配置选择 env-based 的 replBridge.initBridgeCore 或 env-less 的 remoteBridgeCore.initEnvLessBridgeCore，把 Web/mobile 接到已有会话。IDE 的实际接入另在 MCP client 的 sse-ide/ws-ide transport 与 vscodeSdkMcp。三种入口有不同 owner；收到完成回报仍需结合工具结果解释任务效果。[远控宿主](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/bridge/bridgeMain.ts)、[REPL 远端桥](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/bridge/initReplBridge.ts#L110)、[IDE transport](https://github.com/permanentstar/claude-code-source-leak/blob/9f51e71641c1472293ebe4a7968b44455c00f0ba/src/services/mcp/client.ts#L678)。

## UI 状态与执行状态

AppState 字段包括 messages/status/toolPermissionContext/model/settings/tasks/replBridgeEnabled；它描述 UI/会话管理视角，不能因此说全部运行状态都由 React 保存。QueryEngine 是非交互宿主，query 是循环，REPL 是显示与控制，三者边界见 [架构](architecture.md)。

UI messages/status、活动 query、transcript 和后台任务各有生命周期。snip/contextCollapse 的算法仍有实现证据缺口，in-process 队友接单已有输入采用链，跨进程耐久确认则需另证；这些边界分别见 [上下文](context.md)与 [主链路](architecture.md)。
