## ADDED Requirements

### Requirement: 命令参数到 change 名的正确解析

当用户从 spec 树点击某变更下的文档节点（proposal / tasks / design / detailed-design / specs / change-spec）触发 `openspec-for-agent.spec.open` 命令时，系统 MUST 从命令参数的相对路径中正确解析出 change 名，无论该路径是否带有 `openspec/` 前缀。

#### Scenario: 路径带 openspec 前缀时正确解析

- **WHEN** 命令收到形如 `openspec/changes/add-auth/proposal.md` 的相对路径
- **THEN** 系统 MUST 解析出 change 名 `add-auth`
- **AND** 打开标题为 `add-auth` 的富面板
- **AND** 面板加载 `openspec/changes/add-auth/` 下的真实文档内容

#### Scenario: 路径不带 openspec 前缀时同样正确解析

- **WHEN** 命令收到形如 `changes/add-auth/tasks.md` 的相对路径
- **THEN** 系统 MUST 解析出 change 名 `add-auth`
- **AND** 打开标题为 `add-auth` 的富面板

#### Scenario: 不再出现误解析为 openspec 的空面板

- **WHEN** 用户双击任意变更下的文档节点
- **THEN** 面板标题 MUST NOT 显示为 `openspec`
- **AND** Proposal / Design / Tasks / Specs 四个文档 MUST NOT 全部显示「缺失」（前提：该变更目录下确实存在对应文档）
