## Context

当前面板用 `marked` 渲染 markdown 为纯 HTML，无行级锚定，无法内联交互。speckit 的 `editor/` 模块基于手写 line-based renderer（每块 `wrapWithLineActions` 包裹 `data-line` + 评论按钮 + 插槽），实现 checkbox toggle / 文本编辑 / 评论 / refinement。

本变更是四个差距变更中最大者，需新建 webview `editor/` 模块（~6 文件）+ `markdown/renderer.ts`（行级渲染器）+ 2 个 React 组件 + extension 侧 5 个消息分支 + SpecContext 扩展。

SpecContext 已在 `upgrade-spec-context-status-machine` 升级为精细状态机，本变更为其新增 `reviewComments` 字段。

## speckit 源码锚点（实现依据）

本变更的实现跟随 speckit-companion（路径 `/www/wwwroot/vscode-extensions/speckit-companion`），关键逻辑的原始位置：

| 关注点 | speckit 位置 | 要点 |
|--------|-------------|------|
| 行包裹渲染 | `webview/src/spec-viewer/markdown/renderer.ts:78 wrapWithLineActions` | 每块 `<div class="line" data-line>` + 评论按钮 + 插槽 |
| + 按钮 hover 显隐 | `webview/styles/spec-viewer/_line-actions.css:74-122` | `.line-add-btn{opacity:0}` + `.line:hover .line-add-btn{opacity:1}`（非 display:none），`right:0` 定位 |
| sourceLineNum | `webview/src/spec-viewer/markdown/renderer.ts:181` | `const sourceLineNum = i + 1`（i 为原始行索引） |
| frontmatter 剥离 | `webview/src/spec-viewer/markdown/preprocessors.ts:116 stripFrontmatter` | `replace` 删除——**注意行号偏移**，见 Risks |
| editLine handler | `src/features/spec-viewer/messageHandlers.ts:591 handleEditLine` | `currentDoc.filePath` 开源文件 + `line.range` 替换，不硬编码路径 |
| toggleCheckbox handler | `src/features/spec-viewer/messageHandlers.ts` handleToggleCheckbox | 同上，基于源文件行 |
| 双击文本编辑 | `webview/src/spec-viewer/editor/inlineEditor.ts:101 showInlineEdit` | speckit 判定为 **legacy**（`_line-actions.css:174` "kept for compatibility"），主推评论 showInlineEditor |
| 评论持久化 | `.spec-context.json` 的 `reviewComments`（`src/core/types/specContext.ts` ReviewComment） | anchor 含 heading/blockText/line |
| 评论重锚 | `webview/src/spec-viewer/editor/restoreComments.ts` | best-effort：行号/heading/blockText 匹配 |
| refinement | `src/features/spec-viewer/messageHandlers.ts dispatchDocRefinement` | 构建直接编辑 prompt + executeInTerminal + 标记 applied |

## CSS 差距（本变更归属）

完整 94 项 CSS 差距盘点见 `docs/spec-viewer-css-gap-audit.md`。本变更负责其中 **17 项**（第二章，#20-36）：

- ✅ 齐全 1 项：#34 自定义 checkbox
- ⚠️ 残缺 7 项：#20 .line 包裹、#21 .line-add-btn、#23 .line-comment-slot、#26 inline editor 卡片、#29 inline comment 卡片、#30 refine 按钮、#32-33 task 列表/项
- ❌ 缺失 9 项：#22 li.line 变体、#24 legacy line-actions、#25 状态隐藏、#27 context action、#28 editor 主按钮、#31 section progress、#35 task details、#36 in-progress badge

**类名对齐**（本变更负责）：#26 `.inline-editor-textarea`→`.editor-textarea`、#29 `.comment-remove`→`.comment-delete`、#30 `.refine-btn`→`.refine-submit-btn`。同步更新 editor/index.ts、restoreComments.ts、refinements.ts 产出的类名。

**前置依赖**：`rich-spec-viewer-base-style`（token + 动画库 fadeIn 等）。

## Goals / Non-Goals

