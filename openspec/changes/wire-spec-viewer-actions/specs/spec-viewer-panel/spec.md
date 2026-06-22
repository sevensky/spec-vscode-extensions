## MODIFIED Requirements

### Requirement: 富 spec 面板展示变更全貌

系统 MUST 提供一个基于 webview-ui React 应用的 WebviewPanel，当用户在 spec 树中点击某变更时，展示该变更的文档内容、当前 step、status 及动作历史。面板 MUST 由结构化的 React 组件渲染（标题区、步骤导航、markdown 内容、动作栏、时间线），而非纯 HTML 字符串拼接。

#### Scenario: 点击变更打开 React 面板

- **WHEN** 用户在 spec 树点击一个变更节点（或其下文档节点）
- **THEN** 系统打开 `spec-viewer` 页的 WebviewPanel
- **AND** 面板由 `webview-ui/src/features/spec-viewer/` 的 React 组件渲染
- **AND** 面板内展示该变更的 proposal/design/tasks/specs 文档内容（存在的文档显示内容，不存在的标注「缺失」）
- **AND** 面板内显示当前 step 与 status
- **AND** 不再以 markdown 编辑器打开单个文件

#### Scenario: 面板按变更目录分组多开

- **WHEN** 用户已打开变更 A 的面板，再点击变更 B
- **THEN** 系统为变更 B 打开独立面板
- **AND** 变更 A 的面板保持打开
- **AND** 同一变更的子文档复用同一面板

#### Scenario: 文件变化触发面板刷新

- **WHEN** 变更目录下的文档或 `.spec-context.json` 发生变化
- **THEN** 该变更的面板 MUST 通过 postMessage 收到更新后的完整状态
- **AND** React 组件重新渲染展示最新内容与状态
- **AND** 刷新不关闭面板

### Requirement: 步骤导航切换文档

面板 MUST 提供步骤导航（step tabs），展示该变更下的文档类型（Proposal / Design / Tasks / Specs），用户点击 tab MUST 切换显示对应文档内容。

#### Scenario: 点击 step tab 切换文档

- **WHEN** 用户点击某个文档 tab（如 Tasks）
- **THEN** webview MUST 发送 `{command:'switchDoc', docType:'tasks'}`
- **AND** extension 侧更新 currentDoc 并回推该文档内容
- **AND** 面板内容区渲染 Tasks 文档

#### Scenario: 不存在的文档 tab 标注缺失

- **WHEN** 某文档类型在变更目录下不存在
- **THEN** 该 tab MUST 可见但标注「缺失」状态
- **AND** 切换到该 tab 时内容区显示「该文档暂未创建」

#### Scenario: 当前 tab 高亮

- **WHEN** 面板展示某文档
- **THEN** 对应的 step tab MUST 以高亮/活动态呈现
- **AND** 其余 tab 呈非活动态

### Requirement: 面板按钮由状态驱动并执行真实动作

面板内的流程动作按钮 MUST 根据 `.spec-context.json` 的 status 决定可见性，且点击后 MUST 通过 `{command:'footerAction', id}` 统一消息触发 extension 侧执行真实状态变更或归档，而非弹出 alert。动作执行后面板 MUST 自动刷新。

#### Scenario: active 状态显示推进按钮

- **WHEN** 变更 status 为 active
- **THEN** 面板 footer 显示「标记完成」按钮（primary）
- **AND** 显示「归档」按钮

#### Scenario: completed/archived 状态显示重新激活

- **WHEN** 变更 status 为 completed 或 archived
- **THEN** 面板 footer 显示「重新激活」按钮（primary）
- **AND** 不显示「标记完成」与「归档」按钮

#### Scenario: 点击「标记完成」写入 completed 并刷新

- **WHEN** 变更 status 为 active
- **AND** 用户点击「标记完成」
- **THEN** webview 发送 `{command:'footerAction', id:'complete'}`
- **AND** extension 侧调用 `SpecContextManager.setStatus(changeName, 'completed')`
- **AND** 面板收到新状态后 footer 切换为「重新激活」

#### Scenario: 点击「归档」需二次确认

- **WHEN** 用户点击「归档」
- **THEN** webview 发送 `{command:'footerAction', id:'archive'}`
- **AND** extension 侧弹出模态二次确认（包含变更名）
- **AND** 用户确认后触发 `openspec-for-agent.spec.archiveChange` 命令
- **AND** 将 status 置为 archived
- **AND** 面板刷新
- **AND** 用户取消时不执行任何变更

#### Scenario: 点击「重新激活」写回 active 并刷新

- **WHEN** 变更 status 为 completed 或 archived
- **AND** 用户点击「重新激活」
- **THEN** webview 发送 `{command:'footerAction', id:'reactivate'}`
- **AND** extension 侧调用 `SpecContextManager.setStatus(changeName, 'active')`
- **AND** 面板收到新状态后 footer 切换为「标记完成」+「归档」

#### Scenario: 按钮不再以 alert 占位

- **WHEN** 用户点击任意流程动作按钮
- **THEN** 系统 MUST NOT 弹出 `alert` 提示
- **AND** MUST 执行上述对应的状态变更或归档动作

### Requirement: 面板展示动作历史时间线

面板 MUST 提供一个时间线区域，展示 `.spec-context.json` 的 `history[]` 记录，每条显示 step、status、agent 与时间。

#### Scenario: 有历史时列出条目

- **WHEN** 变更的 history 非空
- **THEN** 时间线按时间顺序列出每条记录
- **AND** 每条显示 step、status、agent、时间

#### Scenario: 无历史时显示占位

- **WHEN** 变更的 history 为空
- **THEN** 时间线区域显示「暂无」

## ADDED Requirements

### Requirement: 面板动作通过 webview 消息桥接执行

面板动作位于 webview-ui 的 React 应用内，无法直接调用扩展 API，因此 MUST 通过 webview ↔ extension 的 `postMessage` 通道桥接执行。消息协议 MUST 遵循固定契约。

#### Scenario: 已知命令被派发

- **WHEN** webview 发送 `{command:'switchDoc'|'footerAction'|'ready'|'refreshContent', ...}`
- **THEN** extension 侧 MUST 按命令类型执行对应处理
- **AND** 动作类命令完成后推送更新后的状态

#### Scenario: 未知命令被忽略

- **WHEN** webview 发送的 `command` 不在已知集合内
- **THEN** extension 侧 MUST 忽略该消息
- **AND** 不修改任何状态

#### Scenario: changeName 由面板实例绑定而非消息携带

- **WHEN** 动作消息被处理
- **THEN** extension 侧 MUST 使用该面板创建时绑定的 changeName
- **AND** MUST NOT 信任消息体中携带的 changeName 字段

### Requirement: 文档内容以 markdown 渲染

面板内容区 MUST 将文档的 markdown 内容渲染为 HTML 展示，而非纯文本预格式化。

#### Scenario: markdown 文档渲染为 HTML

- **WHEN** 当前文档存在且有内容
- **THEN** 内容区 MUST 将 markdown 渲染为 HTML（标题、列表、代码块、表格等基础语法）
- **AND** 渲染样式对齐 VS Code 主题（使用 CSS 变量）

#### Scenario: 文档不存在时显示占位

- **WHEN** 当前文档不存在
- **THEN** 内容区显示「该文档暂未创建」占位说明
