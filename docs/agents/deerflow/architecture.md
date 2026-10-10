---
id: "deerflow-migrated"
title: "DeerFlow：接入、装配、图执行与状态归属"
subject: "deerflow"
status: "verified-source"
baselines: ["deerflow-20261009"]
sources: ["deerflow-runtime", "deerflow-middleware", "deerflow-prompt", "deerflow-harness"]
depends_on: []
evidence: ["source", "historical-document"]
verified_scope: "两条入口的图生命周期、装配、worker 执行、prompt 与代表工具门禁已静态核验；完整扩展链和多 worker 故障未运行验证。"
---

# DeerFlow：接入、装配、图执行与状态归属

DeerFlow 是带 Gateway、嵌入式 Client 与产品策略的 Agent 系统。它使用 LangChain 构造图、LangGraph 执行图。Gateway 的 run、持久 thread 和进程内 graph 实例分别归不同层；理解这三个身份后，再看 middleware 和 prompt 才不会把一条请求读成多个独立 Agent。

![DeerFlow 的 Gateway 与 Client 汇入产品装配层，create_agent 编译图，LangGraph 执行并分别绑定 checkpoint 与事件存储](../../assets/deerflow.svg)

## 概念、所有权与实例范围

| 概念 | 所属层与职责 | owner / 生命周期 | 持久边界 |
|---|---|---|---|
| Gateway / run | HTTP 接入及一份执行请求 | RunManager 准入、取消、租约与终态 | RunStore 保存 run 状态 |
| thread | 会话状态的寻址身份 | 同一 thread 可接收多个 run | checkpoint 按 thread_id / namespace 保存 |
| LeadAgentAssembly / graph | 产品模型、工具、prompt 与 hook 组合 | assemble_lead_agent 创建 | 图是代码和实例，不是会话历史 |
| DeerFlowClient | 进程内 SDK 门面 | 调用方创建；配置 key 一致则复用 _agent | 通过注入的 checkpointer 延续状态 |
| middleware | 在 agent/model/tool 阶段改变行为 | 产品工厂实例化，和所属图一起复用 | 实例成员不能一概视作 thread 私有状态 |
| ThreadState | 业务消息和可恢复字段 | 节点及 middleware 返回更新 | full/delta channel 模式分开 |
| Runtime.context | 本次调用的用户、run、能力与环境 | worker/Client 注入 | 不能自动当成 checkpoint 字段 |
| event store / thread store | 流重放资料 / 会话元信息 | 平台存储层 | 与图 checkpoint、工具效果不同 |

依据：[产品装配](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/agents/lead_agent/agent.py#L845)、[Client 缓存](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/client.py#L329)、[RunManager](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/manager.py#L930)。

## 构造与一次请求

Gateway worker 取得执行所有权后，组合 RunContext 与 Runtime，调用 agent_factory 构图并绑定存储，随后 astream。Client 不通过 Gateway：_ensure_agent 根据包含用户存储身份等因素的 key 复用或重建图；同步 stream 直接调用图的 stream。两条入口都会用产品 build_middlewares，但不能把“Gateway 每 run 一个实例”推广成所有调用都这样。

| 当前位置 | 上层 → 下层 | 状态与结果 |
|---|---|---|
| run 接纳 | Gateway → RunManager → worker.run_agent | try_start 失败不开始模型；取消已有单独路径 |
| 产品装配 | agent_factory → assemble_lead_agent | 解析模型、授权工具、skills、system prompt、middleware、state schema |
| 构图 | create_agent | 输出 compiled graph；此时尚未请求模型 |
| 图执行 | worker → agent.astream | 多种 stream_mode 分别传消息增量、更新、值和自定义事件 |
| 具体效果 | model 节点 / tools 节点 | provider 与工具 handler 执行，middleware 可拦截 |
| run 收口 | worker → RunManager | set_status_if_not_cancelled 避免正常终态覆盖已接受取消 |

证据：[worker 执行与收口](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/runtime/runs/worker.py#L891)、[create_agent 装配点](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/agents/lead_agent/agent.py#L1391)、[Client 图调用](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/client.py#L955)。流发布与 checkpoint 写入、外部效果完成分别判断；SSE metadata 中的 run/thread ID 本身不能证明业务成功。

## Prompt、工具与扩展的层次

产品 `apply_prompt_template` 负责 system prompt 的基底，包含角色、SOUL、skills、子 Agent 等按配置组合的内容。DynamicContext 等 middleware 再按生命周期加入记忆、时间或请求事实；DurableContext 用可恢复业务状态生成当次请求内容。因此“某段文本由 middleware 注入”不等于“该 middleware 拥有整个 system prompt”。

Tool 是动作，Skill 是任务知识及策略，MCP 是发现和调用外部工具的协议，subagent 是另一份执行拓扑。SkillToolPolicy 同时过滤模型 tools 并在 wrap_tool_call 再判断，阻断时不调用 handler；只隐藏 schema 不能替代执行门禁。依据：[prompt 基底](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/agents/lead_agent/prompt.py#L1135)、[Skill 门禁](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/packages/harness/deerflow/agents/middlewares/skill_tool_policy_middleware.py#L484)。完整有序链见[中间件专题](middleware.md)。

## 状态与故障

| 状态 / 事件 | 当前路径与归属 | 边界 |
|---|---|---|
| run 未获得执行权 | try_start → 具名结果 | 不构造“已经运行”的结论 |
| 图实例重建 | 工厂重新组合代码和资源 | checkpoint thread 不随图实例消失 |
| 用户取消 / worker 失去所有权 | abort 与 ownership_lost 控制收口 | 不能由停止读 SSE 推定取消成功 |
| graph state 保存 | checkpointer 与 channel 模式 | 不包含任意外部 shell/API 的事务回滚 |
| 客户端重连 | 事件流可用于展示 | 显示恢复与执行恢复是不同能力 |
| 正常结束与取消竞争 | set_status_if_not_cancelled | 完整跨 worker 租约/故障矩阵仍待专章核验 |

本基线 backend/uv.lock 锁定 LangChain 1.3.14、LangGraph 1.2.9、langgraph-checkpoint 4.2.0。两个框架的本书分册分析的是各自独立主干；不能拿它们的最新 hook/DeltaChannel 细节直接充当此应用锁定依赖的执行证明。依据：[依赖锁](https://github.com/bytedance/deer-flow/blob/b842e06be19f04280a9e5e12f90da04d0c6f09a5/backend/uv.lock)。

## 旧文归并与取舍

四份原稿分别提供运行主线、middleware 顺序、prompt 作用域与 Harness 学习路线。本章把共同架构归一；专题保留有作用域差异的 hook 和 prompt，而原稿的学习日程、示例插件建议仅作为历史材料，不执行其中命令。Gateway 提供执行准入与交付治理，嵌入式 Client 减少 HTTP 层；复用图时，维护者需检查 middleware 成员是否跨调用共享，不以统一工厂掩盖实例范围差异。
