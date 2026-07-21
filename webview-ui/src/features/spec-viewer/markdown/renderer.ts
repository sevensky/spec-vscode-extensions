/**
 * 行级 markdown 渲染器。
 *
 * 每个可寻址块（段落/列表项/task/标题/blockquote/code）用 wrapWithLineActions
 * 包裹为带 data-line + 行首评论按钮 + 评论插槽的容器，供内联编辑/评论锚定。
 *
 * 首期支持：段落、无序列表（-/*）、task（- [ ]/[x]）、h1-h3、blockquote、codeblock。
 * 不支持（留 md-enhance）：表格、mermaid、场景表格、代码高亮。
 *
 * 参考 speckit-companion 的 markdown/renderer.ts，精简实现。
 */

/** HTML 转义 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/** 行首评论按钮 SVG（+ 图标） */
const COMMENT_BTN =
	'<button class="line-add-btn" title="添加评论"><span>+</span></button>';

/**
 * 把内容包裹为可寻址行容器。
 * data-line 为 1-based 源行号，供 toggle/edit/comment 锚定。
 */
function wrapWithLineActions(content: string, lineNum: number): string {
	return `<div class="line" data-line="${lineNum}">${COMMENT_BTN}<div class="line-content">${content}</div><div class="line-comment-slot"></div></div>`;
}

/** slug 化（标题 id 用，保留中文等 Unicode 字母数字） */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/** 内联格式：粗体/斜体/行内代码/链接 */
function parseInline(text: string): string {
	let out = escapeHtml(text);
	// 行内代码（先处理，避免内部被其他规则破坏）
	out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
	// 粗体
	out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	// 斜体
	out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
	// 链接 [text](url)
	out = out.replace(
		/\[([^\]]+)\]\(([^)]+)\)/g,
		'<a href="$2">$1</a>'
	);
	return out;
}

/**
 * 渲染 markdown 为带行级锚定的 HTML。
 */
