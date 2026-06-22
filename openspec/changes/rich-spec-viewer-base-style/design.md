## Context

富面板 94 项样式差距盘点（详见探索报告）显示 19 项为 shared/base。当前 app.css 的 `--sv-*` 是零散补的子集，缺完整字号/间距/颜色/背景/阴影/过渡 token，无动画库，无容器/滚动条/focus/响应式规则。

speckit 的所有样式建立在 `tokens.css`（设计 token，桥接 VS Code 变量）之上，分布在 `_base.css`（reset/容器/滚动条/focus）、`_animations.css`（keyframe 库）、`_primitives.css`（card 原语）、`_buttons.css`（按钮系统）。本变更移植这些，作为四个功能变更的地基。

类名现状：我们部分类名与 speckit 不一致（`#spec-toc` vs `aside.spec-toc`、`.comment-remove` vs `.comment-delete`），本变更统一对齐 speckit（见决策 5）。

## Goals / Non-Goals

**Goals:**
- 完整 `--sv-*` token（对齐 speckit tokens.css:10-133）。
- reset + 容器原语（viewer-container / content-area / empty-state / 滚动条 / focus-visible / 高对比度 / 响应式）。
- 动画 keyframe 库（spin/fadeIn/slideDown 等 10 个）。
- 共享原语（card 系统）。
- 类名对齐 speckit（本变更内完成容器级类名，细节级留给各功能变更）。

**Non-Goals:**
- 不实现任何功能特性的样式（task checkbox 属 inline-edit，code 高亮属 md-enhance，activity 卡片属 activity-cards）。
- 不改既有 shadcn 组件库（Button/Card 组件保留，仅补 spec-viewer 作用域的类名样式）。
- 不做 Tailwind 到 speckit token 的自动映射（手动声明 --sv-* 即可）。

## Decisions

### 决策 1：token 用 `--sv-*` 前缀，完整移植 speckit tokens.css

**选择**：在 `:root` 下声明完整 `--sv-*` token，逐条对齐 `tokens.css:10-133`（字号阶梯、间距、颜色、背景层级、阴影、过渡、radius），每个 token 桥接对应 VS Code 变量。

**理由**：`--sv-*` 前缀避免与 shadcn 无前缀 token（如 `--background`）冲突；完整移植确保后续功能变更消费时不会因缺 token 失效。

### 决策 2：动画 keyframe 用 speckit 原名，全局声明

**选择**：`@keyframes spin/fadeIn/slideDown/...` 用 speckit 原名全局声明（不加前缀），消费侧用 `animation: spin ...`。

**理由**：keyframe 名是全局的，加前缀会导致每个 animation 引用都要改名，移植成本高；speckit 原名（spin/fadeIn）通用，不冲突。

### 决策 3：card 原语——复用 shadcn Card 组件，不移植 .card 类

**选择**：不移植 speckit 的 `.card/.card-header` 类，activity-cards 变更直接用既有 shadcn `<Card>` 组件。

**理由**：shadcn Card 已有等价能力，移植 speckit 类会双轨。activity-cards 的 spec 里注明用 shadcn Card。

### 决策 4：按钮系统——复用 shadcn Button

**选择**：不移植 speckit 的 `button.primary/secondary` 类，功能变更用 shadcn `<Button variant>`。

**理由**：同决策 3，避免双轨。

### 决策 5：类名对齐——容器级本变更做，细节级各功能变更做

**选择**：
- 本变更统一容器类名：`#markdown-content`（替代 `.spec-md` 作为内容容器 id）、`.viewer-container`、`.content-area`、`aside.spec-toc`（替代 `#spec-toc`）。
- 细节类名（`.comment-remove`→`.comment-delete`、`.refine-btn`→`.refine-submit-btn`）留给各功能变更在对齐时改。

**理由**：容器类名是地基，必须先定；细节类名随功能实现同步对齐，避免本变更改动面过大。

## Risks / Trade-offs

- **[风险] token 声明过多产生死 token** → 只声明 speckit 实际被消费的（盘点表里有引用的）；未引用的不声明。
- **[风险] 类名改动破坏现有渲染** → 容器类名改动同步更新产出该类名的 TSX；构建验证。
- **[取舍] card/button 用 shadcn 不移植 speckit 类** → activity-cards 的样式与 speckit 视觉会有差异，但可接受（shadcn 已是成熟设计系统）。
