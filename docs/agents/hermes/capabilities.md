---
id: "hermes-capabilities"
title: "Hermes：ACP、平台、Skills、委派与定时宿主"
subject: "hermes"
status: "verified-source"
baselines: ["hermes-20261009"]
sources: ["hermes"]
depends_on: ["hermes-migrated", "hermes-context"]
evidence: ["source"]
verified_scope: "核验 ACP 转换与单会话认领、子 Agent 构造与 cron owner fence；工具/平台扩展按契约整理，未运行各平台或调度。"
---

# Hermes：ACP、平台、Skills、委派与定时宿主

CLI、Gateway、ACP、cron 都可宿主持有 AIAgent，但输入身份、队列、审批回传和收尾不同。扩展要先判断改变的是入口、模型协议、知识、工具还是运行拓扑。

![CLI、Gateway、ACP 和 cron 各自控制输入与会话，进入 AIAgent；工具注册、记忆和子 Agent 由不同 owner 扩展](../../assets/hermes-capabilities.svg)


先按 ACP 的一份输入看宿主如何接入原生循环，再看工具和知识怎样进入请求；需要更多执行者时，delegate 构造独立 child。cron 在另一宿主生命周期触发同一门面，放在委派之后分别解释。

| 阅读位置 | 接入职责 | 交给原生循环或调用方 |
|---|---|---|
| ACP 输入 | 身份、排队、审批回调与展示 | 已认领 turn、用户消息与宿主回调 |
| 能力装配 | ToolRegistry、Skills、provider | 当前请求和执行可用的定义 |
| delegate | 父上下文、child 构造与结果收集 | 子运行结果，作为父模型观察 |
| cron | 一次 fire 的归属与交付控制 | 本次 AIAgent 运行和结果投递 |

| 概念 | 层次与构造者 | 实际消费者 | 生命周期 |
|---|---|---|---|
| MessageEvent / BasePlatformAdapter | Gateway 平台层：adapter 转换消息与媒体 | gateway runner | 平台连接常驻，消息映射到 session key |
| ACP SessionState | 编辑器协议：session manager | HermesACPAgent.prompt | 外部 handle 稳定，内部 Hermes ID 可能轮换 |
| ToolRegistry / toolsets | 能力目录：模块/插件注册 | model_tools 定义与 handler 分发 | 注册、可见、availability 与授权分开 |
| ProviderProfile | provider 元数据与请求差异 | 初始化与路由 | 身份/地址/模型能力不等于传输实现 |
| ProviderTransport | API 协议适配 | 本轮请求/响应转换 | convert_messages/tools、build_kwargs、normalize_response |
| delegate child | 执行拓扑：父上下文构造 AIAgent | 子运行与 completion 回收 | 独立上下文；共享文件需要另行协调 |
| cron fire claim | 调度归属：scheduler / store | job worker 与结果交付 | job 定义、一次 execution 与 owner 分别管理 |

## ACP 主线：认领输入、绑定回调、运行并返回

`prompt` 查 SessionState → 提取文本与多模态资源 → 文本 slash 命令分流 → `_claim_turn_or_queue` 认领或排队 → 绑定工具、reasoning、step、delta 与审批回调 → 在线程 executor 的独立 ContextVars copy 中 `_run_agent_turn` → AIAgent.run_conversation → flush 工具事件 → `_finish_turn` 持久与排空队列。

