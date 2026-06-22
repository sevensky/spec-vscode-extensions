/**
 * 评论重锚：markdown 重新渲染后，把持久化的 reviewComments 重新挂回对应行。
 *
 * 锚定策略（best-effort，源文件可能被 agent 编辑导致行漂移）：
 *   1. 存储行号 data-line 仍存在且 blockText 匹配 → 用原行
 *   2. heading 下首个 blockText 匹配的块 → 用该行
 *   3. 任意 blockText 匹配的行 → 用该行
 *   4. 失败 → 评论挂到文档末尾（无锚显示）
 */

import { vscode } from "@/bridge/vscode";
import type { ReviewComment } from "../types";

/**
 * 在 container 内重锚指定 doc 的 pending/applied 评论。
 * 每条评论渲染为 .inline-comment 卡片，挂入对应行的 .line-comment-slot。
 */
export function restoreComments(
	container: HTMLElement,
	comments: ReviewComment[],
	doc: string
): void {
	const docComments = comments.filter((c) => c.doc === doc);
	for (const comment of docComments) {
		const lineEl = resolveAnchorLine(container, comment);
		const slot = lineEl?.querySelector(".line-comment-slot");
		if (slot && !slot.querySelector(`[data-comment-id="${comment.id}"]`)) {
			slot.appendChild(renderCommentCard(comment));
		}
	}
}

/**
 * 渲染单条评论卡片（原生 DOM）。
 */
function renderCommentCard(comment: ReviewComment): HTMLElement {
	const card = document.createElement("div");
	card.className = "inline-comment";
	card.setAttribute("data-comment-id", comment.id);
	const statusBadge =
		comment.status === "applied"
			? '<span class="comment-status applied">已应用</span>'
			: "";
	card.innerHTML = `
		<span class="comment-icon">💬</span>
		<span class="comment-text">${escapeHtml(comment.comment)}</span>
		${statusBadge}
		<button class="comment-remove" title="删除评论">×</button>`;
	// 删除按钮
	card.querySelector(".comment-remove")?.addEventListener("click", () => {
		vscode.postMessage({ command: "removeComment", id: comment.id });
	});
	return card;
}

/**
 * best-effight 锚定：按策略找到评论应挂的行元素。
 */
function resolveAnchorLine(
	container: HTMLElement,
	comment: ReviewComment
): HTMLElement | null {
	// 1. 原行号 + blockText 匹配
	const byLine = container.querySelector<HTMLElement>(
		`.line[data-line="${comment.anchor.line}"]`
	);
	if (byLine && blockMatches(byLine, comment.anchor.blockText)) {
		return byLine;
	}
	// 2/3. 全文找 blockText 匹配的行
	if (comment.anchor.blockText) {
		const allLines = container.querySelectorAll<HTMLElement>(".line");
		for (const line of allLines) {
			if (blockMatches(line, comment.anchor.blockText)) {
				return line;
			}
		}
	}
	// 4. 失败 → null（评论不挂载，CommentsCard 仍显示）
	return null;
}

/** 行的 line-content 文本是否与存储的 blockText 匹配（包含即算）。 */
function blockMatches(lineEl: HTMLElement, blockText: string): boolean {
	const content = lineEl.querySelector(".line-content")?.textContent?.trim() ?? "";
	return blockText.length > 0 && content.includes(blockText.slice(0, 40));
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
