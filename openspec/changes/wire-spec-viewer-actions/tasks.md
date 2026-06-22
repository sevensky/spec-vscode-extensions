## 1. React 面板骨架（webview-ui 新增 spec-viewer 页）

- [x] 1.1 在 `webview-ui/src/features/spec-viewer/` 新建 `index.tsx`（主组件），定义 `ViewerPayload` 类型（changeName/status/step/agent/currentDoc/docs/history）
- [x] 1.2 在 `webview-ui/src/page-registry.tsx` 注册 `spec-viewer` 页
- [x] 1.3 加 `marked` 依赖到 `webview-ui/package.json`，实现 markdown → HTML 渲染（基础语法，主题用 CSS 变量）
- [x] 1.4 建立消息收发：`useEffect` 监听 `window.message`（收 `{command:'state', payload}`），`vscode.postMessage` 发 `switchDoc/footerAction/ready`

## 2. React 组件（对齐 speckit 结构，粗粒度状态版）

- [x] 2.1 `SpecHeader`：变更名标题 + status 徽章（active/completed/archived）
- [x] 2.2 `NavigationBar`：step tabs（Proposal/Design/Tasks/Specs），当前 tab 高亮，不存在的文档标注「缺失」；点击发 `{command:'switchDoc', docType}`
- [x] 2.3 `MarkdownContent`：渲染当前文档 markdown；文档不存在显示「该文档暂未创建」
- [x] 2.4 `FooterActions`：按 status 渲染按钮组（active→标记完成+归档；completed/archived→重新激活）；点击发 `{command:'footerAction', id}`
- [x] 2.5 `ActivityTimeline`：渲染 history[]（step/status/agent/时间），空时显示「暂无」

## 3. `SpecViewerProvider` 改造为加载 React webview

- [x] 3.1 `renderHtml` 替换为加载 `dist/webview/app/index.html`（参考 `get-webview-content.ts` 既有 webview 加载方式 + `localResourceRoots` 配置）
- [x] 3.2 初始状态注入：面板创建后立即 `postMessage({command:'state', payload})`（保留 `buildState` 读取逻辑，仅输出载体变更）
- [x] 3.3 扩展 `onDidReceiveMessage`：新增 `switchDoc`（更新 currentDoc + 重推 payload）、`ready`（推初始 state）、`footerAction`（接入动作处理）、未知命令忽略；changeName 由面板闭包绑定，不信任消息体
- [x] 3.4 `updateContent`（文件变化刷新）改为重算 payload + `postMessage({command:'state', payload})`，不再重生成 HTML
- [x] 3.5 删除/废弃旧的 `renderHtml`、`renderActionButtons`、内联 `<script>` 字符串

## 4. footer 动作接通（extension 侧 handler）

- [x] 4.1 新建 footer catalog 计算函数（extension 侧）：active→[complete,archive]，completed/archived→[reactivate]，每项含 id/label/variant
- [x] 4.2 `id:'complete'` 分支：`SpecContextManager.setStatus(changeName,'completed')` → 刷新面板
- [x] 4.3 `id:'reactivate'` 分支：`SpecContextManager.setStatus(changeName,'active')` → 刷新面板
- [x] 4.4 `id:'archive'` 分支：`window.showWarningMessage` 模态二次确认 → `commands.executeCommand('openspec-for-agent.spec.archiveChange',{specName:changeName})` → `setStatus('archived')` → 刷新
- [x] 4.5 payload 中携带 footer catalog，供 React 侧直接渲染（单一来源契约）

> 任务组 1-4 全部完成。webview 构建（`pnpm run build`）与扩展构建（`node scripts/build-ext.js`）均通过；测试套件 108/108 全绿。

## 5. 验证

- [ ] 5.1 手动验证：双击某变更节点，React 面板打开，结构含 header/navbar/content/footer/timeline

  > 待 GUI 手动验证（无头环境无法打开 WebviewPanel）。代码层：`createPanel` 加载 `getWebviewContent('spec-viewer')`，React `SpecViewer` 渲染 5 个子组件，`ready` 握手后收到初始 state。

- [ ] 5.2 手动验证：点击 step tabs（Proposal/Design/Tasks/Specs）能切换文档内容，缺失文档显示占位

  > 待 GUI 手动验证。代码层：`NavigationBar` 点击发 `switchDoc`，provider 更新 `currentDoc` 后重推 payload。

- [ ] 5.3 手动验证：active 变更点「标记完成」→ footer 切换为「重新激活」，`.spec-context.json` status 变 completed

  > 待 GUI 手动验证。代码层：`footerAction id:'complete'` → `SpecContextManager.setStatus('completed')` → `updateContent` 重算 footer catalog（completed → `[reactivate]`）。

- [ ] 5.4 手动验证：点「重新激活」→ footer 切换回「标记完成 + 归档」，status 变 active

  > 待 GUI 手动验证。代码层：`id:'reactivate'` → `setStatus('active')` → footer 重算为 `[archive, complete]`。

- [ ] 5.5 手动验证：点「归档」→ 弹模态确认；确认后触发 archive 命令、status 变 archived、面板刷新；取消则无变化

  > 待 GUI 手动验证。代码层：`id:'archive'` → `window.showWarningMessage({modal:true})`，确认才执行 `executeCommand('spec.archiveChange')` + `setStatus('archived')`。

- [ ] 5.6 手动验证：三个按钮不再弹 alert；文档内容以 markdown 渲染（非纯文本）

  > 待 GUI 手动验证。代码层：`renderActionButtons`（含 alert）已删除，footer 现由 React `FooterActions` 渲染 + `footerAction` 消息驱动；文档内容由 `MarkdownContent` 用 `marked` 渲染。

- [ ] 5.7 手动验证：变更目录下文档变化 → 面板内容自动刷新

  > 待 GUI 手动验证。代码层：`refreshIfDisplaying`（文件监听器调用）→ `updateContent` → `sendState` 重推 payload。
