## ADDED Requirements

### Requirement: 点击树节点触发富面板

当用户在 spec 树点击某变更时，系统 MUST 打开富 spec 面板展示变更全貌，而非仅打开单个 markdown 文件。

#### Scenario: 点击变更打开面板

- **WHEN** 用户点击 spec 树中的变更节点
- **THEN** 系统触发 spec-viewer-panel 能力打开富面板
- **AND** 不再以 markdown 编辑器直接打开文件

#### Scenario: 右键保留打开源文件

- **WHEN** 用户右键变更节点选择"打开源文件"
- **THEN** 系统 MUST 以 markdown 编辑器打开对应的源文件
- **AND** 此入口与富面板并存，满足直接编辑文件的需求
