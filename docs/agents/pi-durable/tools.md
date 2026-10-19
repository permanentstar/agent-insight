---
id: "durable-tools"
title: "Pi Durable：工具发现、嵌套调用与脚本恢复"
subject: "pi-durable"
status: "verified-source"
baselines: ["pi-20261019"]
sources: []
depends_on: ["durable-architecture", "durable-loop", "durable-documents"]
evidence: ["source"]
verified_scope: "静态核验工具集合、pi.tool v2、NestedCallDoc 及 codemode 重放；未运行沙箱、模型或故障实验。"
---

# Pi Durable：工具发现、嵌套调用与脚本恢复

一次 CSV 修复可能需要读取多个文件、归纳结果，再选择修改与验证。每个动作都由模型单独发起时，程序组织比较简单；若模型能写一段脚本完成批量读取和局部计算，就需要继续解释：脚本能调用哪些工具，中断后哪些调用已有结果，脚本本身怎样重建。

![模型直接选择工具或 codemode；工具内部通过 executeTool 创建子 pi.tool，结果写入父任务的 NestedCallDoc；codemode 记录交付日志以重建脚本，最终只把外层结果交回模型。](../../assets/durable-nested-tools.svg)

本章沿四次交接展开：从可用定义得到模型可见集合，将脚本里的调用接到工具内核，将结果交给正确消费者，最后用已有结果重建脚本。外层生成与工具反馈循环沿用[执行章](loop.md)，这里放大一次工具调用内部发生的工作。

## 第一步：区分已启用、模型可见与程序可调用

Registry 装入扩展定义，Conversation 的 `pi.agent` 选择启用项。resolveAgent 再根据工具的 callers、deferred 与 modelTools 配置形成三个消费集合：

| 集合 | 消费者 | 用途 |
|---|---|---|
| agent.tools | 生成请求和模型直接调用 | 本次向模型声明的工具 |
| agent.deferred | tool_search | 可向模型提供、但尚未加载的延迟工具 |
| agent.callable | executeTool 与 codemode | 程序可以发起的嵌套工具 |

