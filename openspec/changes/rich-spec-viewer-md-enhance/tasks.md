## 1. 代码语法高亮

- [x] 1.1 webview-ui 加 highlight.js 依赖
- [x] 1.2 新建 `highlighting.ts`：applyHighlighting（选 pre code[class*=language-]，清旧 hljs class，应用高亮）+ 重试循环（15×150ms 等 hljs 就绪）
- [x] 1.3 `markdown-content.tsx` 在 markdown 渲染后 requestAnimationFrame 调 applyHighlightingWithRetry
- [x] 1.4 高亮配色 CSS 适配亮/暗主题（CSS 变量 + hljs token 颜色）

## 2. Mermaid 图表

- [x] 2.1 webview-ui 加 mermaid 依赖
- [x] 2.2 新建 `mermaid.ts`：initializeMermaid（读 CSS 变量注入 theme config + mermaid.run 查询 .mermaid）+ addMermaidZoomControls（每图 +/Reset/−，0.5–3×）
- [x] 2.3 renderer.ts 对 ```mermaid 块输出 `<div class="mermaid">` 而非普通 code
- [x] 2.4 `markdown-content.tsx` 渲染后调 initializeMermaid；try/catch 失败降级原文

## 3. 场景表格

- [x] 3.1 renderer.ts 增加 scenario 解析：识别连续 Given/When/Then（或场景代码块）→ 组装 `<table class="scenario-table">`，每 `.scenario-row` 带 data-row + 行评论按钮
- [x] 3.2 非标格式降级为普通段落

## 4. 验证

- [ ] 4.1 手动验证：代码块高亮正确（多语言）
- [ ] 4.2 手动验证：mermaid 图表渲染 + 缩放控件可用
- [ ] 4.3 手动验证：openspec spec.md 的 Given/When/Then 场景渲染为表格
- [x] 4.4 构建通过 + bundle 体积确认可接受
- [x] 4.5 既有测试无回归
