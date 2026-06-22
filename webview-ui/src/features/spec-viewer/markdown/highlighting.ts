/**
 * 代码语法高亮（highlight.js）。
 *
 * applyHighlighting 查找 .spec-md pre code，清除旧 hljs class 后重新高亮。
 * 因 hljs 可能尚未就绪，采用重试循环（15 × 150ms）。
 */

// hljs 按需导入 common 语言集（覆盖绝大多数 spec 文档代码块）
import hljs from "highlight.js/lib/common";

/** 最大重试次数 */
const MAX_RETRIES = 15;
/** 每次重试间隔（ms） */
const RETRY_DELAY = 150;

/**
 * 对容器内所有 pre > code 应用 hljs 高亮。
 * 清除旧 hljs class 后重新 highlightElement，避免重复高亮。
 */
export function applyHighlighting(container: HTMLElement): void {
	const blocks = container.querySelectorAll<HTMLElement>(
		"pre code[class*='language-']",
	);
	if (blocks.length === 0) return;

	for (const block of blocks) {
		// 清除旧高亮痕迹
		block.className = block.className.replace(/\bhljs\b/g, "").trim();
		try {
			hljs.highlightElement(block);
		} catch {
			// 未知语言等错误忽略，保持原文
		}
	}
}

/**
 * 带重试的 applyHighlighting：等 hljs 就绪后高亮。
 * 在 markdown 渲染后调用。
 */
export function applyHighlightingWithRetry(container: HTMLElement): void {
	let retries = 0;

	const tryHighlight = () => {
		try {
			applyHighlighting(container);
		} catch {
			// hljs 未就绪
		}
		// 检查是否有未高亮的块（无 hljs class 的 language- 块）
		const unhighlighted = container.querySelectorAll(
			"pre code[class*='language-']:not(.hljs)",
		);
		if (unhighlighted.length > 0 && retries < MAX_RETRIES) {
			retries++;
			setTimeout(tryHighlight, RETRY_DELAY);
		}
	};

	tryHighlight();
}
