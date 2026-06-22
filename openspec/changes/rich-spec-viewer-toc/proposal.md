## Why

当前面板文档内容区无目录导航，长文档（如 design.md / 长 proposal）只能滚动查找。speckit 有成熟的 TOC：右侧目录列 h2/h3，点击平滑滚动定位，IntersectionObserver 联动高亮当前章节，窄屏自适应折叠。

现在做：为文档内容区加右侧 TOC 目录，提升长文档导航体验。这是四个差距变更中最小的一个。

## What Changes

### 1. TOC 目录构建与渲染

- 扫描渲染后 markdown 的 h2/h3（带 id 的标题），构建目录链接列表
- 过滤指令性标题（如 `Format:`、`Path Conventions`）和 `(Priority: P*)` 后缀
- 默认只显示 h2，+/− 按钮展开 h3 子节（仅文档有 h3 时显示该按钮）

### 2. 滚动联动（IntersectionObserver）

- 监听滚动，用 IntersectionObserver（rootMargin 偏移）追踪当前可视标题，高亮对应 TOC 链接
- 点击 TOC 链接平滑滚动到对应标题（尊重 prefers-reduced-motion）

### 3. 窄屏自适应

- ResizeObserver 监听内容区宽度，低于阈值（如 780px）时隐藏 TOC，内容区占满

## Capabilities

### New Capabilities

- `spec-viewer-toc`: 文档右侧目录导航——h2/h3 链接、滚动联动高亮、窄屏折叠。

### Modified Capabilities

- `spec-viewer-panel`: 文档内容区右侧增加 TOC 侧栏（与 Activity 面板互斥显示）。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `webview-ui/src/features/spec-viewer/toc.ts`（新建） | buildToc（扫描标题 + 构建链接 + IntersectionObserver + ResizeObserver + teardown） |
| `webview-ui/src/features/spec-viewer/components/Toc.tsx`（新建） | TOC 容器 React 组件（或纯 DOM 注入） |
| `webview-ui/src/features/spec-viewer/index.tsx` | markdown 渲染后调 buildToc；Activity 显示时隐藏 TOC |
| `webview-ui/src/features/spec-viewer/markdown/renderer.ts` | h2/h3 输出带 slug id（依赖 inline-edit 的 renderer） |

### 兼容性

- 依赖 `rich-spec-viewer-inline-edit` 的 renderer.ts 为标题输出 slug id。
- TOC 与 Activity 面板互斥（显示 Activity 时隐藏 TOC）。
- 无标题或仅一个标题时不显示 TOC。

### 风险

- IntersectionObserver 在 webview 兼容性 → 现代浏览器内核支持，无虞。
- 标题 id slug 冲突 → 加序号去重。
