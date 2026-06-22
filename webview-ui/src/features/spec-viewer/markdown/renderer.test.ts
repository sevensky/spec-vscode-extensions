import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./renderer";

/**
 * renderer 单测：验证行级锚定的 data-line 正确性、checkbox 渲染、
 * frontmatter 剥离后行号仍对齐源文件（P3 修复点）。
 */
describe("renderMarkdown", () => {
	describe("data-line 行级锚定", () => {
		it("段落带 1-based data-line", () => {
			const html = renderMarkdown("第一段\n\n第二段");
			const lines = html.match(/data-line="(\d+)"/g) ?? [];
			expect(lines).toContain('data-line="1"');
			expect(lines).toContain('data-line="3"');
		});

		it("标题带 data-line + slug id", () => {
			const html = renderMarkdown("# 标题一\n\n## 标题二");
			expect(html).toContain('data-line="1"');
			expect(html).toContain('id="标题一"');
			expect(html).toContain('id="标题二"');
			expect(html).toContain("<h1");
			expect(html).toContain("<h2");
		});

		it("无序列表项带 data-line", () => {
			const html = renderMarkdown("- 项 A\n- 项 B");
			expect(html).toContain('data-line="1"');
			expect(html).toContain('data-line="2"');
			expect(html).toContain("<ul>");
			expect(html).toContain("<li");
		});
	});

	describe("task checkbox 渲染", () => {
		it("未完成 task 渲染为未勾选 checkbox", () => {
			const html = renderMarkdown("- [ ] 待办");
			expect(html).toContain('type="checkbox"');
			expect(html).not.toContain("checked");
			expect(html).toContain("待办");
			expect(html).toContain('class="task-list"');
		});

		it("已完成 task 渲染为勾选 checkbox", () => {
			const html = renderMarkdown("- [x] 完成");
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("checked");
			expect(html).toContain("完成");
		});

		it("task 带 data-line", () => {
			const html = renderMarkdown("- [ ] 任务");
			expect(html).toMatch(/data-line="1"/);
		});
	});

	describe("frontmatter 行号对齐（P3 修复）", () => {
		it("frontmatter 剥离后正文行号不偏移", () => {
			// frontmatter 4 行（含首尾 ---），正文从源文件第 5 行开始
			const md = `---
title: 测试
status: draft
---

正文段落`;
			const html = renderMarkdown(md);
			// 正文「正文段落」应在源文件第 6 行（4 行 frontmatter + 1 空行 + 1 正文）
			// frontmatter 用空行替换保持行数，故 data-line 应对齐源文件
			expect(html).toContain('data-line="6"');
			// 不应出现 frontmatter 内容
			expect(html).not.toContain("status: draft");
		});

		it("无 frontmatter 时行号从 1 开始", () => {
			const html = renderMarkdown("段落");
			expect(html).toContain('data-line="1"');
		});
	});

	describe("行级包裹结构", () => {
		it("每块含 line-add-btn + line-content + line-comment-slot", () => {
			const html = renderMarkdown("段落");
			expect(html).toContain('class="line-add-btn"');
			expect(html).toContain('class="line-content"');
			expect(html).toContain('class="line-comment-slot"');
		});
	});

	describe("内联格式", () => {
		it("粗体/斜体/行内代码/链接", () => {
			const html = renderMarkdown("**粗** *斜* `码` [链](http://x)");
			expect(html).toContain("<strong>粗</strong>");
			expect(html).toContain("<em>斜</em>");
			expect(html).toContain("<code>码</code>");
			expect(html).toContain('<a href="http://x">链</a>');
		});
	});
});
