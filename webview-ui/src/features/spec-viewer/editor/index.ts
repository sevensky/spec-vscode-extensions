/**
 * editor 模块入口：setupEditor 在每次 markdown 渲染后调用。
 *
 * 职责：
 *   - 设置当前文档（供评论归属）
 *   - 绑定 checkbox change（toggleCheckbox）
 *   - 绑定行评论按钮 +（addComment via InlineEditor）
 *   - 绑定行内容双击（editLine via InlineEditor）
 *   - 重锚当前文档的 reviewComments（restoreComments）
 *
 * 用事件委托（document 级监听），渲染后无需重新绑定。
 */

import { vscode } from "@/bridge/vscode";
import { setCurrentDoc, getCurrentDoc } from "./currentDoc";
import { restoreComments } from "./restoreComments";
import { updateRefineButton } from "./refinements";
import type { ReviewComment } from "../types";

let editorBound = false;

/**
 * 初始化行交互（幂等：重复调用只更新当前 doc + 重锚评论）。
 */
export function setupEditor(
	container: HTMLElement,
	doc: string,
	reviewComments: ReviewComment[]
): void {
	setCurrentDoc(doc);

	// 事件委托只绑一次（document 级，跨渲染存活）
	if (!editorBound) {
		bindDocumentDelegation();
		editorBound = true;
	}

	// 重锚当前文档的 pending 评论
	restoreComments(container, reviewComments, getCurrentDoc());
	// 更新 Refine 按钮（pending 评论数）
	updateRefineButton(container, reviewComments);
}

/** 绑定 document 级事件委托（checkbox / 评论按钮 / 双击编辑）。 */
function bindDocumentDelegation(): void {
	// checkbox toggle
	document.addEventListener("change", (event) => {
		const target = event.target as HTMLElement;
		if (target.tagName === "INPUT" && target.getAttribute("type") === "checkbox") {
			const lineNum = Number(target.getAttribute("data-line"));
			if (lineNum > 0) {
				const checked = (target as HTMLInputElement).checked;
				vscode.postMessage({ command: "toggleCheckbox", lineNum, checked });
				// 乐观更新本地进度（由下次 state 对账）
			}
		}
	});

	// 行评论按钮 +（点击弹出 InlineEditor）
	document.addEventListener("click", (event) => {
		const target = event.target as HTMLElement;
		const addBtn = target.closest(".line-add-btn") as HTMLElement | null;
		if (addBtn) {
			const lineEl = addBtn.closest(".line") as HTMLElement | null;
			if (lineEl) {
				const lineNum = Number(lineEl.getAttribute("data-line"));
				showInlineCommentEditor(lineEl, lineNum);
			}
		}
	});

	// 注：双击文本编辑（showInlineTextEditor）已禁用——渲染后 DOM 编辑会丢失
	// markdown 内联格式（如 **粗体** → 粗体），speckit 也将该交互判定为 legacy
	// （_line-actions.css:174 "kept for compatibility"）。文本编辑请用评论
	// （refinement）或直接编辑源文件。
}

/**
 * 行评论编辑器：在 .line-comment-slot 挂载 textarea，提交发 addComment。
 * 首期用原生 DOM（非 React 组件），保持 editor 模块自洽。
 */
function showInlineCommentEditor(lineEl: HTMLElement, lineNum: number): void {
	const slot = lineEl.querySelector(".line-comment-slot");
	if (!slot) return;
	// 已有编辑器则不重复
	if (slot.querySelector(".inline-editor")) return;

	const editor = document.createElement("div");
	editor.className = "inline-editor";
	editor.innerHTML = `
		<textarea class="inline-editor-textarea" placeholder="添加评论或修改建议..." rows="2"></textarea>
		<div class="inline-editor-actions">
			<button class="inline-editor-cancel">取消</button>
			<button class="inline-editor-submit">添加评论</button>
		</div>`;
	slot.appendChild(editor);

	const textarea = editor.querySelector("textarea") as HTMLTextAreaElement;
	textarea.focus();

	const close = () => editor.remove();
	editor.querySelector(".inline-editor-cancel")?.addEventListener("click", close);
	editor.querySelector(".inline-editor-submit")?.addEventListener("click", () => {
		const text = textarea.value.trim();
		if (!text) {
			close();
			return;
		}
		const lineContent =
			lineEl.querySelector(".line-content")?.textContent?.trim() ?? "";
		const id = `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		vscode.postMessage({
			command: "addComment",
			id,
			doc: getCurrentDoc(),
			lineNum,
			lineContent,
			comment: text,
		});
		close();
	});
	// Ctrl+Enter 提交，Esc 取消
	textarea.addEventListener("keydown", (e) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			editor.querySelector(".inline-editor-submit")?.dispatchEvent(new Event("click"));
		} else if (e.key === "Escape") {
			close();
		}
	});
}
