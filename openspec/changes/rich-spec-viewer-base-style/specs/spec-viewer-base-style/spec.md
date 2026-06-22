## ADDED Requirements

### Requirement: 完整设计 token 桥接 VS Code 变量

富面板 MUST 声明完整的设计 token（`--sv-*` 前缀），覆盖字号阶梯、间距阶梯、颜色语义、背景层级、阴影、过渡、圆角，每个 token 桥接对应 VS Code CSS 变量，作为所有功能特性的样式基础。

#### Scenario: 字号阶梯完整

- **WHEN** 查看设计 token
- **THEN** MUST 包含 `--sv-text-xs/sm/base/lg/xl/2xl/3xl`（对齐 speckit tokens.css:10-18）

#### Scenario: 间距阶梯完整

- **WHEN** 查看设计 token
- **THEN** MUST 包含 `--sv-space-1` 至 `--sv-space-8`（对齐 tokens.css:28-34）

#### Scenario: 颜色语义完整

- **WHEN** 查看设计 token
- **THEN** MUST 包含 `--sv-accent/accent-hover/accent-subtle`、`--sv-success/success-subtle`、`--sv-warning`、`--sv-error`、`--sv-purple`、`--sv-review`（对齐 tokens.css:51-75）
- **AND** 每个 token MUST 桥接 VS Code 变量（如 `--sv-success: var(--vscode-testing-iconPassed)`）

#### Scenario: 背景层级完整

- **WHEN** 查看设计 token
- **THEN** MUST 包含 `--sv-bg-primary/secondary/elevated/code/code-header`（对齐 tokens.css）

#### Scenario: 阴影与过渡完整

- **WHEN** 查看设计 token
- **THEN** MUST 包含 `--sv-shadow-sm/md/lg`、`--sv-transition-fast/normal/slow`（对齐 tokens.css）

### Requirement: 主题 fallback 与 reduced-motion

token MUST 提供亮/暗/高对比度主题的 fallback 覆盖，并尊重 reduced-motion 用户偏好。

#### Scenario: 亮暗主题 token 覆盖

- **WHEN** VS Code 处于亮色或暗色主题
- **THEN** token MUST 通过 `.dark` 类或 `body.vscode-light/dark` 提供对应 fallback 值（对齐 tokens.css:139-201）

#### Scenario: reduced-motion 禁用动画

- **WHEN** 用户系统启用 `prefers-reduced-motion: reduce`
- **THEN** 所有动画与过渡 MUST 被禁用或显著减弱（对齐 tokens.css:207-215）

### Requirement: Reset 与容器原语

富面板 MUST 提供基础 reset（box-sizing、字体平滑）、容器布局原语（viewer-container、content-area）、空态、滚动条样式、focus-visible、高对比度与响应式适配。

#### Scenario: box-sizing reset

- **WHEN** 渲染富面板
- **THEN** 所有元素 MUST 应用 `box-sizing: border-box`

#### Scenario: 容器布局原语

- **WHEN** 富面板挂载
- **THEN** MUST 提供 `.viewer-container`（flex column）与 `.content-area`（flex row，文档 + TOC/Activity）布局原语（对齐 _base.css:30-55）

#### Scenario: 滚动条样式

- **WHEN** 内容区可滚动
- **THEN** 滚动条 MUST 有定制样式（对齐 _base.css:77-92）

#### Scenario: focus-visible 全局 outline

- **WHEN** 键盘聚焦可交互元素
- **THEN** MUST 显示 focus-visible outline（对齐 _base.css:98-101）

#### Scenario: 高对比度适配

- **WHEN** 系统启用高对比度模式
- **THEN** 富面板 MUST 通过 `@media (prefers-contrast: more)` 增强边框/对比度（对齐 _base.css:107-125）

#### Scenario: 响应式窄屏

- **WHEN** 视口宽度 ≤ 500px
- **THEN** 动作栏/步骤导航 MUST 响应式适配（对齐 _base.css:131-158）

### Requirement: 动画 keyframe 库

富面板 MUST 提供共享的动画 keyframe 库，供多个功能特性引用。

#### Scenario: keyframe 完整

- **WHEN** 查看动画库
- **THEN** MUST 声明 `spin`、`fadeIn`、`slideDown`、`slideIn`、`modalSlideIn`、`pulse-badge`、`glow-complete`、`spec-badge-working`、`working-pulse`、`review-glow`（对齐 _animations.css:10-115）

### Requirement: 容器类名对齐 speckit

富面板的内容容器、布局原语、TOC 容器类名 MUST 与 speckit 对齐，作为后续功能变更类名统一的基础。

#### Scenario: 内容容器 id

- **WHEN** 渲染文档内容
- **THEN** 内容容器 MUST 使用 `#markdown-content`（对齐 speckit），与 speckit 样式选择器一致

#### Scenario: 布局容器类名

- **WHEN** 富面板挂载
- **THEN** MUST 使用 `.viewer-container` 与 `.content-area`（对齐 _base.css）

#### Scenario: TOC 容器类名

- **WHEN** 渲染 TOC
- **THEN** TOC 容器 MUST 使用 `aside.spec-toc`（对齐 _toc.css），而非 `#spec-toc`
