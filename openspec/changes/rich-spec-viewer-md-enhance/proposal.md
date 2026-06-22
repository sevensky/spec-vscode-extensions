## Why

当前面板 markdown 渲染是基础级（`rich-spec-viewer-inline-edit` 引入的行级 renderer 只支持段落/列表/task/标题）。代码块无语法高亮、无 mermaid 图表渲染、场景（Given/When/Then）不解析成表格。speckit 在这三块都有成熟实现（hljs 重试加载 + mermaid 主题色 + 缩放控件 + 场景表格解析），文档可读性远超我们。

现在做：在行级 renderer 基础上增强三块——代码高亮、mermaid 图表、场景表格，提升文档展示质量。

## What Changes

### 1. 代码语法高亮（hljs）

- 集成 highlight.js，对 `<pre><code class="language-X">` 应用高亮
- hljs 异步加载，重试机制（对齐 speckit：15 次 × 150ms，等 hljs 全局就绪）
- 主题色用 CSS 变量适配 VS Code 亮/暗主题

### 2. Mermaid 图表

- 集成 mermaid，对 ```mermaid 代码块渲染为图表
- 主题色读 CSS 变量（--accent / --bg-primary 等）适配主题
- 加缩放控件（+/Reset/−，0.5×–3×，对齐 speckit 的 addMermaidZoomControls）

### 3. 场景表格（Given/When/Then）

- renderer 识别 ``` 语法块或特定结构的 Given/When/Then 场景，解析为 `<table class="scenario-table">`
- 每行带 `.scenario-row[data-row]` + 行评论按钮（与 inline-edit 的行级锚定衔接）

## Capabilities

### New Capabilities
<!-- 无 -->

### Modified Capabilities

- `spec-viewer-panel`: markdown 渲染增强——代码高亮、mermaid 图表、场景表格，提升文档可读性与专业性。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `webview-ui/src/features/spec-viewer/markdown/renderer.ts` | 场景表格解析（Given/When/Then → table）；代码块输出 language-X class |
| `webview-ui/src/features/spec-viewer/highlighting.ts`（新建） | hljs 应用 + 重试加载 |
| `webview-ui/src/features/spec-viewer/mermaid.ts`（新建） | mermaid 初始化 + 主题色 + 缩放控件 |
| `webview-ui/src/features/spec-viewer/index.tsx` | markdown 渲染后调 applyHighlighting + initializeMermaid |
| `webview-ui/package.json` | 加 highlight.js + mermaid 依赖 |

### 兼容性

- 依赖 `rich-spec-viewer-inline-edit` 的 renderer.ts 已落地（本变更在其上增强）。
- 场景表格的行锚定复用 inline-edit 的 wrapWithLineActions。
- 无高亮/mermaid 时降级为普通代码块（graceful degradation）。

### 风险

- hljs/mermaid 体积大（mermaid ~1MB）→ webview bundle 增大，但 webview 仅本地加载无 CDN 依赖，可接受。
- mermaid 主题色读 CSS 变量需在 mermaid.run 前同步 → 确保渲染时序。
- 场景表格解析依赖固定 Given/When/Then 格式 → 格式不匹配时降级为普通代码块/段落。
