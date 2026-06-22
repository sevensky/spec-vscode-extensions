## 1. 完整设计 token

- [x] 1.1 扩充 `:root` 的 `--sv-*` token：补 text-sm/lg/xl/2xl/3xl、space-6/8（对齐 tokens.css:10-34）
- [x] 1.2 补颜色 token：warning/error/purple/review（对齐 tokens.css:60-75）
- [x] 1.3 补背景层级 token：bg-primary/secondary/elevated/code/code-header
- [x] 1.4 补阴影 token：shadow-sm/md/lg
- [x] 1.5 补过渡 token：transition-fast/normal/slow
- [x] 1.6 补 radius-lg

## 2. 主题 fallback + reduced-motion

- [x] 2.1 `.dark` 类的 token 覆盖（对齐 tokens.css:139-201 亮/暗分支）
- [x] 2.2 high-contrast token 覆盖（对齐 tokens.css 分支）
- [x] 2.3 `@media (prefers-reduced-motion: reduce)` 全局禁用动画/过渡（对齐 tokens.css:207-215）

## 3. Reset + 容器原语

- [x] 3.1 `*` box-sizing reset + 字体平滑（对齐 _base.css:10-24）
- [x] 3.2 `.viewer-container` flex column + `.content-area` flex row 布局（对齐 _base.css:30-55）
- [x] 3.3 `.empty-state`（对齐 _base.css:61-71）
- [x] 3.4 滚动条样式 `.content-area::-webkit-scrollbar*`（对齐 _base.css:77-92）
- [x] 3.5 `:focus-visible` 全局 outline（对齐 _base.css:98-101）
- [x] 3.6 high-contrast `@media (prefers-contrast: more)`（对齐 _base.css:107-125）
- [x] 3.7 响应式 `@media (max-width: 500px)`（对齐 _base.css:131-158）

## 4. 动画 keyframe 库

- [x] 4.1 声明 spin/fadeIn/slideDown/slideIn/modalSlideIn（对齐 _animations.css:10-60）
- [x] 4.2 声明 pulse-badge/glow-complete/spec-badge-working/working-pulse/review-glow（对齐 _animations.css:65-115）

## 5. 容器类名对齐（容器级，本变更内完成）

- [x] 5.1 MarkdownContent.tsx 内容容器 id 改为 `#markdown-content`（替代 .spec-md 作为 id；.spec-md 可保留为 class）
- [x] 5.2 SpecViewer index.tsx 用 `.viewer-container` + `.content-area` 包裹
- [x] 5.3 TOC 容器改 `aside.spec-toc`（替代 #spec-toc），同步更新 toc.ts 选择器
- [x] 5.4 app.css 对应选择器同步改名

## 6. 验证

- [x] 6.1 构建 webview 通过
- [ ] 6.2 手动验证：亮/暗主题切换 token 正确；reduced-motion 禁用动画
- [ ] 6.3 手动验证：容器布局、滚动条、focus-visible、高对比度、窄屏响应式
- [x] 6.4 既有测试无回归