export function renderMarkdown(markdown: string): string {
	// 规范换行
	markdown = markdown.replace(/\r\n?/g, "\n");
	// 剥离 YAML frontmatter，但用空行替换以保持行号对齐源文件
	// （若直接删除，后续 data-line 会偏移，导致 inline edit 改错行）
	markdown = markdown.replace(/^---\n[\s\S]*?\n---\n/, (match) =>
		"\n".repeat(match.split("\n").length - 1)
	);

	const slugCounts = new Map<string, number>();
	const lines = markdown.split("\n");
	let html = "";
	let inList = false;
	let inCodeBlock = false;
	let codeLang = "";
	let codeLines: string[] = [];
	let codeStartLine = 0;

	const closeList = () => {
		if (inList) {
			html += "</ul>\n";
			inList = false;
		}
	};

	const uniqueSlug = (text: string): string => {
		const base = slugify(text);
		const count = slugCounts.get(base) ?? 0;
		slugCounts.set(base, count + 1);
		return count === 0 ? base : `${base}-${count}`;
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const lineNum = i + 1;
		const trimmed = line.trim();

		// codeblock 围栏
		if (trimmed.startsWith("```")) {
			if (!inCodeBlock) {
				closeList();
				inCodeBlock = true;
				codeLang = trimmed.slice(3).trim();
				codeLines = [];
				codeStartLine = lineNum;
			} else {
				inCodeBlock = false;
				const codeText = codeLines.join("\n");
				// mermaid 块 → <div class="mermaid"> 供 mermaid.ts 渲染
				if (codeLang === "mermaid") {
					html += `<div class="mermaid" data-line="${codeStartLine}">${escapeHtml(codeText)}</div>\n`;
				} else {
					const langClass = codeLang
						? ` class="language-${escapeHtml(codeLang)}"`
						: "";
					// codeblock 整体作为一个行容器（锚定到起始行）
					html += `<pre class="code-block" data-line="${codeStartLine}"><code${langClass}>${escapeHtml(codeText)}</code></pre>\n`;
				}
			}
			continue;
		}
		if (inCodeBlock) {
			codeLines.push(line);
			continue;
		}

		// 空行
		if (trimmed === "") {
			closeList();
			continue;
		}

		// 标题 h1-h3
		const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
		if (headingMatch) {
			closeList();
			const level = headingMatch[1].length;
			const text = headingMatch[2];
			const id = uniqueSlug(text);
			const tag = `h${level}`;
			// h1/h2/h3 都加 id 供 TOC 锚定；标题作为行容器
			html += wrapWithLineActions(
				`<${tag} id="${id}">${parseInline(text)}</${tag}>`,
				lineNum
			);
			html += "\n";
			continue;
		}

		// task 项 - [ ] / - [x]
		const taskMatch = line.match(/^(\s*)([-*])\s+\[([ x])\]\s+(.+)$/);
		if (taskMatch) {
			if (!inList) {
				html += '<ul class="task-list">\n';
				inList = true;
			}
			const checked = taskMatch[3] === "x";
			const text = taskMatch[4];
			const checkAttr = checked ? "checked" : "";
			html += `<li class="task-item line" data-line="${lineNum}">${COMMENT_BTN}<div class="line-content"><input type="checkbox" data-line="${lineNum}" ${checkAttr} /> ${parseInline(text)}</div><div class="line-comment-slot"></div></li>\n`;
			continue;
		}

		// 无序列表项
		const listMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
		if (listMatch) {
			if (!inList) {
				html += "<ul>\n";
				inList = true;
			}
			html += `<li class="line" data-line="${lineNum}">${COMMENT_BTN}<div class="line-content">${parseInline(listMatch[3])}</div><div class="line-comment-slot"></div></li>\n`;
			continue;
		}

		// blockquote
		if (line.startsWith(">")) {
			closeList();
			const text = line.replace(/^>\s?/, "");
			html += wrapWithLineActions(
				`<blockquote><p>${parseInline(text)}</p></blockquote>`,
				lineNum
			);
			html += "\n";
			continue;
		}

		// 水平线
		if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
			closeList();
			html += "<hr />\n";
			continue;
		}

		// 场景表格：连续 Given/When/Then 行 → <table class="scenario-table">
		const scenarioMatch = line.match(
			/^\s*[-*]\s+\*\*(Given|When|Then|And|But)\*\*\s+(.+)$/i,
		);
		if (scenarioMatch) {
			closeList();
			// 收集连续场景行
			const scenarioRows: Array<{ keyword: string; text: string; line: number }> = [];
			let j = i;
			while (j < lines.length) {
				const scLine = lines[j];
				const sm = scLine.match(
					/^\s*[-*]\s+\*\*(Given|When|Then|And|But)\*\*\s+(.+)$/i,
				);
				if (!sm) break;
				scenarioRows.push({
					keyword: sm[1].toUpperCase(),
					text: sm[2],
					line: j + 1,
				});
				j++;
			}
			if (scenarioRows.length >= 2) {
				i = j - 1; // 推进主循环（-1 因 for 会 i++）
				html += '<table class="scenario-table">\n<tbody>\n';
				for (const row of scenarioRows) {
					html += `<tr class="scenario-row line" data-line="${row.line}">${COMMENT_BTN}<td class="line-content"><span class="scenario-keyword">${row.keyword}</span> ${parseInline(row.text)}</td><div class="line-comment-slot"></div></tr>\n`;
				}
				html += "</tbody>\n</table>\n";
				continue;
			}
			// 仅一行不构成表格，降级为段落
		}

		// 标准 markdown 表格：| col | col | + |---|---| 分隔行
		if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
			closeList();
			const tableStartLine = lineNum;
			// 解析表头
			const headerCells = line.split("|").slice(1, -1).map((c) => c.trim());
			i += 1; // 跳过分隔行
			// 收集数据行
			const bodyRows: string[][] = [];
			while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) {
				i++;
				const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
				bodyRows.push(cells);
			}
			// 渲染
			html += '<table>\n<thead>\n<tr>';
			for (const cell of headerCells) {
				html += `<th>${parseInline(cell)}</th>`;
			}
			html += "</tr>\n</thead>\n<tbody>\n";
			for (const cells of bodyRows) {
				html += `<tr class="line" data-line="${tableStartLine}">${COMMENT_BTN}`;
				for (const cell of cells) {
					html += `<td class="line-content">${parseInline(cell)}</td>`;
				}
				html += '<div class="line-comment-slot"></div></tr>\n';
			}
			html += "</tbody>\n</table>\n";
			continue;
		}

		// 段落（默认）
		closeList();
		html += wrapWithLineActions(`<p>${parseInline(line)}</p>`, lineNum);
		html += "\n";
	}

	closeList();
	return html;
}
