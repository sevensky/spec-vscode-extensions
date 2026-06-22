## Why

当前 `SpecStatus` 是粗粒度三态（active/completed/archived），无法表达「正在 design」「tasks 已完成待 apply」等进行态。这直接导致面板的 step tab 无法显示进行态（spinner/进度），Activity 时间线无法呈现各阶段耗时，是后续 `rich-spec-viewer-inline-edit`（task 完成度联动）和 `rich-spec-viewer-activity-cards`（阶段时间线）的前置依赖。

精细状态**不能照搬 speckit 的 specify/plan 名字**——speckit 的状态名从 spec-kit 的 workflow 步骤派生，而我们背后是 openspec 规范，步骤是 propose/design/specs/tasks/apply/archive。状态名必须从 openspec 的步骤派生，保持语义一致（面板显示"designing"时对应的就是 openspec 的 design 阶段）。

现在做：把 `SpecStatus` 从 3 态扩展为从 `SpecStep` 派生的精细状态机，并对齐 openspec 步骤命名。

## What Changes

### 1. 扩展 SpecStatus 为精细状态机

从 openspec 的 SpecStep 派生（每个 step 有进行态 + 完成态）：

| step | 进行态 | 完成态 |
|------|--------|--------|
| propose | proposing | proposed |
| design | designing | designed |
| specs | specifying | specified |
| tasks | tasking | tasked |
| apply | applying | applied |
| — | — | completed / archived（终态） |

新增 `draft` 初始态（新建变更未开始任何 step 时）。

### 2. status 改为派生字段（从 history 推算）

现状：`status` 是独立存储字段，与 `history` 可能不一致。改为：`status` 由 `history` 的最后一条记录 + 当前 step 派生，写入时由 manager 自动计算，调用方不再直接 `setStatus("designing")`，而是 `markStarted("design")` / `markCompleted("design")`，manager 推算出 designing/designed。

对齐 speckit 的 `specContextWriter` 模式：start→进行态、complete→完成态，status 是派生结果。

### 3. 向后兼容

- 既有 `.spec-context.json`（粗粒度 active/completed/archived）读取时归一化：active → 由 history 推算（无 history 则 draft）；completed/archived 保留。
- `SpecContextManager.setStatus` 保留但语义收窄为只接受终态（completed/archived），进行态由 markStarted/markCompleted 驱动。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities

- `spec-context`: SpecStatus 从 3 态扩展为 ~13 态精细状态机，status 改为 history 派生字段，新增归一化逻辑兼容旧数据。
- `spec-viewer-panel`: 面板消费精细状态——step tab 显示进行态/完成态/进度，footer 可见性逻辑从粗粒度改为精细（如 proposed→显示「开始 design」推进按钮）。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `src/types/spec-context.types.ts` | SpecStatus 扩展；新增 STEP_TO_INPROGRESS / STEP_TO_COMPLETED 映射常量；SpecHistoryEntry.status 可能扩展 |
| `src/features/spec-context/spec-context-manager.ts` | setStatus 语义收窄；新增 deriveStatus(history)；read 增加归一化；markStarted/markCompleted 自动推算 status |
| `src/providers/spec-viewer-provider.ts` | computeFooter 按精细状态重算（进行态显示推进、完成态显示下一步/完成） |
| `webview-ui/src/features/spec-viewer/` | NavigationBar/StepTab 显示进行态；FooterActions 适配新 catalog |
| `openspec/specs/spec-context/spec.md` | 更新状态机需求 |

### 兼容性

- 既有 `.spec-context.json` 自动归一化，无需迁移脚本。
- `SpecContextManager` 公开 API（read/setStatus/markStarted/markCompleted/appendCompleted）签名尽量不变，status 成为只读派生属性。

### 风险

- status 从存储改为派生是语义变更 → 加归一化 + 单测覆盖所有迁移路径。
- footer 可见性逻辑变复杂（13 态 vs 3 态）→ 在 design 明确状态→按钮映射表。
