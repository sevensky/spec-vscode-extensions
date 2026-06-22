import { useEffect, useMemo, useRef } from "react";
import { renderMarkdown } from "../markdown/renderer";
import { applyHighlightingWithRetry } from "../markdown/highlighting";
import { initializeMermaid } from "../markdown/mermaid";
import { buildToc } from "../toc";
import { setupEditor } from "../editor";
import type { DocEntry, ReviewComment } from "../types";

interface MarkdownContentProps {
	doc: DocEntry | undefined;
	reviewComments: ReviewComment[];
	tocEl?: HTMLElement | null;
}

/**
 * 文档内容区：行级 markdown 渲染 + 内联编辑/评论交互。
 *
 * 渲染后通过 setupEditor 初始化行交互（checkbox toggle / 文本编辑 / 评论），
 * 并重新锚定当前文档的 reviewComments。
 */
export function MarkdownContent({
	doc,
	reviewComments,
	tocEl,
}: MarkdownContentProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const html = useMemo(() => {
		if (!doc?.exists || !doc.content) return null;
		return renderMarkdown(doc.content);
	}, [doc]);

	// 渲染后初始化行交互 + 重锚评论 + 代码高亮 + mermaid + TOC
	useEffect(() => {
		if (html && containerRef.current) {
			const container = containerRef.current;
			setupEditor(container, doc?.type ?? "", reviewComments);
			// 代码高亮（下一帧等 DOM 就绪）
			requestAnimationFrame(() => applyHighlightingWithRetry(container));
			// mermaid 图表渲染（异步）
			initializeMermaid(container);
			// TOC 构建
			if (tocEl) {
				requestAnimationFrame(() => buildToc(container, tocEl, false));
			}
		}
	}, [html, doc?.type, reviewComments, tocEl]);

	if (!doc?.exists) {
		return (
			<p className="py-8 text-center italic text-[color:var(--vscode-descriptionForeground)]">
				该文档暂未创建
			</p>
		);
	}

	return (
		<div
			// biome-ignore lint/security/noDangerouslySetInnerHtml: renderer 输出经 escapeHtml，作用域限定 spec-md
			dangerouslySetInnerHTML={{ __html: html ?? "" }}
			id="markdown-content"
			className="spec-md text-sm leading-relaxed text-[color:var(--vscode-foreground)]"
			ref={containerRef}
		/>
	);
}
