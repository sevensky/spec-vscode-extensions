## ADDED Requirements

### Requirement: Activity 卡片面板

面板 MUST 提供一个可切换的 Activity 面板，以结构化卡片呈现变更的协作全貌：阶段时间线、方案、任务摘要、决策、顾虑、评论聚合、改动文件。空数据的卡片 MUST 隐藏。

#### Scenario: Activity 面板可切换

- **WHEN** 用户点击导航栏的 Activity 按钮
- **THEN** Activity 面板 MUST 显示（替代 markdown 内容区）
- **AND** 再次点击切回 markdown 内容区

#### Scenario: 有数据的卡片渲染

- **WHEN** 某卡片对应的 SpecContext 字段有数据
- **THEN** 该卡片 MUST 渲染展示数据

#### Scenario: 空数据卡片隐藏

- **WHEN** 某卡片对应的字段为空（undefined 或空数组）
- **THEN** 该卡片 MUST NOT 渲染（不显示空壳）
- **AND** PhasesCard 例外：只要有 history 就渲染

### Requirement: 阶段时间线卡片

PhasesCard MUST 从 history 派生各 step 的开始/完成时间，展示阶段时间线，进行态阶段实时高亮计时。

#### Scenario: 派生各阶段时间

- **WHEN** history 含某 step 的 started 与 completed 记录
- **THEN** PhasesCard MUST 显示该 step 的开始时间与耗时
- **AND** 按 step 顺序排列

#### Scenario: 进行态阶段实时计时

- **WHEN** 某 step 有 started 但无 completed，且当前 status 派生为该 step 的进行态
- **THEN** 该阶段 MUST 显示为进行中
- **AND** 显示实时耗时计时（ElapsedTimer）

#### Scenario: 未开始阶段灰显

- **WHEN** 某 step 在 history 中无任何记录
- **THEN** 该阶段 MUST 灰显或不显示耗时

### Requirement: 评论聚合卡片

CommentsCard MUST 按 doc 聚合 reviewComments，并提供每 doc 的 refinement 提交入口。

#### Scenario: 按 doc 聚合评论

- **WHEN** reviewComments 非空
- **THEN** CommentsCard MUST 按 doc 分组展示评论
- **AND** 每组显示评论数

#### Scenario: 每 doc 的 Run refinement 入口

- **WHEN** 某 doc 存在 pending 评论
- **THEN** 该 doc 分组 MUST 显示「Run refinement」入口
- **AND** 点击触发该 doc 的 refinement 提交

## ADDED Requirements（视觉契约，对齐 speckit CSS）

> 完整差距清单见 `docs/spec-viewer-css-gap-audit.md` 第四章。以下为关键验收性需求。

### Requirement: 导航栏与步骤 tabs 视觉对齐

compact-nav、step-tabs（含进行态/锁定/百分比/计时/连接线）视觉 MUST 对齐 speckit `_navigation.css`。

#### Scenario: step-tab 进行态 spinner

- **WHEN** 某步骤处于进行态
- **THEN** 该 tab MUST 显示旋转的 sync 图标（依赖 base-style @keyframes spin）

#### Scenario: step-tab 锁定态

- **WHEN** 某步骤未达（锁定）
- **THEN** 该 tab MUST 灰显且禁用点击

#### Scenario: 步骤连接线

- **WHEN** 渲染步骤导航
- **THEN** 已完成步骤间 MUST 显示填充连接线（对齐 _navigation.css:211-221）

### Requirement: footer 动作栏视觉对齐

footer 动作栏（primary/secondary/enhancement 按钮、禁用态、action toast、undo toast）视觉 MUST 对齐 speckit `_footer.css`。

#### Scenario: 按钮变体

- **WHEN** 渲染 footer 按钮
- **THEN** primary/secondary/enhancement 变体 MUST 有对应视觉（对齐 _footer.css:10-129）
- **AND** 禁用态 MUST 降低不透明度

#### Scenario: action toast 滑入

- **WHEN** 动作执行后显示 toast
- **THEN** MUST 以 slideIn 动画滑入（依赖 base-style @keyframes）

### Requirement: activity 卡片视觉对齐

各卡片（approach/phases/tasks/decisions/concerns/files/comments）的视觉 MUST 对齐 speckit `_activity.css`。

#### Scenario: phases 时间线进行态脉冲

- **WHEN** phases 卡片中某阶段处于进行态
- **THEN** 该阶段 MUST 显示 working-pulse 动画（对齐 _activity.css:159-319，依赖 base-style @keyframes working-pulse）

#### Scenario: status pill 变体配色

- **WHEN** 渲染 status pill
- **THEN** 各状态（completed/implementing/planning/tasking/specifying/archived）MUST 有对应配色（对齐 _activity.css:100-132）

#### Scenario: actor badge

- **WHEN** 渲染 actor badge
- **THEN** 各执行者（extension/cli/ai/user）MUST 有对应标识配色（对齐 _activity.css:325-368）

### Requirement: stale banner 与 modal 视觉对齐

stale banner、refine modal、loading overlay 视觉 MUST 对齐 speckit `_staleness.css`/`_modal.css`。

#### Scenario: stale banner 警示样式

- **WHEN** 文档过期
- **THEN** stale banner MUST 以警示色显示（对齐 _staleness.css:10-41）

#### Scenario: refine modal 模态层

- **WHEN** 打开 refine modal
- **THEN** MUST 显示 backdrop 遮罩 + modalSlideIn 动画（对齐 _modal.css:10-126，依赖 base-style @keyframes modalSlideIn）
