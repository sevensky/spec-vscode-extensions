## Context

ActivityTimeline 当前是 history 条目的扁平列表。speckit 的 ActivityPanel 用结构化卡片呈现协作全貌，PhasesCard 从 history 派生各阶段耗时并进行态高亮——后者依赖 `upgrade-spec-context-status-machine` 已落地的精细状态机（history 含 started/completed + step）。

SpecContext 目前只有 step/status/history/agent/(reviewComments 待 inline-edit)。卡片需要 approach/decisions/concerns/filesModified/taskSummaries 等字段，这些由 agent 在协作过程中填入（经 preamble 提示或手动）。

## CSS 差距（本变更归属）

完整 94 项 CSS 差距盘点见 `docs/spec-viewer-css-gap-audit.md`。本变更负责其中 **28 项**（第四章，#61-88），**全部缺失**：

- 导航：#61 compact-nav、#62 step-tabs（hover/current/in-flight/locked）、#63 百分比、#64 计时、#65 stale 标记、#66 连接线、#67 step children 轨道
- footer：#68 动作栏、#69 action toast、#70 undo toast、#71 状态隐藏按钮
- activity 卡片：#72 容器+empty、#73 card chrome、#74 approach、#75 status pill、#76 checkpoint/pr、#77 phases 时间线、#78 actor badge、#79 tasks、#80 decisions/concerns、#81 files、#82 toggle 按钮、#83 comments card
- 其他：#84-85 stale banner/badge、#86 refine modal、#87 loading overlay、#88 install banner

**类名对齐**（本变更负责）：全部新建类名直接采用 speckit 命名（`.step-tabs`/`.activity-card`/`.phases-track`/`.task-row` 等），避免后期再改。

**card/button 原语**：决策复用 shadcn `<Card>`/`<Button>`（见 base-style 决策 3/4），不移植 speckit `.card`/`button.primary` 类；speckit `_activity.css` 的卡片内布局类（`.activity-card`/`__title`/`__body`）作为 shadcn Card 内部结构样式移植。

**前置依赖**：`rich-spec-viewer-base-style`（token + 动画库 working-pulse/spec-badge-working/spin + reset）+ `rich-spec-viewer-inline-edit`（reviewComments 数据源）。

## Goals / Non-Goals

**Goals:**
- SpecContext 扩展 5 个结构化字段（全部可选）。
- ActivityPanel 卡片化（7 张卡片，空数据隐藏）。
- PhasesCard 从 history 派生阶段时间线 + 进行态可视化（消费精细状态）。
- Activity 面板可切换（导航栏按钮 toggle，替代默认 markdown 视图）。

**Non-Goals:**
- 不做 agent 自动填充这些字段的 preamble 提示（那是 agent 协作规范的职责，本变更只做展示）。
- 不做卡片的内联编辑（卡片是只读摘要，编辑在文档区）。
- 不做 PhasesCard 的去重/复杂 idle-gap 计算（首期简单 started→completed 配对）。

## Decisions

### 决策 1：时间线派生用简单 started/completed 配对

**选择**：timelineEvents.ts 遍历 history，对每个 step 取首条 started 为 startedAt、首条后续 completed 为 completedAt；进行态（有 started 无 completed，且 status 派生为进行态）显示 ElapsedTimer 实时计时。

**理由**：speckit 的 stepHistoryDerivation 含去重/idle-gap 上限等复杂逻辑（~250 行），首期过度。简单配对覆盖主要场景，复杂派生留后续。

**被否决**：*照搬 speckit 全量派生*：复杂度高，且 idle-gap 5min 上限等是为终端任务追踪设计，openspec 无终端追踪，不适用。

### 决策 2：空数据卡片整张隐藏

**选择**：每张卡片有数据则渲染，无数据（字段 undefined/空数组）则不渲染（非显示空壳）。PhasesCard 例外——只要有 history 就渲染（时间线是核心）。

**理由**：避免一堆空卡片占位降低信息密度。agent 未填充时面板简洁。

### 决策 3：Activity 面板切换（toggle，非替换 markdown）

**选择**：导航栏加 Activity 按钮，点击 toggle ActivityPanel 显示（隐藏 markdown 内容区 + TOC），再点切回 markdown。对齐 speckit 的 activityVisible 模式。

**理由**：卡片信息量大，常驻会挤压文档区；toggle 让用户按需查看。

### 决策 4：CommentsCard 复用 inline-edit 的 reviewComments

**选择**：CommentsCard 按 doc 聚合 reviewComments，每 doc 显示评论数 + 「Run refinement」入口（发 runDocRefinement，衔接 inline-edit）。

**理由**：评论数据已在 inline-edit 持久化到 SpecContext，CommentsCard 是其聚合视图，不重复存储。

## Risks / Trade-offs

- **[风险] 时间线派生不准（重复 started）** → 首期取首条 started + 首条 completed，重复条目忽略；文档注明限制。
- **[风险] SpecContext 字段膨胀影响读写** → 全部可选 + read 时缺失默认空，JSON 体积小幅增加可接受。
- **[取舍] 不做 idle-gap 计算** → 阶段耗时可能含空闲等待（如 agent 思考），略偏大，但首期够用。
- **[依赖] 需 inline-edit 的 reviewComments + 状态机已合并** → apply 顺序：状态机 → inline-edit → 本变更。
