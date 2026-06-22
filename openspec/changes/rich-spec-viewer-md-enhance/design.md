## Context

`rich-spec-viewer-inline-edit` 引入行级 renderer.ts（段落/列表/task/标题/blockquote + 行包裹），代码块当前输出为普通 `<pre><code>` 无高亮，mermaid 块未处理，场景（Given/When/Then）未结构化。speckit 在 `highlighting.ts`（hljs 重试 + mermaid 主题 + 缩放）和 renderer 的场景解析上有成熟实现，本变更移植核心逻辑。

## CSS 差距（本变更归属）

完整 94 项 CSS 差距盘点见 `docs/spec-viewer-css-gap-audit.md`。本变更负责其中 **24 项**（第三章，#37-60）：

- ✅ 齐全 2 项：#40 链接、#41 水平线
- ⚠️ 残缺 5 项：#47 code-block 容器、#51 hljs 背景重置、#52 mermaid 容器、#57 scenario 表格、（#37 内容容器 max-width 归本变更补）
- ❌ 缺失 17 项：#37-39 内容容器/spec-meta/spec-input、#42-46 图片/strong-em/状态隐藏/structured-header/spec-badge、#48-50 tree-structure/legacy pre/file-ref、#53-54 mermaid 控件/主题、#55-56 标准表格/user-story、#58 acceptance scenarios、#59-60 callout/template-instructions

**类名对齐**（本变更负责）：#52 `.mermaid-wrapper`→`.mermaid-container`、#57 scenario 表格类名对齐 `_tables.css`。

**前置依赖**：`rich-spec-viewer-base-style`（token + 动画库 + reset）。

## Goals / Non-Goals

**Goals:**
- 代码块语法高亮（hljs，主题适配）。
- mermaid 图表渲染 + 缩放控件。
- Given/When/Then 场景解析为表格（带行锚定）。

**Non-Goals:**
- 不重写 renderer 的基础块逻辑（那是 inline-edit 的职责）。
- 不做 hljs/mermaid 的自定义主题包（用默认 + CSS 变量微调）。
- 不做 scenario-table 的行级评论（行锚定复用 inline-edit，但评论交互本身不增强）。

## Decisions

### 决策 1：hljs 异步重试加载（对齐 speckit）

**选择**：highlighting.ts 的 applyHighlighting 用重试循环（15 × 150ms）等全局 `hljs` 就绪后再高亮，避免 webview 脚本加载时序导致首次渲染不高亮。

**理由**：hljs 作为依赖打包进 bundle，但初始化时序不确定；重试是 speckit 验证过的稳妥方案。

### 决策 2：mermaid 主题色读 CSS 变量 + 缩放控件

**选择**：initializeMermaid 在 mermaid.run 前，从 document 读取 CSS 变量（--accent, --bg-primary 等）注入 mermaid theme config；渲染后 addMermaidZoomControls 为每个图加 +/Reset/− 按钮。

**理由**：VS Code 亮/暗主题切换时 CSS 变量自动更新，mermaid 需读取当前值；缩放控件提升大图可用性（对齐 speckit）。

### 决策 3：场景表格在 renderer 解析阶段识别

**选择**：renderer.ts 逐行解析时，识别连续的 Given/When/Then 行（或 ``` 场景代码块），组装为 `<table class="scenario-table">`，每 `.scenario-row` 带 data-row + 行评论按钮。

**理由**：场景表格需行级锚定（与 inline-edit 衔接），必须在 renderer 阶段而非后处理。

## Risks / Trade-offs

- **[风险] bundle 增大** → mermaid ~1MB，但 webview 本地加载无网络依赖，首屏一次加载；hljs 按需语言可瘦身（首期用 common 语言集）。
- **[风险] mermaid 渲染失败** → try/catch 降级为代码块原文，不阻断页面。
- **[取舍] 场景表格格式严格** → 仅识别标准 Given/When/Then，非标格式降级；覆盖 openspec spec.md 主流场景格式。
- **[依赖] 需 inline-edit 的 renderer.ts 已落地** → 本变更在 apply 前确认 inline-edit 已合并。
