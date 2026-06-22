## ADDED Requirements

### Requirement: 代码语法高亮

文档中的代码块 MUST 应用语法高亮，高亮配色适配 VS Code 主题。

#### Scenario: 代码块带语言高亮

- **WHEN** 文档含 ` ```language-X ` 代码块
- **THEN** 该代码块 MUST 按 X 语言应用语法高亮
- **AND** 高亮配色适配当前 VS Code 主题（亮/暗）

#### Scenario: hljs 未就绪时重试

- **WHEN** markdown 渲染完成但 hljs 尚未初始化
- **THEN** 系统 MUST 重试应用高亮（定时轮询）
- **AND** hljs 就绪后完成高亮

### Requirement: Mermaid 图表渲染

文档中的 ```mermaid 代码块 MUST 渲染为图表，图表配色适配主题，并附缩放控件。

#### Scenario: mermaid 块渲染为图表

- **WHEN** 文档含 ```mermaid 代码块
- **THEN** 该块 MUST 渲染为 mermaid 图表
- **AND** 图表配色读 CSS 变量适配主题

#### Scenario: 图表缩放控件

- **WHEN** mermaid 图表渲染完成
- **THEN** 图表 MUST 附带 +/Reset/− 缩放控件
- **AND** 缩放范围 0.5×–3×

#### Scenario: mermaid 渲染失败降级

- **WHEN** mermaid 图表语法错误无法渲染
- **THEN** 系统 MUST 降级显示原始代码块文本
- **AND** 不阻断页面其余内容渲染

### Requirement: 场景表格渲染

文档中的 Given/When/Then 场景 MUST 解析为结构化表格展示，每行可锚定。

#### Scenario: Given/When/Then 解析为表格

- **WHEN** 文档含连续的 Given/When/Then 结构
- **THEN** 系统 MUST 将其解析为 `<table class="scenario-table">`
- **AND** 每行（.scenario-row）带 data-row 属性供锚定

#### Scenario: 非标准格式降级

- **WHEN** 场景格式不匹配标准 Given/When/Then
- **THEN** 系统 MUST 降级为普通段落/代码块渲染

## ADDED Requirements（视觉契约，对齐 speckit CSS）

> 完整差距清单见 `docs/spec-viewer-css-gap-audit.md` 第三章。以下为关键验收性需求。

### Requirement: 代码块视觉对齐 speckit

代码块容器、语法高亮、tree-structure 块、file-ref pill 的视觉 MUST 对齐 speckit `_code.css`。

#### Scenario: code-block 带语言标签头

- **WHEN** 渲染带语言的代码块
- **THEN** MUST 显示 language-label 头（`::before` via `data-language`，对齐 _code.css:11-50）
- **AND** 容器用 radius-lg 圆角

#### Scenario: hljs 背景透明

- **WHEN** 代码块应用 hljs 高亮
- **THEN** `.hljs` MUST 设置 `background: transparent`（对齐 _code.css:150-157），避免覆盖容器背景

#### Scenario: tree-structure 块

- **WHEN** 渲染树形结构代码块（文件树等）
- **THEN** MUST 应用 `.tree-structure` 样式（对齐 _code.css:53-72）

### Requirement: mermaid 视觉对齐 speckit

mermaid 容器、控件工具栏、主题覆盖 MUST 对齐 speckit `_code.css:163-275`。

#### Scenario: mermaid 容器类名

- **WHEN** 渲染 mermaid 块
- **THEN** 容器类名 MUST 为 `.mermaid-container`（对齐 _code.css:163，非 .mermaid-wrapper）
- **AND** svg min-width 1100px 保证可读

#### Scenario: mermaid 控件工具栏

- **WHEN** mermaid 图表渲染完成
- **THEN** MUST 显示 `.mermaid-controls` 工具栏（对齐 _code.css:191-213）

### Requirement: 表格视觉对齐 speckit

标准表格、user-story 卡片、scenario 表格、acceptance scenarios 的视觉 MUST 对齐 speckit `_tables.css`。

#### Scenario: 标准表格样式

- **WHEN** 渲染 pipe 表格
- **THEN** MUST 应用边框/zebra/hover/radius（对齐 _tables.css:10-56）

#### Scenario: scenario 表格彩色列头

- **WHEN** 渲染 scenario 表格
- **THEN** Given 列头 MUST 用 accent 色、When 用 warning、Then 用 success（对齐 _tables.css:170-377）

### Requirement: callout 块

callout（note/tip/warning/important/critical 等）MUST 对齐 speckit `_callouts.css:10-97`。

#### Scenario: callout 变体配色

- **WHEN** 渲染 callout 块
- **THEN** 各变体（note/tip/warning/important/critical）MUST 有对应图标与配色
