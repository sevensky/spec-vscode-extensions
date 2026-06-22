/**
 * 目录（Table of Contents）构建 + 滚动联动。
 *
 * buildToc 扫描内容区的 h2[id]/h3[id]，构建 TOC 链接列表，
 * IntersectionObserver 联动高亮，点击平滑滚动。
 *
 * 切文档时调用 teardownToc 清理旧 observer，再重新构建。
 */

/** 指令性标题前缀（非内容导航目标） */
const DIRECTIVE_PREFIXES = ["Format:", "Path Conventions", "Example:"];

/** TOC 链接项 */
interface TocItem {
	level: 2 | 3;
	id: string;
	text: string;
}

/** 构建状态（用于 teardown） */
interface TocState {
	observer: IntersectionObserver | null;
	resizeObserver: ResizeObserver | null;
}

let tocState: TocState = { observer: null, resizeObserver: null };

/**
 * 构建 TOC。
 *
 * @param contentEl 文档内容区元素（含 h2[id]/h3[id]）
 * @param tocEl TOC 容器元素
 * @param showSubsections 是否显示 h3
 */
export function buildToc(
	contentEl: HTMLElement,
	tocEl: HTMLElement,
	showSubsections: boolean,
): void {
	teardownToc();

	const headings = Array.from(
		contentEl.querySelectorAll<HTMLElement>("h2[id], h3[id]"),
	);

	// 过滤指令性标题
	const items: TocItem[] = [];
	for (const h of headings) {
		const text = h.textContent?.trim() ?? "";
		if (DIRECTIVE_PREFIXES.some((p) => text.startsWith(p))) continue;
		const level = h.tagName === "H2" ? 2 : 3;
		items.push({ level, id: h.id, text });
	}

	// 无标题或仅 1 个标题不渲染 TOC
	if (items.length <= 1) {
		tocEl.innerHTML = "";
		tocEl.style.display = "none";
		return;
	}

	tocEl.style.display = "";

	// 渲染 TOC HTML
	const hasH3 = items.some((i) => i.level === 3);
	const toggleBtn = hasH3
		? `<button class="toc-toggle" title="${showSubsections ? "折叠子节" : "展开子节"}">${showSubsections ? "−" : "+"}</button>`
		: "";

	let html = `<div class="toc-header"><span class="toc-title">目录</span>${toggleBtn}</div><ul class="toc-list">`;
	for (const item of items) {
		if (item.level === 3 && !showSubsections) continue;
		const indent = item.level === 3 ? " toc-sub" : "";
		html += `<li class="toc-item${indent}"><a href="#${item.id}" data-toc-id="${item.id}" class="toc-link">${escapeHtml(item.text)}</a></li>`;
	}
	html += "</ul>";
	tocEl.innerHTML = html;

	// +/− 按钮事件
	const toggleEl = tocEl.querySelector<HTMLButtonElement>(".toc-toggle");
	if (toggleEl) {
		toggleEl.addEventListener("click", () => {
			const next = !showSubsections;
			// 通过 data 属性传递新状态，供调用方监听
			tocEl.dataset.showSubsections = next ? "1" : "0";
			buildToc(contentEl, tocEl, next);
		});
	}

	// 点击 TOC 链接 → 平滑滚动
	const links = tocEl.querySelectorAll<HTMLAnchorElement>(".toc-link");
	for (const link of links) {
		link.addEventListener("click", (e) => {
			e.preventDefault();
			const target = contentEl.querySelector<HTMLElement>(`#${CSS.escape(link.dataset.tocId ?? "")}`);
			if (target) {
				const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
				target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
			}
		});
	}

	// IntersectionObserver 联动高亮
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const id = entry.target.id;
					for (const link of links) {
						link.setAttribute("aria-current", link.dataset.tocId === id ? "true" : "false");
					}
				}
			}
		},
		{ rootMargin: "-80px 0px -70% 0px", root: contentEl },
	);
	tocState.observer = observer;

	for (const heading of headings) {
		observer.observe(heading);
	}
}

/**
 * 清理 TOC observer（切文档时调用）。
 */
export function teardownToc(): void {
	if (tocState.observer) {
		tocState.observer.disconnect();
		tocState.observer = null;
	}
	if (tocState.resizeObserver) {
		tocState.resizeObserver.disconnect();
		tocState.resizeObserver = null;
	}
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