`callers: ["model"]` 只供模型直接发起，`["tools"]` 只供工具内部调用，未指定时两种调用都允许。工具出现在集合中说明框架允许这一调用方式；实际资源权限仍由工具和执行环境受理。[集合解析](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/harness/agent.ts#L222)。

延迟工具减少初始请求的声明量。模型调用 tool_search 后，工具按名称、说明和参数元数据检索，返回 `control.addTools`；工具轮次收口时更新 `pi.agent.modelTools.add`，下一请求才看到新增 schema。这个选择保存在该会话，压缩历史不会自动卸载已加载的工具。[发现工具实现](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/tool-search/tool-search.ts#L57)。

## 第二步：让一次嵌套调用成为独立工作

假设应用注册了 replay=safe 的 `collect_sources` 工具，准备批量读取两个文件。下面是教学调用方式，省略定义与错误分支：

```ts
const implementation = await api.executeTool("read", {
  path: "src/export.ts",
}, context, { key: "implementation" });
const tests = await api.executeTool("read", {
  path: "test/export.test.ts",
}, context, { key: "tests" });
```

executeTool 创建自己的 `pi.tool` 子任务，owner 指向 collect_sources 的 Task，并在调用者的 task scope 下建立 `NestedCallDoc(key)`。同一事务还把子调用加入 `pi.live.nestedTools`，界面因此能看到局部层次。[嵌套调用接纳](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/harness/tool.ts#L725)。

子调用仍走参数准备、校验、beforeTool、执行意图与 replay 检查；hooks 可以从 call.parent 得知上层调用。若 collect_sources 中途重跑，相同 key、名称和参数会找回此前的子任务；参数不同则报错。没有显式 key 时按调用位置编号，因此程序改动调用顺序也会影响重放契约。

子任务尚未完成时，executeTool 等待它；已完成时读取保存的结果。普通工具函数在 await 期间仍有 invocation，这一点与提交 `status=waiting` 后结束阶段的自定义 Task 不同。工具函数恢复时从函数开头重新执行，依靠 key 重接子调用。[执行与结果读取](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/harness/tool.ts#L388)。

## 第三步：把结果交给模型或程序

模型直接发起的工具调用需要一条 tool-result Entry，下一次生成据此作决定。嵌套调用则把结果写到父任务的 NestedCallDoc，由外层工具或脚本消费；它不会为每个内部动作自动追加模型历史。

| 返回字段 | 消费者与含义 |
|---|---|
| output | 交给模型的文本或图片列表；替代旧接口的 content |
| structuredOutput | 程序消费的结果；声明 schema 时由内核校验 |
| details / diagnostics | 展示资料与具名诊断 |
| isError / durationMs / usage | 动作结果、尝试耗时与用量 |

没有 structuredOutputSchema 时，嵌套调用把有界 output 转成程序值：单段文本是字符串，单图是图片对象，多段是列表。声明 schema 的工具需要按契约提供结果；调用者同时检查 isError。NestedToolExecutionResult 不把模型专用 output 再作为另一份返回值。[结构化结果处理](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/harness/tool.ts#L534)。

父调用收口前取消自己留下的未完成嵌套工作，保存外层结果，并清理下属展示槽。task scope 的结果文档随父任务终态退休；子任务仍保留小型终态回执。这样可重用的中间结果存在于需要它的生命周期内。[两类结果的提交](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/harness/tool.ts#L635)。

## 第四步：用交付日志重建 codemode 脚本

codemode 是安装到 Registry 的扩展，模型提交 JavaScript，QuickJS 沙箱运行它。脚本可以通过 `tools.*` 组合已允许的工具，并使用 searchTools、模型辅助接口及 store/load。宿主需要提供沙箱和执行环境；安装了 Durable 库并不会自动启用这些能力。[扩展构造](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/codemode/codemode.ts#L231)。

脚本的 JS 栈在进程内，重启后不能直接取回。实现先保存启动资料，包括源码相关的启动数据、时钟、种子、工具清单和沙箱指纹，再对每次交给 VM 的结果记日志。下一次运行从相同启动资料开始，将已有结果按原交付顺序送回 VM；嵌套工具按 `c<VM call id>` 重接已有任务，追上日志后才接收新的结果。[重放契约及执行入口](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/src/codemode/codemode.ts#L1)。

| 保存资料 | 解决的问题 |
|---|---|
| CodemodeRunDoc，task scope | 用哪份启动数据重建；是否已经决定最终结果 |
| CodemodeJournalDoc，task scope | 哪个调用的结果在什么时刻交给 VM，处理后又发出了多少调用 |
| NestedCallDoc，父工具 task scope | 各个工具调用对应谁、已有结果是什么 |
| CodemodeStoreDoc，conversation scope | 脚本通过 store 保存的资料；按 fork 点复制 |

例如脚本并行读两个文件，先收到测试文件，再收到实现文件。恢复重放保留这个交付顺序，即使新进程更早读到了另一份已存结果，也不能任意交换它们。调用计数与参数检查用于发现偏离；版本、沙箱指纹、期限或执行轨迹不相容时，以错误结果停止当前脚本，而非静默执行新路径。

它提供的是有条件的脚本重建和工具结果复用。工具的外部副作用仍受自身 replay 契约约束；任务自己的普通 await、持久 sleeping 和 VM 日志重放是三个层次。批量程序还增加日志提交成本，不能仅凭减少模型轮次推定总体更快。

## 把组合方式放回模型执行模式

默认生成仍是根据观察选择动作的反馈循环。codemode 把一轮中的局部串并行安排交给程序；Plan Mode 示例以扩展限制工具并保存计划；应用还可以用自定义 Task 定义 Planner、Executor 与检查步骤。三者可以组合，分别改变动作表达、产品权限或决策分工。[只读计划示例](https://github.com/earendil-works/pi/blob/2ec55d808d455b1a64a2bf7888198207a096120a/packages/durable/test/examples/27-plan-mode.ts)。

回到 CSV 案例，模型负责决定需要批量读取哪些资料，脚本组织读取，嵌套 Task 保存具体工作，最后外层结果成为下一请求的观察。读者应能据此解释：两个读取已经完成，为什么收集工具和用户 Submission 仍可能未结束；答案分别由父任务的收口和外层运行决定。
