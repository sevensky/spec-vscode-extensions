## ADDED Requirements

### Requirement: 富 spec 面板展示变更全貌

系统 MUST 提供一个 Webview 面板，当用户在 spec 树中点击某变更时，展示该变更的文档内容、当前 step、status 及动作历史，而非仅打开单个 markdown 文件。

#### Scenario: 点击变更打开富面板

- **WHEN** 用户在 spec 树点击一个变更节点
- **THEN** 系统打开一个 Webview 面板，展示该变更的 proposal/design/tasks 文档内容
- **AND** 面板内显示当前 step 与 status
- **AND** 不再仅以 markdown 编辑器打开单个文件

#### Scenario: 面板按变更目录分组多开

- **WHEN** 用户已打开变更 A 的面板，再点击变更 B
- **THEN** 系统为变更 B 打开独立面板
- **AND** 变更 A 的面板保持打开
- **AND** 同一变更的子文档（design/specs）复用同一面板

#### Scenario: 文件变化触发面板刷新

- **WHEN** 变更目录下的文档或 `.spec-context.json` 发生变化
- **THEN** 该变更的面板 MUST 自动刷新展示最新内容与状态
- **AND** 刷新不关闭面板、不丢失面板内未保存的滚动位置

### Requirement: 面板按钮由状态驱动

面板内的流程动作按钮（如标记完成、归档、重新激活）MUST 根据变更当前 status 决定可见性与可用性。

#### Scenario: active 状态显示推进按钮

- **WHEN** 变更 status 为 active 且存在未完成任务
- **THEN** 面板显示"标记完成"按钮
- **AND** 显示"归档"按钮

#### Scenario: completed/archived 状态显示重新激活

- **WHEN** 变更 status 为 completed 或 archived
- **THEN** 面板显示"重新激活"按钮
- **AND** 不显示"标记完成"按钮
