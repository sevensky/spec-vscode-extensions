## ADDED Requirements

### Requirement: 变更状态桥梁文件

系统 MUST 为每个变更维护一个 `.spec-context.json` 文件，记录该变更的 step、status 与动作历史，作为面板刷新与 provider 编排的状态单一来源。

#### Scenario: 状态文件结构与位置

- **WHEN** 系统需要读写某变更的运行时状态
- **THEN** 状态文件位于 `openspec/changes/<变更名>/.spec-context.json`
- **AND** 文件包含 `step`（当前阶段）、`status`（active/completed/archived）、`history`（动作记录数组）、`agent`（当前 agent）
- **AND** 该文件与 openspec CLI 的 `.openspec.yaml`（元数据）并存，职责不重叠

#### Scenario: 扩展动作乐观更新状态

- **WHEN** 用户在面板或树触发一个流程动作（如"开始 plan"）
- **THEN** 系统 MUST 立即将该变更的 step 更新为对应阶段、status 设为 started
- **AND** 此乐观更新不等待 agent 执行完成

### Requirement: agent 经 preamble 更新状态

系统 MUST 在发送给 agent 的指令前注入 preamble，指示 agent 在完成步骤后更新 `.spec-context.json`。

#### Scenario: preamble 内容

- **WHEN** 系统经 provider 向 agent 终端发送流程指令
- **THEN** 指令前 MUST 包含 preamble，明确告知 agent：当前为哪个变更执行哪个动作、完成后应将 step/status 更新为何值、仅更新该变更的状态文件

#### Scenario: agent 完成后状态推进

- **WHEN** agent 听从 preamble 在完成后更新了 `.spec-context.json`
- **THEN** 系统的文件监听 MUST 检测到变化并刷新面板状态

### Requirement: 文件兜底校验状态

当 agent 未更新 `.spec-context.json` 时，系统 MUST 通过 openspec 工件文件的变化兜底校验并修正 step。

#### Scenario: 工件生成推断 step

- **WHEN** 某 step 处于 started 超过阈值时间且 `.spec-context.json` 未被 agent 推进
- **AND** 该变更目录下出现了对应工件（如 plan.md 生成）
- **THEN** 系统 MUST 据此修正 step，并刷新面板
- **AND** 该兜底校验仅在 started 超时后触发，不实时运行