**Goals:**
- 行级 markdown 渲染：每块可锚定（data-line + 评论按钮 + 插槽）。
- checkbox toggle：改 tasks.md 源文件，乐观更新进度。
- 文本内联编辑：双击行内容变 input，Enter 提交 WorkspaceEdit。
- 评论系统：add/remove 持久化到 .spec-context.json，文档切换后重锚。
- refinement：批量提交当前文档评论到 agent，标记 applied。

**Non-Goals:**
- 不做代码高亮/mermaid（md-enhance 变更）。
- 不做表格行级评论（scenario-table 行评论留后续，首期只做块级）。
- 不做行删除（speckit 的 remove-line 也是转成评论，非真删——首期不做删除交互，只做编辑+评论）。
- 行级渲染器首期只支持：段落、无序列表项、task 项、h2/h3 标题、blockquote。表格/代码块/嵌套列表留 md-enhance。

## Decisions

### 决策 1：自建轻量行级 renderer，不用 marked 的 walkTokens

**选择**：新建 `markdown/renderer.ts`，逐行解析 markdown 生成带 `data-line` 的 HTML（参考 speckit 的 line-based renderer），而非用 marked 渲染后后处理加 data-line。

**理由**：marked 输出无法可靠映射回源行号（AST 不保留行号）；行级交互强依赖 lineNum 准确性。speckit 也是自建 renderer 正因此。首期只支持基础块，控制复杂度。

**被否决**：
- *marked + 后处理正则加 data-line*：行号映射不可靠，task/列表项边界难定。
- *直接移植 speckit renderer 全量*：上千行含表格/mermaid/场景解析，远超本期。

### 决策 2：评论持久化到 SpecContext.reviewComments（对齐 speckit）

**选择**：SpecContext 新增：
```ts
interface ReviewCommentAnchor { heading: string | null; blockText: string; line: number; }
interface ReviewComment { id: string; doc: string; anchor: ReviewCommentAnchor; comment: string; status: 'pending'|'applied'; createdAt: string; }
// SpecContext.reviewComments: ReviewComment[]
```
写入经 SpecContextManager（串行，防并发）。

**理由**：评论需跨 tab 关闭/重开存活，且可批量提交。存 .spec-context.json 与 history 同源，对齐 speckit。anchor 含 blockText/heading 用于源文件漂移后重锚。

### 决策 3：checkbox/文本编辑改源文件，评论存 context 文件

**选择**：
- toggleCheckbox / editLine → `WorkspaceEdit` 改 `tasks.md`/`proposal.md` 等源文件 + save（不碰 .spec-context.json）
- addComment / removeComment → 改 .spec-context.json 的 reviewComments

**理由**：对齐 speckit。文档内容属于源文件，评论属于评审状态。两者分离避免相互覆盖。

### 决策 4：refinement 复用 sendPromptToChat，构建直接编辑 prompt

**选择**：`runDocRefinement` handler 收集当前 doc 的 pending 评论 → 构建prompt（明确"直接编辑该文档应用以下评论，不要重新生成模板"）→ `sendPromptToChat` → 评论标记 applied。

**理由**：复用既有 agent 桥接，不新引入终端派发。prompt 约束"直接编辑"避免 agent 重写整个文档。

### 决策 5：评论重锚用 best-effort（heading + blockText 匹配）

**选择**：restoreComments 顺序尝试：(1) 存储 line 的内容仍匹配 → 用原 line；(2) heading 下首个匹配 blockText 的块；(3) 失败则评论仍显示但不锚定行。

**理由**：源文件可能被 agent 编辑导致行漂移，精确重锚不可能，best-effort 足够。

## Risks / Trade-offs

- **[风险] 行级 renderer 对复杂 markdown 锚定不准** → 首期只支持基础块，Unsupported 块降级为普通段落包裹；md-enhance 变更再完善。
- **[风险] WorkspaceEdit 与 agent 并发改同一文件** → 编辑操作是用户手动触发，与 agent 写入时间窗小；toggle/edit 各自独立 save，不做批量事务。
- **[风险] reviewComments 并发写** → SpecContextManager 加串行队列（Promise chain），评论操作排队执行。
- **[取舍] 不做 scenario-table 行评论** → 减少首期复杂度，场景表格评论留后续。
- **[取舍] refinement 标记 applied 不等 agent 真完成** → fire-and-forget，对齐 speckit；若 agent 未应用，用户可手动改。
