/**
 * Mermaid 图表渲染 + 缩放控件。
 *
 * initializeMermaid 读 CSS 变量注入主题，mermaid.run 渲染 .mermaid 元素。
 * addMermaidZoomControls 为每个图加 +/Reset/− 缩放按钮。
 */

import mermaid from "mermaid";

let initialized = false;

/** 从 document 读取 CSS 变量，注入 mermaid theme config */
function readThemeColors(): Record<string, string> {
	const style = getComputedStyle(document.documentElement);
	return {
		primary: style.getPropertyValue("--vscode-foreground").trim() || "#cccccc",
		primaryTextColor: style.getPropertyValue("--vscode-foreground").trim() || "#cccccc",
		primaryBorderColor: style.getPropertyValue("--vscode-focusBorder").trim() || "#007acc",
		lineColor: style.getPropertyValue("--vscode-descriptionForeground").trim() || "#888888",
		background: style.getPropertyValue("--vscode-editor-background").trim() || "#1e1e1e",
		mainBkg: style.getPropertyValue("--vscode-editor-background").trim() || "#2d2d30",
	};
}

/**
 * 初始化 mermaid 并渲染容器内所有 .mermaid 图表。
 * 失败时降级为代码块原文。
 */
export async function initializeMermaid(container: HTMLElement): Promise<void> {
	const mermaidEls = container.querySelectorAll<HTMLElement>(".mermaid");
	if (mermaidEls.length === 0) return;

	if (!initialized) {
		const isDark =
			document.body.classList.contains("dark") ||
			document.body.getAttribute("data-vscode-theme-kind") === "vs-dark";
		const colors = readThemeColors();
		mermaid.initialize({
			startOnLoad: false,
			theme: isDark ? "dark" : "default",
			themeVariables: colors,
			securityLevel: "loose",
		});
		initialized = true;
	}

	try {
		await mermaid.run({ nodes: Array.from(mermaidEls) });
		// 渲染成功后加缩放控件
		for (const el of mermaidEls) {
			addMermaidZoomControls(el as HTMLElement);
		}
	} catch {
		// 渲染失败：把 .mermaid 降级为可见的代码块
		for (const el of mermaidEls) {
			const text = el.textContent ?? "";
			el.classList.remove("mermaid");
			el.innerHTML = `<pre><code>${escapeHtml(text)}</code></pre>`;
		}
	}
}

/**
 * 为 mermaid 图表容器添加缩放控件（+/Reset/−）。
 * 缩放范围 0.5×–3×，通过 CSS transform: scale 实现。
 */
function addMermaidZoomControls(el: HTMLElement): void {
	if (el.parentElement?.querySelector(".mermaid-zoom")) return;

	const wrapper = document.createElement("div");
	wrapper.className = "mermaid-wrapper";
	wrapper.style.position = "relative";

	// 把 mermaid 元素包进 wrapper
	el.parentElement?.insertBefore(wrapper, el);
	wrapper.appendChild(el);

	const controls = document.createElement("div");
	controls.className = "mermaid-zoom";
	controls.style.cssText =
		"position:absolute;top:4px;right:4px;display:flex;gap:2px;z-index:10;";

	let scale = 1;
	const applyScale = () => {
		el.style.transform = `scale(${scale})`;
		el.style.transformOrigin = "top center";
	};

	const makeBtn = (label: string, onClick: () => void) => {
		const btn = document.createElement("button");
		btn.textContent = label;
		btn.style.cssText =
			'padding:2px 6px;font-size:12px;cursor:pointer;border:1px solid var(--vscode-editorWidget-border, #454545);background:var(--vscode-editorWidget-background, #252526);color:var(--vscode-foreground, #cccccc);border-radius:3px;';
		btn.onclick = onClick;
		return btn;
	};

	controls.appendChild(
		makeBtn("−", () => {
			scale = Math.max(0.5, scale - 0.25);
			applyScale();
		}),
	);
	controls.appendChild(
		makeBtn("Reset", () => {
			scale = 1;
			applyScale();
		}),
	);
	controls.appendChild(
		makeBtn("+", () => {
			scale = Math.min(3, scale + 0.25);
			applyScale();
		}),
	);

	wrapper.appendChild(controls);
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}
