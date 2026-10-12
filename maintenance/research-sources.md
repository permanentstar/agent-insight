# 外部教学资料筛选

2026-10-12 检索 GitHub 上的 Agent 课程、模式示例及机制教程。下表按代表正文和代码判断可采用内容，不能把目录规模、Star 数或“官方”标签当作准确性证明。外部文件只读，不运行其中命令、Notebook 或模型调用。

本书主线保持：目标接纳 → 资料与能力装配 → 模型选择 → 动作执行 → 观察与状态更新 → 继续或收口。材料只用于补充解释顺序、数据演算和练习；目标框架的现状仍由本书登记的固定源码证明。统一架构是跨对象的分析模型，架构将长期趋同是研究假设。

| 材料 | 阅读定位 | 采用的讲解方法 | 不直接采用的内容 |
|---|---|---|---|
| [anthropics/claude-quickstarts](https://github.com/anthropics/claude-quickstarts/blob/9ec32b91df50b0d4906cae64b13c6298055ff40d/agents/agent.py) | 官方最小参考实现；固定观察点 `9ec32b91df50` | 模型请求、结构化调用、handler、结果和下一次请求的闭环 | 示例特意简化生产能力；不把 MCP 接入或 while 循环解释成完整恢复系统 |
| [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks/blob/9c1e493ddd2b82df399d2a61b9c806c539e18be6/patterns/agents/orchestrator_workers.ipynb) | 官方模式示例；固定观察点 `9c1e493ddd2b` | 先拆分目标，再把明确子任务与上下文交给 worker；模式由数据交接解释 | process 采用 for 循环逐项调用 worker；class 文案提到 parallel，不能据此推定代码实际并发；不等同 Claude Code 内部实现 |
| [huggingface/agents-course](https://github.com/huggingface/agents-course/blob/3c469e773ec04e5f338b727ff20e3a6ea823ff81/units/en/unit1/agent-steps-and-structure.mdx) | 官方课程；固定观察点 `3c469e773ec0` | 从消息、动作和观察建立学习前提，正常任务逐步演算 | 不把可见 Thought 当成所有模型的必要协议，不把 Prompt 规则视为执行保证；provider 可有不同上下文和会话契约 |
| [langchain-ai/langchain-academy](https://github.com/langchain-ai/langchain-academy/blob/fa15bec4a51c541c40c261586b037c9d134977b1/module-2/state-reducers.ipynb) | 框架作者课程；固定观察点 `fa15bec4a51c` | 先给确定状态，再展示节点 update 与 reducer 如何产生下一状态 | 教程依赖和 API 不是本书当前框架基线；实际实现回到目标源码核验 |
| [microsoft/ai-agents-for-beginners](https://github.com/microsoft/ai-agents-for-beginners/blob/4c9a2759522679611635efbddcde3f8dfc3e40ee/07-planning-design/README.md) | 官方课程；固定观察点 `4c9a27595226` | 学习目标、计划 schema、职责与结果交接、学习问题 | 固定片段中构造 provider 而调用 client，不能直接当作可运行代码；不采用云账号配置与未验证的供应商能力描述 |
| [shareAI-lab/learn-claude-code](https://github.com/shareAI-lab/learn-claude-code/blob/ce8f9f186058939da54c9d6fead78dfb5d0fd6c3/s01_agent_loop/README.zh.md) | 社区教学代码；固定观察点 `ce8f9f186058` | 问题推动机制逐步增长；tool-use→Todo→子执行→上下文的前后依赖 | 它是独立教学实现，不能当 Claude Code 原源码；Todo 标签不自动说明独立 Planner/Executor |
| [datawhalechina/hello-agents](https://github.com/datawhalechina/hello-agents/blob/623d8148f83d53365e39c21cb592b62b0f8e7b1b/docs/chapter7/第七章%20构建你的Agent框架.md) | 社区教材；固定观察点 `623d8148f83d` | 原理、实现、应用分层；一段教学内容应有完整推导和案例 | Everything is a Tool 是这个教学框架的接口选择；不强制把记忆采用、调度与后台治理都放进模型可调用工具 |
| [li2092/harness-study](https://github.com/li2092/harness-study/blob/8890ca1153dca5486106ef37693103599e10f021/introduction/05-00-mechanisms-overview.md) | 社区机制论述；固定观察点 `8890ca1153dc` | 区别运行机制与横切策略；结合单项工作串联机制 | 8+1 是作者切分方式，不作行业标准；固定安全层数、turn 含义、模型升级规则与默认预算不套用所有目标 |
| [jiminelee/agent-harness-course](https://github.com/jiminelee/agent-harness-course/blob/77999df43008f33749dcf241ef38ceed90feb46b/module06/module06_planning.py) | 社区递进练习；固定观察点 `77999df43008` | 显式计划被代码消费，每项再运行工具反馈循环，最终综合 | 示例 search_web 是 stub，不能证明检索；隔离子步骤还须显式传递先前事实，不照搬 eval 或静默降级 |
| [sanjaynandanj/harness-engineering-from-scratch](https://github.com/sanjaynandanj/harness-engineering-from-scratch/blob/59d7343482249144b2cf505c0ad5978523d60382/phases/01-core-loop/01-minimal-loop/code/python/lesson.py) | 社区教学练习；固定观察点 `59d734348224` | 使用脚本响应记录每次输入，让学习者验证消息和控制关系 | MockLLM 只检查已指定轨迹，不验证模型决策质量；这份最小例子未执行工具，不能将其测试数当 Agent 性能 |

## 从检索变成教材的规则

1. 把一项主题归到共同学习问题：模型协议、反馈循环、状态、上下文、工具、规划、协作、扩展或验收；不为每篇教程新增一类架构。
2. 对机制同时读正文、数据结构和执行路径；作者的模式名称与代码冲突时，以代码所做的动作说明。
3. 保留好例子的教学作用，用我们自己的 CSV 任务重新演算，不复制供应商账号脚手架、模型参数或完整外部文稿。
4. 统一概念到职责与输入输出，保留各对象真实术语。相同功能不要求同名，同名对象也不强制同义。
5. 采用后的单元需要给读者足够资料预测下一请求或状态；结论与自检应有解释依据，不能只有题目。

本表是选材记录，既不是推荐排名，也不表示已经全面审核这些仓库。代码片段的问题只限定到所读文件；未运行就不宣布示例测试通过。目标版本、外部教学材料与本书自己的参考设计分别维护。