ACP 的 `conn.request_permission` 绑定为工具审批及编辑批准 requester，用户决定由编辑器返回。协议拒绝、工具失败与执行器异常分别有终态；不能凭 prompt RPC 收到 end_turn 判断每个工具成功。压缩轮换 internal ID 后宿主更新状态与 provenance，而客户端 session_id 仍是稳定 handle。[ACP prompt 到执行点](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/acp_adapter/server.py#L810)、[审批与事件绑定](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/acp_adapter/server.py#L907)。

ACP 收尾首先采用本轮返回消息，再保存协议会话。下面节选这段交接，后续展示、用量和排队处理省略：

```python
if "messages" in result and isinstance(result["messages"], list):
    state.history = result["messages"]
    self.session_manager.save_session(session_id)
```

messages=[] 也能表达清空后的历史，代码按 key 存在及类型判断。外部 session_id 用来保存协议状态，内部 AIAgent 的 ID 轮换另发布 provenance 更新。[ACP 返回资料的采用](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/acp_adapter/server.py#L949)。

## 请求中的能力：工具定义与知识资料

registry 记录 handler/schema/toolset/check_fn；get_tool_definitions 过滤并生成模型工具面，handle_function_call 执行 handler。工具执行还会经过宿主 hook、guardrail、checkpoint/审批与中断；可见 schema 不是这些步骤的替代。文件 checkpoint 是回滚资料，不能推出网络副作用恰好一次。

Skills 由 SKILL.md 及元数据组成；prompt builder 构建索引，技能工具按需读取/维护正文。索引缓存按文件签名与平台/app 事实重新判定可见性，不等同把所有技能正文放入 system prompt。ProviderProfile、Transport、平台 adapter、插件 hooks 是独立扩展口，新增一个厂商并不必然要新传输协议。

证据：[工具目录](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/tools/registry.py)、[工具分发](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/model_tools.py)、[Skills 索引](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/prompt_builder.py#L1362)、[协议基类](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/agent/transports/base.py)。

## 委派主线：创建 child，收集结果再交回父

`delegate_task` 先区分 spawn 和 list/steer/stop 控制动作；spawn 受暂停、深度与预算约束，`_build_child_agent` 解析模型/工具面/凭证路由并构造 child，`_run_single_child` 收集 completed/interrupted/failed 与 exit_reason。background 返回 dispatch handle，前台返回结果列表；有摘要仍可能 failed，预算耗尽与普通错误不能同称 truncated。当前 role 参数保留兼容，能力由深度推导，不能把角色名解释为硬路由规则。

子运行得到结构化完成字段后才形成结果 entry。下面节选 _run_single_child 的正常交接，省略心跳、schema 校验和事件通知：

```python
run = _ChildRun(child, parent_agent, task_index, goal, _subagent_id, child_progress_cb, heartbeat=heartbeat)
result, failure_entry, _child_close_deferred = run.await_child()
if failure_entry is not None:
    return failure_entry
# 省略：输出 schema 检查、迟到 steering 合并及进度刷新。
duration = run.elapsed()
entry = _build_result_entry(child, result, task_index, duration, schema)
# 省略：记录共享工作区信息并发布完成事件。
return run.attach_worktree(entry)
```

finally 清理本次 child 的凭证、心跳和相应资源。父调用消费的是完成 entry，模型可据其中事实继续；有文本摘要时仍按结构字段判断 completed/interrupted/failed。[子运行结果收集](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/tools/delegate_tool.py#L337)。

## 定时宿主：认领一次 fire，再运行与交付

cron scheduler 构造一次执行的 Agent，使用 fire claim/heartbeat 与 owner 检查控制归属。在交付等副作用边界使用 owner fence；丢失归属后不能继续把旧 worker 结果覆盖为成功。Gateway 退出时，只有拥有独立 scope 的外部 cron worker 才有对应的重启隔离，不能把“子进程”直接等同能跨服务重启存活。

证据：[委派入口与结果契约](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/tools/delegate_tool.py#L337)、[cron 构造](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/cron/scheduler.py#L2465)、[交付 owner fence](https://github.com/NousResearch/hermes-agent/blob/8bff64d6ed3414a66976bfa8ab72c14b6bca2a6f/cron/scheduler.py#L3001)。cron 的认领、执行和投递有不同控制点，外部平台是否确认收到仍需单独判断。

## 宿主、能力与运行配置

运行配置先选择宿主，再选择模型协议、工具面与扩展。宿主决定会话身份、队列和审批回传，工具与 provider 配置决定能力是否可见、可用；两者在构造 AIAgent 时汇合。CLI/Gateway 的构造路径见 [架构](architecture.md)，会话与压缩的状态边界见 [上下文](context.md)。
