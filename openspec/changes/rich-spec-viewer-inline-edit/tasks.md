## 1. 行级 markdown 渲染器

- [x] 1.1 新建 `webview-ui/src/features/spec-viewer/markdown/renderer.ts`：逐行解析，支持段落/无序列表/task/h2/h3/blockquote，每块用 `wrapWithLineActions` 包裹（data-line + 评论按钮 + 插槽）
- [x] 1.2 task 项渲染为 checkbox（`<input type="checkbox" data-line>`，checked 状态对应 `[x]`）
- [x] 1.3 `MarkdownContent.tsx` 改用 renderer.ts（替换 marked），接入后保留 `.spec-md` 作用域样式

## 2. editor 模块（行交互核心）

- [x] 2.1 新建 `editor/currentDoc.ts`：从 navState 取当前 docType（别名 propose→proposal）
- [x] 2.2 新建 `editor/lineActions.ts`：行类型检测（task/section/paragraph）+ 行点击委托（`+` 按钮 → showInlineEditor）
- [x] 2.3 新建 `editor/inlineEditor.ts`：showInlineEdit（双击行内容变 input，Enter 提交 editLine，Esc 取消）+ 行点击委托监听
- [x] 2.4 新建 `editor/refinements.ts`：addRefinement（渲染 InlineComment + postMessage addComment + 存 pendingRefinements）/ removeRefinement / submitAllRefinements（runDocRefinement）/ restoreComments 重锚
- [x] 2.5 新建 `editor/index.ts`：setupEditor（在每次 markdown 渲染后初始化行交互、重锚评论）

## 3. React 组件（合并进 editor 原生 DOM 实现）

- [x] 3.1 `components/InlineEditor.tsx`：合并进 editor 原生 DOM（设计调整，更自洽）
- [x] 3.2 `components/InlineComment.tsx`：合并进 editor 原生 DOM

## 4. 消息协议扩展

- [x] 4.1 `types.ts` OutboundMessage 加：toggleCheckbox / editLine / addComment / removeComment / runDocRefinement
- [x] 4.2 `types.ts` 加 ReviewComment / ReviewCommentAnchor 类型；ViewerPayload 加 reviewComments 字段

## 5. extension 侧 handler

- [x] 5.1 `spec-viewer-provider.ts` onDidReceiveMessage 加 toggleCheckbox 分支：WorkspaceEdit 替换源文件 `[ ]`↔`[x]` + save
- [x] 5.2 加 editLine 分支：WorkspaceEdit 替换该行 + save
- [x] 5.3 加 addComment/removeComment 分支：经 SpecContextManager 串行队列改 reviewComments
- [x] 5.4 加 runDocRefinement 分支：收集 pending 评论 → 构建直接编辑 prompt → sendPromptToChat → 标记 applied
- [x] 5.5 buildState 读取 reviewComments 并放入 payload

## 6. SpecContext 扩展

- [x] 6.1 `spec-context.types.ts` 加 ReviewComment / ReviewCommentAnchor 类型 + SpecContext.reviewComments 字段
- [x] 6.2 SpecContextManager.read 兼容无 reviewComments 的旧文件（默认空数组）
- [x] 6.3 SpecContextManager 评论串行队列（addComment/removeComment/markCommentsApplied）

## 7. 测试与验证

- [x] 7.1 renderer 单测：task 项/段落/标题的 data-line 正确性
- [x] 7.2 SpecContextManager reviewComments 读写单测（add/remove/空兼容）
- [x] 7.3 构建通过 + 既有测试无回归
- [ ] 7.4 手动验证：勾选 task → tasks.md 更新；双击行编辑 → 源文件更新；加评论 → 持久化；Refine → 派发 agent
