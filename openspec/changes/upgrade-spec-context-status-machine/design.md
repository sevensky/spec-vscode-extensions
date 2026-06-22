## Context

当前状态模型：
- `SpecStep` = propose/design/specs/tasks/apply/archive（对齐 openspec，正确）
- `SpecStatus` = active/completed/archived（粗粒度，无法表达进行态）
- `SpecHistoryEntry.status` = started/completed（step 级子状态）
- `status` 是 `.spec-context.json` 的独立存储字段，与 history 可能不一致

参考 speckit 的 `specContextWriter`：status 是从 history + currentStep 派生的只读字段，调用方通过 `startStep`/`completeStep` 驱动，writer 自动推算 status（specify→specifying/specified）。这个派生模式正确，但**状态名要换成 openspec 的步骤派生**，不能照搬 specify/planning。

## Goals / Non-Goals

**Goals:**
- SpecStatus 扩展为从 SpecStep 派生的精细状态（进行态 + 完成态 + 终态）。
- status 成为 history 的派生字段（写入时由 manager 推算）。
- 旧 `.spec-context.json`（粗粒度）自动归一化。
- 面板 footer 与 step tab 消费精细状态。

**Non-Goals:**
- 不改 SpecStep 本身（propose/design/specs/tasks/apply/archive 不变）。
- 不引入 speckit 的 clarify/analyze 子步骤（openspec 无此概念）。
- 不做 status 的 UI 选择器（状态由动作驱动，不让用户手选）。
- 不在本变更实现 step tab 的 spinner/进度可视化（那是 `rich-spec-viewer-activity-cards` 的事），本变更只把状态数据备好。

## Decisions

### 决策 1：状态名从 SpecStep 派生，命名规则 = step + ing/ed

**选择**：

```ts
export const STEP_TO_INPROGRESS: Record<SpecStep, SpecStatus> = {
  propose: "proposing", design: "designing", specs: "specifying",
  tasks: "tasking", apply: "applying", archive: "archiving",
};
export const STEP_TO_COMPLETED: Record<SpecStep, SpecStatus> = {
  propose: "proposed", design: "designed", specs: "specified",
  tasks: "tasked", apply: "applied", archive: "archived",
};
```

加上 `draft`（初始）和 `completed`（全部 step 完成后的用户确认终态）。

**理由**：命名直接从 step 词形变化，语义自明；与 openspec 步骤一一对应，面板显示"designing"时用户立刻知道是 design 阶段进行中。

**被否决**：
- *照搬 speckit 的 specifying/planning/tasking*：和 openspec 的 propose/design/tasks 步骤名对不上，语义割裂。
- *用 step 名本身当 status（如 status="design"）*：无法区分进行态/完成态。

### 决策 2：status 改为派生字段，由 deriveStatus(history, step) 计算

**选择**：`SpecContextManager` 内部新增 `deriveStatus`：
1. 无 history → `draft`
2. 取 history 最后一条：status=started → `STEP_TO_INPROGRESS[entry.step]`；status=completed → `STEP_TO_COMPLETED[entry.step]`
3. 若显式标记终态（completed/archived，通过 setStatus 写入一个 sentinel history entry 或独立字段）→ 返回终态

`write` 时自动调用 deriveStatus 填充 status 字段，调用方传的 status 被覆盖（status 成为只读派生属性）。

**理由**：单一来源（history），杜绝 status 与 history 不一致；对齐 speckit 的 writer 模式。

**终态处理**：completed/archived 无法从 step 派生（它们是用户决策，不是某 step 的完成）。用独立字段 `terminalStatus?: 'completed' | 'archived'`，deriveStatus 优先返回它。这样 history 仍记录所有 step 事件，终态单独标记。

### 决策 3：setStatus 语义收窄 + 旧数据归一化

**选择**：
- `setStatus(changeName, 'completed'|'archived')` → 写 `terminalStatus` 字段。
- `setStatus` 不再接受进行态/完成态（那些由 markStarted/markCompleted 驱动）。
- `read` 时归一化：旧 `status: 'active'` → 忽略，由 history 派生（无 history 则 draft）；旧 `status: 'completed'|'archived'` → 迁移到 `terminalStatus`。

**理由**：收窄 API 防止调用方直接写进行态绕过 history；归一化让旧数据无痛升级。

### 决策 4：footer catalog 按精细状态重算

**选择**：computeFooter 按派生 status 分组：

| status | footer 按钮 |
|--------|------------|
| draft / proposing / designing / specifying / tasking | [推进到下一步]、[归档] |
| proposed / designed / specified / tasked | [推进到下一步]、[标记完成]、[归档] |
| applying | [归档] |
| applied | [标记完成]、[归档] |
| completed / archived | [重新激活] |

「推进到下一步」= markCompleted(当前step) + markStarted(下一step)，label 动态显示下一 step 名（对齐 speckit 的 approve 按钮重命名）。

**理由**：进行态/完成态都需要能推进，但只有完成态允许「标记完成」（表示全部 step 走完，用户确认收尾）。

## Risks / Trade-offs

- **[风险] 派生逻辑错误导致 status 错乱** → 为 deriveStatus 写单测覆盖：空 history、started 尾、completed 尾、terminalStatus 存在、旧数据归一化 5 条路径。
- **[风险] 旧数据 active 状态丢失进行态信息** → 旧数据本就没有进行态（粗粒度），归一化为 draft 或由 history 推算，信息无损。
- **[取舍] terminalStatus 独立字段打破「纯派生」纯粹性** → 但 completed/archived 语义上不是某 step 的完成，无法从 step 派生，独立字段是必要妥协（speckit 也是显式 setStatus 设这两个）。
- **[取舍] footer 逻辑变复杂** → 用映射表（status→按钮组）集中管理，不散落 if-else。
