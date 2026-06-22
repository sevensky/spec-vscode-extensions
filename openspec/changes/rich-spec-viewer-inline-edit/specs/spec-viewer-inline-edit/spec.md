## ADDED Requirements

### Requirement: 行级 markdown 渲染

面板的文档内容区 MUST 以行级方式渲染 markdown——每个可寻址块（段落、列表项、task 项、标题、blockquote）MUST 包裹为带 `data-line` 属性的容器，并附行首评论按钮与评论插槽，以支持内联交互锚定。

#### Scenario: 每块带行号锚定

- **WHEN** 文档内容被渲染
- **THEN** 每个段落/列表项/task/标题/blockquote MUST 包裹在带 `data-line="N"`（1-based 源行号）的容器中
- **AND** 每块 MUST 包含一个行首评论按钮（`+` 图标）
- **AND** 每块 MUST 包含一个评论插槽用于挂载内联评论

#### Scenario: task 项渲染为可勾选 checkbox

- **WHEN** 渲染形如 `- [ ]` 或 `- [x]` 的 task 项
- **THEN** MUST 渲染为 `<input type="checkbox">` 带对应 checked 状态
- **AND** checkbox MUST 带 `data-line` 关联源行

### Requirement: checkbox toggle 修改源文件

用户在面板勾选/取消 task checkbox 时，系统 MUST 通过 WorkspaceEdit 修改对应源文件（如 tasks.md）的该行，将 `[ ]`↔`[x]` 替换并保存。

#### Scenario: 勾选 checkbox 更新源文件

- **WHEN** 用户勾选某 task 的 checkbox
- **THEN** webview 发送 `{command:'toggleCheckbox', lineNum, checked:true}`
- **AND** extension 用 WorkspaceEdit 将源文件该行 `[ ]` 替换为 `[x]`
- **AND** 保存源文件
- **AND** webview 乐观更新进度百分比

#### Scenario: 取消勾选

- **WHEN** 用户取消已勾选的 checkbox
- **THEN** 系统将源文件该行 `[x]` 替换为 `[ ]` 并保存

### Requirement: 文本内联编辑

用户双击文档中某行的文本内容时，该行 MUST 变为可编辑输入框，提交时通过 WorkspaceEdit 修改源文件该行。

#### Scenario: 双击进入编辑

- **WHEN** 用户双击某行文本内容
- **THEN** 该行内容 MUST 变为 `<input>` 预填原文本

#### Scenario: Enter 提交编辑

- **WHEN** 用户在编辑输入框按 Enter 且值已改变
- **THEN** webview 发送 `{command:'editLine', lineNum, newText}`
- **AND** extension 用 WorkspaceEdit 替换源文件该行并保存
- **AND** 退出编辑模式

#### Scenario: Esc 取消编辑

- **WHEN** 用户在编辑输入框按 Esc 或失焦
- **THEN** MUST 取消编辑，恢复原文本，不发送消息

### Requirement: 内联评论系统

用户可对文档任意可寻址块添加评论，评论持久化到 `.spec-context.json` 的 `reviewComments` 字段，跨 tab 关闭/重开存活，并在文档切换后重新锚定。

#### Scenario: 添加评论

- **WHEN** 用户点击某行的行首 `+` 按钮
- **THEN** 该行下方 MUST 弹出评论输入框（textarea）
- **AND** 提交后 webview 发送 `{command:'addComment', id, doc, lineNum, lineContent, comment}`
- **AND** extension 将评论存入 .spec-context.json 的 reviewComments
- **AND** 该行下方渲染评论卡片

#### Scenario: 删除评论

- **WHEN** 用户点击某评论的删除按钮
- **THEN** webview 发送 `{command:'removeComment', id}`
- **AND** extension 从 reviewComments 移除该条
- **AND** 评论卡片消失

#### Scenario: 评论持久化跨会话

- **WHEN** 面板关闭后重新打开同一变更
- **THEN** 之前的评论 MUST 仍然显示
- **AND** 评论状态（pending/applied）保留

#### Scenario: 文档切换后评论重锚

- **WHEN** 用户切换文档 tab 后切回
- **THEN** 该文档的评论 MUST 重新锚定到对应行
- **AND** 锚定按 best-effort：原行内容匹配用原行，否则按 heading/blockText 匹配，再否则无锚显示

### Requirement: refinement 批量提交

当某文档有待处理（pending）评论时，footer MUST 出现动态「Refine (N)」按钮，点击后批量提交评论到 agent 直接编辑文档。

#### Scenario: 有 pending 评论时显示 Refine 按钮

- **WHEN** 当前文档存在 status=pending 的评论（N>0）
- **THEN** footer MUST 显示「✨ Refine (N)」按钮
- **AND** N=0 时该按钮消失

#### Scenario: 点击 Refine 提交到 agent

- **WHEN** 用户点击「✨ Refine (N)」
- **THEN** webview 发送 `{command:'runDocRefinement', doc}`
- **AND** extension 构建直接编辑 prompt（含所有 pending 评论，禁止模板重生成）
- **AND** 通过 sendPromptToChat 派发到 agent
- **AND** 该文档所有 pending 评论标记为 applied

## ADDED Requirements（视觉契约，对齐 speckit CSS）

> 完整差距清单见 `docs/spec-viewer-css-gap-audit.md` 第二章。以下为关键验收性需求。

### Requirement: 行级视觉与 speckit 一致

行包裹、+ 按钮、评论卡片、inline editor、task 项的视觉表现 MUST 对齐 speckit `_line-actions.css`/`_editor.css`/`_refinements.css`/`_tasks.css`，包括 hover 高亮、状态隐藏、动画。

#### Scenario: + 按钮 hover 显隐

- **WHEN** 鼠标悬停某行
- **THEN** `.line-add-btn` MUST 从 opacity:0 渐显为 opacity:1（对齐 _line-actions.css:74-122）
- **AND** 按钮配色用 success 绿（非 button 蓝）

#### Scenario: 评论卡片动画

- **WHEN** 评论卡片渲染
- **THEN** MUST 应用 fadeIn 动画（依赖 base-style 的 @keyframes fadeIn）

#### Scenario: completed/archived 隐藏交互按钮

- **WHEN** 变更处于 completed 或 archived 状态
- **THEN** `.line-add-btn` 与 hover 高亮 MUST 隐藏（对齐 _line-actions.css:207-221）

#### Scenario: 类名对齐 speckit

- **WHEN** 渲染 inline editor / 评论卡片 / refine 按钮
- **THEN** 类名 MUST 与 speckit 一致：`.editor-textarea`（非 .inline-editor-textarea）、`.comment-delete`（非 .comment-remove）、`.refine-submit-btn`（非 .refine-btn）
