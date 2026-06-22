## ADDED Requirements

### Requirement: 文档目录导航

文档内容区右侧 MUST 提供目录（TOC），列出文档的 h2 标题（默认）与 h3 子标题（可展开），点击可平滑滚动定位，滚动时联动高亮当前章节。

#### Scenario: 默认显示 h2 目录

- **WHEN** 文档渲染完成且含 h2 标题
- **THEN** TOC MUST 列出所有 h2 标题为可点击链接
- **AND** 过滤指令性标题（如 Format:、Path Conventions）

#### Scenario: 展开 h3 子节

- **WHEN** 文档含 h3 标题且用户点击 +/− 按钮
- **THEN** TOC MUST 展开/收起 h3 子节链接
- **AND** 展开状态在会话内切文档时保留
- **AND** 无 h3 时不显示 +/− 按钮

#### Scenario: 点击 TOC 平滑滚动

- **WHEN** 用户点击 TOC 某链接
- **THEN** 文档 MUST 平滑滚动到对应标题
- **AND** 尊重 prefers-reduced-motion（禁用动画时立即跳转）

#### Scenario: 滚动联动高亮

- **WHEN** 用户滚动文档使某标题进入可视区
- **THEN** TOC 对应链接 MUST 高亮为当前章节
- **AND** 高亮随滚动实时更新

#### Scenario: 窄屏折叠

- **WHEN** 内容区宽度低于阈值（如 780px）
- **THEN** TOC MUST 隐藏
- **AND** 内容区占满宽度

#### Scenario: 与 Activity 面板互斥

- **WHEN** Activity 面板显示时
- **THEN** TOC MUST 隐藏（Activity 替代内容区，无文档可导航）

#### Scenario: 无标题或单标题时不显示

- **WHEN** 文档无标题或仅有一个标题
- **THEN** TOC MUST NOT 显示

## ADDED Requirements（视觉契约，对齐 speckit CSS）

> 完整差距清单见 `docs/spec-viewer-css-gap-audit.md` 第五章。以下为关键验收性需求。

### Requirement: TOC 容器视觉对齐 speckit

TOC 容器（sticky 定位、flex 布局、order、border-right）与链接（border-left 激活指示、focus outline、aria-current 值）视觉 MUST 对齐 speckit `_toc.css`。

#### Scenario: TOC sticky 定位

- **WHEN** 文档内容滚动
- **THEN** `aside.spec-toc` MUST 保持 sticky 定位（对齐 _toc.css:12-23）
- **AND** 作为 content-area 的右侧列（order/flex-basis）

#### Scenario: 链接激活指示用 border-left

- **WHEN** 当前章节对应的 TOC 链接激活
- **THEN** MUST 用 `[aria-current="location"]` + border-left 指示（对齐 _toc.css:98-129）
- **AND** aria-current 值 MUST 为 "location"（非 "true"）

#### Scenario: 链接 focus outline

- **WHEN** 键盘聚焦 TOC 链接
- **THEN** MUST 显示 focus outline（对齐 _toc.css，依赖 base-style focus-visible）

#### Scenario: 窄屏隐藏

- **WHEN** 内容区宽度低于 --toc-min-width
- **THEN** `.content-area--narrow aside.spec-toc` MUST 隐藏（对齐 _toc.css:74-81）

#### Scenario: 类名对齐

- **WHEN** 渲染 TOC
- **THEN** 类名 MUST 与 speckit 一致：`aside.spec-toc`、`.spec-toc-header/label/toggle`、`.spec-toc-link`、`[aria-current="location"]`
