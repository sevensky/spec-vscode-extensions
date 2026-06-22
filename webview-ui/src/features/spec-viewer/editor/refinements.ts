/**
 * refinement：当前文档 pending 评论的批量提交。
 *
 * 在内容区上方动态注入「✨ Refine (N)」按钮（N=当前文档 pending 评论数），
 * 点击发送 runDocRefinement 到 extension，由其构建直接编辑 prompt 派发到 agent。
 *
 * 按钮独立于 footer catalog（footer 是状态驱动的流程动作，
 * refinement 是评论驱动的编辑动作，职责分离）。
 */

import { vscode } from "@/bridge/vscode";
import { getCurrentDoc } from "./currentDoc";
import type { ReviewComment } from "../types";

const REFINE_BTN_ID = "refine-submit-btn";

/**
 * 更新 Refine 按钮的可见性与计数。
 * 在每次 markdown 渲染 + 评论重锚后调用。
 */
export function updateRefineButton(
	container: HTMLElement,
	comments: ReviewComment[]
): void {
	const doc = getCurrentDoc();
	const pendingCount = comments.filter(
		(c) => c.doc === doc && c.status === "pending"
	).length;

	let btn = document.getElementById(REFINE_BTN_ID);
	if (pendingCount === 0) {
		btn?.remove();
		return;
	}
	if (!btn) {
		btn = document.createElement("button");
		btn.id = REFINE_BTN_ID;
		btn.className = "refine-btn";
		btn.addEventListener("click", () => {
			vscode.postMessage({ command: "runDocRefinement", doc: getCurrentDoc() });
		});
		// 插到内容容器之前（由调用方确保父节点）
		container.parentElement?.insertBefore(btn, container);
	}
	btn.textContent = `✨ Refine (${pendingCount})`;
}
