## ADDED Requirements

### Requirement: 顶层 spec 节点点击行为

「Current Specs」分组下的顶层 spec 文档节点（路径形如 `openspec/specs/<name>/spec.md`）与 change 下的文档节点共用 `openspec-for-agent.spec.open` 命令入口。由于顶层 spec 不属于任何 change，系统 MUST 按路径类型分流：change 路径打开 change 面板，非 change 路径以 markdown 编辑器打开该文档。

#### Scenario: 点击顶层 spec 节点以编辑器打开

- **WHEN** 用户点击「Current Specs」分组下的 spec 文档节点
- **AND** 该节点路径形如 `openspec/specs/<name>/spec.md`（不含 `changes/` 段）
- **THEN** 系统 MUST 以 markdown 编辑器打开该 spec.md
- **AND** MUST NOT 打开 change 面板
- **AND** MUST NOT 出现标题为 `openspec`、文档全部缺失的空面板

#### Scenario: 点击 change 下文档节点仍打开面板

- **WHEN** 用户点击某变更下的文档节点（proposal/tasks/design/detailed-design/specs）
- **AND** 该节点路径含 `changes/` 段
- **THEN** 系统 MUST 打开对应变更的 change 面板
- **AND** 行为不受顶层 spec 分流逻辑影响

#### Scenario: 分流依据为路径是否含 changes 段

- **WHEN** `openspec-for-agent.spec.open` 命令收到 `relativePath`
- **THEN** 系统 MUST 用「路径是否匹配 `^(?:openspec\/)?changes\//`」判定走面板还是编辑器
- **AND** 判定逻辑 MUST 与 change 名提取用的 `CHANGES_PREFIX` 正则同源一致
