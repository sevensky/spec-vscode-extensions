/**
 * 当前文档类型工具。
 * editor 模块用它确定评论归属哪个文档。
 */

let currentDocType = "";

/** 设置当前文档类型（每次 markdown 渲染前由 setupEditor 调用）。 */
export function setCurrentDoc(doc: string): void {
	currentDocType = doc;
}

/** 获取当前文档类型。 */
export function getCurrentDoc(): string {
	return currentDocType;
}
