## Why

当前面板的 ActivityTimeline 只是 history 条目的单列列表（step/status/agent/时间），信息密度低。speckit 的 ActivityPanel 用 7 张结构化卡片（Approach 方案/Phases 阶段时间线/Tasks 任务摘要/Decisions 决策/Concerns 顾虑/Comments 评论聚合/Files 改动文件）呈现协作全貌，且 Phases 卡能展示各阶段耗时、进行态高亮——这依赖刚升级的精细状态机。

现在做：把 ActivityTimeline 升级为卡片化 ActivityPanel，并扩展 SpecContext 承载 approach/decisions/concerns/filesModified 等结构化字段。

## What Changes

### 1. SpecContext 扩展结构化字段

新增可选字段（向后兼容，旧文件按空处理）：
- `approach?: string` — 方案摘要文本
- `decisions?: string[]` — 决策要点
- `concerns?: Array<{ text: string; task?: string }>` — 顾虑 + 关联 task
- `filesModified?: string[]` — 改动文件列表
- `taskSummaries?: Array<{ id: string; status: string; did?: string; files?: string[] }>` — 任务摘要

### 2. ActivityPanel 卡片化（替换 ActivityTimeline）

按 speckit 顺序渲染卡片：
- **PhasesCard**（核心）— 阶段时间线，从 history 派生各 step 的 startedAt/completedAt，显示耗时、进行态高亮
- **ApproachCard** — approach 文本 + 状态
- **TasksCard** — taskSummaries 列表（id/status/did/files）
- **DecisionsCard** — decisions 要点
- **ConcernsCard** — concerns + 关联 task chip
- **CommentsCard** — reviewComments 按 doc 聚合（每 doc 一个 Run refinement 入口，衔接 inline-edit）
- **FilesCard** — filesModified 列表（可点击 openFile）

### 3. step 进行态可视化（消费精细状态机）

PhasesCard 利用 `upgrade-spec-context-status-machine` 的精细状态：进行态 step 显示 spinner + ElapsedTimer（实时计时），完成态显示耗时，未开始灰显。

## Capabilities

### New Capabilities

- `spec-viewer-activity`: 结构化 Activity 卡片面板——阶段时间线、方案、任务摘要、决策、顾虑、评论聚合、改动文件。

### Modified Capabilities

- `spec-context`: 新增 approach/decisions/concerns/filesModified/taskSummaries 结构化字段。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `webview-ui/src/features/spec-viewer/components/ActivityPanel.tsx`（新建，替换 ActivityTimeline） | 卡片容器 + 空态 |
| `webview-ui/src/features/spec-viewer/components/cards/`（新建） | PhasesCard/ApproachCard/TasksCard/DecisionsCard/ConcernsCard/CommentsCard/FilesCard |
| `webview-ui/src/features/spec-viewer/components/ElapsedTimer.tsx`（新建） | 实时耗时计时 |
| `webview-ui/src/features/spec-viewer/timelineEvents.ts`（新建） | 从 history 派生 step 时间线 |
| `webview-ui/src/features/spec-viewer/index.tsx` | 用 ActivityPanel 替换 ActivityTimeline；加 Activity 切换按钮 |
| `webview-ui/src/features/spec-viewer/types.ts` | ViewerPayload 加 approach/decisions 等字段；HistoryEntry 派生时间线类型 |
| `src/types/spec-context.types.ts` | SpecContext 加结构化字段 |
| `src/providers/spec-viewer-provider.ts` | buildPayload 输出新字段 |

### 兼容性

- 新字段全部可选，旧 .spec-context.json 无这些字段时卡片显示空态/隐藏。
- CommentsCard 复用 inline-edit 的 reviewComments（依赖该变更已合并）。
- ActivityPanel 替换 ActivityTimeline，既有 history 展示能力不丢失（PhasesCard 含时间线）。

### 风险

- SpecContext 字段膨胀 → 全部可选 + 默认空，读取容错。
- 时间线派生逻辑复杂（去重/推断完成时间）→ 参考 speckit 的 stepHistoryDerivation，首期简化（只处理 started→completed 配对，不做去重）。
- 卡片数据多为 agent 填充 → 首期字段为空时整张卡片隐藏，不显示空壳。
