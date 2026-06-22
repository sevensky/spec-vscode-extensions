## Why

富面板的 94 项样式差距盘点显示，19 项属于 shared/base 层（设计 token、动画库、reset、容器布局、滚动条、focus-visible、高对比度、响应式），是 inline-edit / md-enhance / activity-cards / toc 四个变更的共同前置——它们都消费这些 token 与原语。

当前 app.css 的 `--sv-*` token 是上次零散补的子集（缺 `--text-sm/lg/xl`、`--warning/error/purple`、`--bg-primary/secondary/elevated`、`--shadow-*`、`--transition-*` 等），且无动画 keyframe 库、无容器/滚动条/focus-visible/高对比度/响应式规则。导致后续四个变更即使移植了 speckit 的规则，也因缺 token 或动画而失效（这正是之前"挤牙膏"的根因）。

现在做：系统补齐 base 层——完整 token、动画库、reset、容器原语，作为四个功能变更的地基。同时统一类名对齐 speckit（见 design）。

## What Changes

### 1. 完整设计 token（`--sv-*` 桥接 VS Code 变量）

对齐 speckit `tokens.css:10-133`，补齐缺失 token：完整字号阶梯（text-sm/lg/xl/2xl/3xl）、完整间距（space-6/8）、颜色（warning/error/purple/review）、背景层级（bg-primary/secondary/elevated/code/code-header）、阴影（shadow-sm/md/lg）、过渡（transition-fast/normal/slow）、radius-lg。

### 2. 主题 fallback + reduced-motion

- `body.vscode-light` / `.dark` / high-contrast 的 token 覆盖（`tokens.css:139-201`）
- `@media (prefers-reduced-motion: reduce)` 全局禁用动画（`tokens.css:207-215`）

### 3. Reset + 容器原语

- `*` box-sizing reset + 字体平滑（`_base.css:10-24`）
- `.viewer-container` flex column + `.content-area` flex row 布局（`_base.css:30-55`）
- `.empty-state`（`_base.css:61-71`）
- 滚动条样式（`_base.css:77-92`）
- `:focus-visible` 全局 outline（`_base.css:98-101`）
- high-contrast 调整（`_base.css:107-125`）
- 响应式 `@media (max-width: 500px)`（`_base.css:131-158`）

### 4. 动画 keyframe 库

移植 `_animations.css:10-115`：spin / fadeIn / slideDown / slideIn / modalSlideIn / pulse-badge / glow-complete / spec-badge-working / working-pulse / review-glow。多个功能变更引用这些动画。

### 5. 共享原语

`.card` / `.card-header/title/actions/body`（`_primitives.css:13-46`）、独立按钮系统 primary/secondary/ghost/enhancement/destructive（`_buttons.css:7-119`）。决策：复用既有 shadcn 组件还是移植类名（见 design）。

## Capabilities

### New Capabilities

- `spec-viewer-base-style`: 富面板的 base 层样式——设计 token、动画库、reset、容器原语、共享组件，作为四个功能变更的地基。

## Impact

### 受影响代码

| 文件 | 改动 |
|------|------|
| `webview-ui/src/app.css` | 扩充 `--sv-*` token；新增 reset/容器/滚动条/focus/响应式/动画/原语段 |
| `webview-ui/src/features/spec-viewer/components/*.tsx` | 容器类名对齐（viewer-container / content-area） |

### 兼容性

- token 用 `--sv-*` 前缀，不与既有 shadcn token（无前缀）冲突。
- 类名对齐是破坏性改动，但在本变更内统一完成，不跨变更。

### 风险

- token 体量大 → 按 speckit 完整移植，但只声明实际被消费的（避免死 token）。
- 动画 keyframe 可能与 Tailwind 冲突 → 用 speckit 原名 + 限定 `.spec-md`/容器作用域。
