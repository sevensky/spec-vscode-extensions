## Context

文档内容区渲染 markdown（来自 inline-edit 的 renderer.ts，h2/h3 带 slug id），但无导航。长文档需滚动定位。speckit 的 toc.ts 实现 buildToc（扫描标题、构建链接、IntersectionObserver 联动、ResizeObserver 窄屏、+/− 展开 h3），本变更移植核心。

TOC 与 Activity 面板互斥：showActivity 时隐藏 TOC（Activity 替代内容区）。

## CSS 差距（本变更归属）

完整 94 项 CSS 差距盘点见 `docs/spec-viewer-css-gap-audit.md`。本变更负责其中 **6 项**（第五章，#89-94）：

- ✅ 齐全 1 项：#93 spec-toc list
- ⚠️ 残缺 4 项：#90 aside.spec-toc（缺 sticky/flex/order）、#91 header/label/toggle（类名不一致+缺 aria-pressed）、#92 empty+narrow hide（缺窄屏）、#94 link（aria-current 值不同+缺 border-left/focus）
- ❌ 缺失 1 项：#89 TOC 布局 token（--toc-min-width/column-width）

**类名对齐**（本变更负责，与 base-style 容器级协同）：`#spec-toc`→`aside.spec-toc`、`.toc-header/title/toggle`→`.spec-toc-header/label/toggle`、`.toc-link`→`.spec-toc-link`、`[aria-current="true"]`→`[aria-current="location"]`。同步更新 toc.ts 的选择器。

**前置依赖**：`rich-spec-viewer-base-style`（#markdown-content 容器 id、content-area 布局——TOC 是 content-area 的右侧列）。

## Goals / Non-Goals

**Goals:**
- 右侧 TOC 列 h2（默认）+ h3（+/− 展开）。
- 点击平滑滚动 + IntersectionObserver 联动高亮。
- 窄屏折叠 + 标题过滤（指令性标题）。

**Non-Goals:**
- 不做 TOC 的拖拽排序/收藏。
- 不做跨文档 TOC（仅当前文档）。
- 不做 Activity 卡片内的 TOC。

## Decisions

### 决策 1：TOC 用 DOM 注入而非纯 React 组件

**选择**：buildToc 直接操作 DOM（扫描标题、构建 `<a>` 链接、挂 IntersectionObserver），渲染后在 requestAnimationFrame 调用。TOC 容器是 index.tsx 里的固定 `<aside id="spec-toc">`，内容由 buildToc 填充。

**理由**：标题来自 dangerouslySetInnerHTML 的 markdown，React 不感知其结构；DOM 扫描 + observer 是 speckit 验证的模式，比把 markdown 解析成 React 状态再渲染 TOC 简单。

### 决策 2：默认 h2，+/− 展开 h3

**选择**：默认只列 h2；TOC 头部 +/− 按钮切换是否显示 h3（仅当文档含 h3 时显示该按钮）。showSubsections 状态会话内持久（切文档保留）。

**理由**：h2 是主结构，h3 过多会刷屏；按需展开。

### 决策 3：标题过滤与 slug

**选择**：过滤 `Format:`、`Path Conventions` 等指令性标题；剥离 `(Priority: P*)` 后缀；slug 用标题文本小写化 + 连字符，重复加序号。

**理由**：指令性标题非内容导航目标；slug 去重避免锚点冲突。

## Risks / Trade-offs

- **[风险] 文档切换时 observer 泄漏** → buildToc 幂等，调用前 teardown 旧 observer；切文档时重新构建。
- **[风险] 标题动态变化（内联编辑后）** → 编辑后触发 refreshContent，重新渲染 markdown + buildToc。
- **[取舍] 不做跨文档 TOC** → 每文档独立 TOC，切文档重建，简单。
