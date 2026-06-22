## Why

当前富面板的文档内容是**纯只读**——task 复选框不能勾、文本不能改、不能加评论。面板只能"看"，不能"做"，用户想推进 tasks 完成度还得切回编辑器手改 markdown。这使面板退化为展示器，而非 speckit 那样的工作台。

参考 speckit-companion 的 `editor/` 模块：每行可锚定、行首 `+` 加评论、文本内联编辑、checkbox toggle、refinement 批量提交到 agent。我们要全仿这套交互，让面板成为 spec 协作的主工作面。

现在做：实现内联编辑（checkbox + 文本）+ 评论系统（add/remove + 持久化）+ refinement（批量提交评论到 agent）。这是四个差距变更里收益最大、复杂度最高的一个。

## What Changes

### 1. 行级 markdown 渲染（替换 marked 基础渲染）

- markdown 渲染需为每个可寻址块（段落/列表项/标题/blockquote/task）包裹 `data-line="N"` + 行首评论按钮 + 评论插槽，供内联交互锚定。
- 首期不实现 mermaid/代码高亮（那是 `rich-spec-viewer-md-enhance` 的职责），但行级包裹是内联编辑的前置——两个变更在此有交叉，本变更只做行级包裹的**最小实现**（段落/列表项/task/标题），md-enhance 变更再补渲染质量。

### 2. checkbox toggle（task 完成度联动）

- webview: checkbox change → `{command:'toggleCheckbox', lineNum, checked}`
- extension: 用 `WorkspaceEdit.replace` 把该行 `[ ]`↔`[x]` 替换 + `document.save()`（改 tasks.md 源文件，非 .spec-context.json）
- 乐观更新：webview 本地立即更新进度百分比，extension 下次 state 推送对账

### 3. 文本内联编辑

- 行内容双击 → 变成 `<input>`，Enter 提交（仅值变化时）→ `{command:'editLine', lineNum, newText}`
- extension: `WorkspaceEdit.replace` 该行 + save
- Esc/blur 取消

### 4. 评论系统（add/remove + 持久化）

- 行首 `+` 按钮 → 弹出 InlineEditor（textarea）→ 提交 `{command:'addComment', id, doc, lineNum, lineContent, comment}`
- 评论持久化到 `.spec-context.json` 的 `reviewComments` 字段（SpecContext 扩展）
- 删除评论 → `{command:'removeComment', id}`
- 文档切换/刷新后，评论重新锚定到对应行（restoreComments）

### 5. refinement（批量提交评论到 agent）

- footer 动态出现「✨ Refine (N)」按钮（N=当前文档待处理评论数）
- 点击 → `{command:'runDocRefinement', doc}` → extension 构建直接编辑 prompt（禁止模板重生成）→ `sendPromptToChat` → 标记评论 applied

## Capabilities

### New Capabilities

- `spec-viewer-inline-edit`: 面板内联编辑能力——checkbox toggle、文本编辑、评论系统、refinement 提交。

### Modified Capabilities

- `spec-viewer-panel`: markdown 渲染从基础 marked 升级为行级包裹渲染（每块带 data-line + 评论按钮 + 插槽）。
- `spec-context`: 新增 `reviewComments` 字段持久化评论。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `webview-ui/src/features/spec-viewer/editor/`（新建） | currentDoc / lineActions / inlineEditor / refinements / restoreComments / index |
| `webview-ui/src/features/spec-viewer/markdown/renderer.ts`（新建） | 行级 markdown 渲染器（最小：段落/列表/task/标题 + 行包裹） |
| `webview-ui/src/features/spec-viewer/components/InlineEditor.tsx`（新建） | 评论/编辑输入框组件 |
| `webview-ui/src/features/spec-viewer/components/InlineComment.tsx`（新建） | 单条评论展示 |
| `webview-ui/src/features/spec-viewer/components/MarkdownContent.tsx` | 改用 renderer.ts，接入 editor 模块 |
| `webview-ui/src/features/spec-viewer/types.ts` | OutboundMessage 加 toggleCheckbox/editLine/addComment/removeComment/runDocRefinement；InboundMessage 评论数据 |
| `src/providers/spec-viewer-provider.ts` | onDidReceiveMessage 加 5 个新命令分支；buildState 读取 reviewComments |
| `src/types/spec-context.types.ts` | SpecContext 加 reviewComments 字段 + ReviewComment 类型 |

### 兼容性

- tasks.md/proposal.md 等源文件由 WorkspaceEdit 直接修改（与 speckit 一致），不引入新中间格式。
- reviewComments 存 .spec-context.json，旧文件无此字段时按空数组处理。
- 不破坏既有 footerAction/switchDoc 消息。

### 风险

- 行级渲染器是重资产 → 首期只支持基础块，复杂 markdown（表格/嵌套）可能锚定不准，留 md-enhance 变更完善。
- WorkspaceEdit 并发写同一文件可能冲突 → 评论写入用串行队列（对齐 speckit 的 CommentMutationQueue）。
- refinement 派发到 agent 是 fire-and-forget → applied 标记在派发后立即写，不等 agent 完成。
