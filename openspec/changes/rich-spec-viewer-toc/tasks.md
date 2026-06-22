## 1. TOC 构建

- [x] 1.1 新建 `toc.ts`：buildToc（扫描 h2[id]/h3[id]，过滤指令性标题，剥离 Priority 后缀，slug 去重，构建 `<a>` 链接列表）
- [x] 1.2 默认 h2；+/− 按钮切换 h3 显示（showSubsections 会话内持久）；无 h3 不显示按钮
- [x] 1.3 teardown（清理旧 observer），保证切文档时幂等重建

## 2. 滚动联动

- [x] 2.1 IntersectionObserver（rootMargin 偏移追踪可视标题）→ 高亮对应 TOC 链接 aria-current
- [x] 2.2 点击 TOC 链接 → scrollIntoView（smooth，尊重 prefers-reduced-motion）

## 3. 窄屏自适应

- [x] 3.1 TOC 容器在 Activity 显示时隐藏（互斥逻辑已在 index.tsx 实现）；窄屏由 flex 自然折叠

## 4. 集成

- [x] 4.1 `index.tsx` 加 `<aside id="spec-toc">` 容器；markdown 渲染后 requestAnimationFrame 调 buildToc
- [x] 4.2 Activity 显示时隐藏 TOC（与 Activity 面板互斥）
- [x] 4.3 无标题或单标题时不渲染 TOC
- [x] 4.4 renderer.ts 确认 h2/h3 输出 slug id（inline-edit 已实现）

## 5. 验证

- [ ] 5.1 手动验证：长文档（design.md）右侧 TOC 列 h2，点击平滑滚动
- [ ] 5.2 手动验证：滚动时 TOC 高亮联动
- [ ] 5.3 手动验证：+/− 展开 h3；窄屏隐藏 TOC
- [ ] 5.4 手动验证：Activity 显示时 TOC 隐藏
- [x] 5.5 构建通过 + 既有测试无回归
