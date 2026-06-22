## Why

富 spec 面板 `SpecViewerProvider` 当前是纯 HTML 字符串渲染（`spec-viewer-provider.ts` 的 `renderHtml`），交互能力薄弱：流程动作按钮全是 `alert('...（待接入 provider）')` 占位；文档切换靠全量重生成 HTML；无步骤导航、无时间线、无 markdown 渲染。

参考实现 `/www/wwwroot/vscode-extensions/speckit-companion` 提供了成熟的富面板交互模型（header / 导航栏 / step tab / footer 动作 / activity 时间线 / markdown 渲染），其 footer 采用「extension 侧算 catalog、webview 只发 `{type:'footerAction', id}`」的单一来源契约。本扩展已具备 webview-ui React 18 构建链与多页 `page-registry` 机制，且状态桥梁 `SpecContextManager` 已有 append-only `history[]` 骨架——具备直接仿照的前提。

现在做：把面板从纯 HTML 迁到 webview-ui 的 React 应用，对齐 speckit 的交互契约，但**保留我们的粗粒度状态模型**（不做 speckit 的 11 态精细状态机），**动作只写状态、不派发 agent 命令**。

## What Changes

### 1. 新增 React 面板页 `spec-viewer`

- 在 `webview-ui/src/features/spec-viewer/` 新建 React 应用：`SpecHeader`（标题 + status 徽章）、`NavigationBar`（step tabs：proposal/design/tasks/specs）、`MarkdownContent`（渲染当前文档）、`FooterActions`（动作按钮）、`ActivityPanel`（history 时间线）。
- 注册到 `page-registry.tsx`，复用既有 Vite + Tailwind 构建链，**不引入 Preact**（与现有页面技术栈一致）。
- markdown 渲染：用轻量方案（如 `marked` + 手写场景表格增强，或先做纯文本 `pre-wrap`），首期不实现 mermaid / 代码高亮 / 内联评论。

### 2. `SpecViewerProvider` 改造为加载 React webview

- `renderHtml`（HTML 字符串）替换为：加载 `dist/webview/app/index.html` + 注入初始 state（通过 `data-*` 属性或初始 postMessage）。
- 建立 webview ↔ extension 消息协议（见 design）。
- 保留面板按 changeName 注册、`onDidDispose` 清理、文件变化刷新的现有生命周期。

### 3. footer 动作契约（对齐 speckit，粗粒度状态版）

按 `active / completed / archived` 三态驱动 footer catalog（extension 侧计算）：
- **active** → 显示「标记完成」「归档」
- **completed / archived** → 显示「重新激活」
- 点击 → `{type:'footerAction', id:'complete'|'archive'|'reactivate'}`
- extension 侧：`complete/reactivate` 调 `SpecContextManager.setStatus`；`archive` 走既有 `spec.archiveChange` 命令 + 二次确认 + 置 `archived`，全部完成后刷新面板。

### 4. 文档切换契约

step tabs 点击 → `{type:'switchDoc', docType}` → extension 侧更新 `currentDoc` 并回推文档内容。

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities

- `spec-viewer-panel`: 面板从纯 HTML 升级为 React 应用；扩展交互契约——step tabs 切换、footer 动作单一消息源（footerAction）、markdown 渲染、history 时间线、归档二次确认。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `webview-ui/src/features/spec-viewer/`（新建） | React 面板应用（header/navbar/content/footer/activity） |
| `webview-ui/src/page-registry.tsx` | 注册 `spec-viewer` 页 |
| `src/providers/spec-viewer-provider.ts` | `renderHtml` → 加载 webview + postMessage 协议；`onDidReceiveMessage` 扩展 footerAction/switchDoc 分支；归档二次确认 |
| `openspec/changes/.../specs/spec-viewer-panel/spec.md` | 扩展交互契约 |

### 兼容性

- 状态文件 `.spec-context.json` 结构与 `SpecContextManager` API 不变。
- 打开入口（`openspec-for-agent.spec.open` 命令 + `SpecViewerProvider.show(changeName)`）签名不变，仅内部实现替换。
- 不改动 agent 命令派发链路（`sendPromptToChat` / `agent-command-paths`）。

### 风险

- React 面板首期交互体验仍弱于 speckit（无内联编辑/高亮/mermaid）→ 在 design 的 Non-Goals 明确，留后续 change。
- footer catalog 用粗粒度状态，不区分「正在 design」等进行态 → step tab 无法显示进行态 spinner，用「当前 tab 高亮 + 已有文档 tab 可点」近似。
