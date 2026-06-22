## ADDED Requirements

### Requirement: 精细状态机从 SpecStep 派生

SpecStatus MUST 从 SpecStep 派生精细状态，每个 step 对应一个进行态（step+ing）和一个完成态（step+ed），外加 draft 初始态与 completed/archived 终态。状态名 MUST 与 openspec 的 SpecStep 语义对应，不得使用 spec-kit 的 specify/plan 命名。

#### Scenario: 派生映射完整

- **WHEN** 系统定义 SpecStep 到 SpecStatus 的映射
- **THEN** 进行态映射 MUST 为：propose→proposing, design→designing, specs→specifying, tasks→tasking, apply→applying, archive→archiving
- **AND** 完成态映射 MUST 为：propose→proposed, design→designed, specs→specified, tasks→tasked, apply→applied, archive→archived

#### Scenario: 完整状态词汇表

- **WHEN** 列举所有合法 SpecStatus
- **THEN** MUST 包含：draft、proposing、proposed、designing、designed、specifying、specified、tasking、tasked、applying、applied、completed、archived
- **AND** MUST NOT 包含 spec-kit 的 specifying-only/planning/tasking/implementing 等与 openspec 步骤无关的名称

### Requirement: status 由 history 派生

SpecContext 的 status 字段 MUST 是 history 的派生结果，而非独立可写字段。写入时由 SpecContextManager 自动计算，调用方 MUST NOT 直接指定进行态/完成态的 status。

#### Scenario: 无 history 时为 draft

- **WHEN** history 为空且无 terminalStatus
- **THEN** 派生 status MUST 为 draft

#### Scenario: 最后一条 history 为 started 时为进行态

- **WHEN** history 最后一条记录的 status 为 started，step 为 design
- **THEN** 派生 status MUST 为 designing

#### Scenario: 最后一条 history 为 completed 时为完成态

- **WHEN** history 最后一条记录的 status 为 completed，step 为 tasks
- **THEN** 派生 status MUST 为 tasked

#### Scenario: terminalStatus 优先于 history 派生

- **WHEN** terminalStatus 字段为 completed 或 archived
- **THEN** 派生 status MUST 为该终态
- **AND** 忽略 history 派生结果

#### Scenario: 调用方不能直接写进行态 status

- **WHEN** 调用 `setStatus(changeName, 'designing')`
- **THEN** 系统 MUST 拒绝（进行态/完成态由 markStarted/markCompleted 驱动）
- **AND** 仅接受 'completed' 或 'archived' 终态

### Requirement: 旧数据归一化

读取既有 `.spec-context.json`（粗粒态 active/completed/archived）时 MUST 归一化为新状态机，无需迁移脚本。

#### Scenario: 旧 active 归一化

- **WHEN** 读取到旧 `status: 'active'` 且无 terminalStatus
- **THEN** 系统 MUST 忽略该 active 值
- **AND** 由 history 派生新 status（无 history 则 draft）

#### Scenario: 旧 completed/archived 迁移到 terminalStatus

- **WHEN** 读取到旧 `status: 'completed'` 或 `status: 'archived'`
- **THEN** 系统 MUST 将其迁移到 terminalStatus 字段
- **AND** 派生 status 返回该终态
- **AND** 下次写入时落盘为新格式

## ADDED Requirements (spec-viewer-panel)

### Requirement: footer 按精细状态驱动

面板 footer 动作按钮 MUST 按派生的精细 status 分组显示，不同状态组显示不同的推进/收尾按钮。

#### Scenario: 进行态显示推进按钮

- **WHEN** status 为 proposing/designing/specifying/tasking（进行态）
- **THEN** footer MUST 显示「推进到下一步」按钮（label 动态为下一 step 名）
- **AND** 显示「归档」按钮
- **AND** MUST NOT 显示「标记完成」

#### Scenario: 完成态显示推进与收尾

- **WHEN** status 为 proposed/designed/specified/tasked（完成态，非终态）
- **THEN** footer MUST 显示「推进到下一步」「标记完成」「归档」按钮

#### Scenario: 终态显示重新激活

- **WHEN** status 为 completed 或 archived
- **THEN** footer MUST 仅显示「重新激活」按钮

#### Scenario: 推进按钮 label 动态显示下一 step

- **WHEN** 当前 status 为 proposed（propose 完成）
- **THEN** 推进按钮 label MUST 为「开始 design」或等价的下一 step 名
- **AND** 点击后 markCompleted(当前) + markStarted(下一)
