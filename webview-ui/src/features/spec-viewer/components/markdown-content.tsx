import { useMemo } from "react";
import { marked } from "marked";
import type { DocEntry } from "../types";

interface MarkdownContentProps {
	doc: DocEntry | undefined;
}

/**
 * 文档内容区：markdown → HTML 渲染。
 * 首期用 marked 基础渲染（无高亮/mermaid/场景表格增强）。
 * 样式对齐 VS Code 主题（CSS 变量），仅作用于 .spec-md 容器作用域。
 */
export function MarkdownContent({ doc }: MarkdownContentProps) {
	const html = useMemo(() => {
		if (!doc?.exists || !doc.content) return null;
		// marked 同步配置；关闭 mangle 以避免 header id 被转义
		marked.setOptions({ gfm: true, breaks: false });
		return marked.parse(doc.content) as string;
	}, [doc]);

	if (!doc?.exists) {
		return (
			<p className="py-8 text-center italic text-[color:var(--vscode-descriptionForeground)]">
				该文档暂未创建
			</p>
		);
	}

	return (
		<div
			// biome-ignore lint/security/noDangerouslySetInnerHtml: marked 输出，作用域限定 spec-md
			dangerouslySetInnerHTML={{ __html: html ?? "" }}
			className="spec-md text-sm leading-relaxed text-[color:var(--vscode-foreground)]"
		/>
	);
}
