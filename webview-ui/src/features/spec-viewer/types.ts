/**
 * spec-viewer React 面板的类型契约。
 *
 * ViewerPayload: extension → webview 推送的完整状态（单一来源）。
 * OutboundMessage: webview → extension 的动作消息。
 *
 * 对齐 speckit-companion 的「footerAction 单一来源」契约，
 * 状态为从 SpecStep 派生的精细状态机（对齐 openspec 步骤）。
 */

/** 文档类型（对齐 SpecViewerProvider 的 DocType） */
export type DocType = "proposal" | "design" | "tasks" | "specs";

/**
 * 变更整体状态。从 SpecStep 派生（进行态/完成态）+ draft + 终态。
 * 与 src/types/spec-context.types.ts 的 SpecStatus 对齐。
 */
export type SpecStatus =
	| "draft"
	| "proposing"
	| "proposed"
	| "designing"
	| "designed"
	| "specifying"
	| "specified"
	| "tasking"
	| "tasked"
	| "applying"
	| "applied"
	| "completed"
	| "archived";

/** 单个文档的展示数据 */
export interface DocEntry {
	type: DocType;
	exists: boolean;
	content: string;
}

/** footer 动作项（extension 侧计算 catalog，webview 只渲染+派发 id） */
export interface FooterActionEntry {
	id: FooterActionId;
	label: string;
	/** primary 走强调色按钮，secondary 走普通按钮 */
	variant: "primary" | "secondary";
}

/** footer 动作 id 白名单 */
export type FooterActionId =
	| "advance"
	| "complete"
	| "archive"
	| "reactivate";

/** history 单条记录（对齐 SpecHistoryEntry） */
export interface HistoryEntry {
	step: string;
	status: string;
	at: string;
	agent: string;
}

/** extension → webview 的完整状态载荷 */
export interface ViewerPayload {
	changeName: string;
	status: SpecStatus;
	step: string;
	agent: string;
	currentDoc: DocType;
	docs: DocEntry[];
	history: HistoryEntry[];
	footer: FooterActionEntry[];
}

/** webview → extension 的消息联合类型 */
export type OutboundMessage =
	| { command: "ready" }
	| { command: "switchDoc"; docType: DocType }
	| { command: "footerAction"; id: FooterActionId }
	| { command: "refreshContent" };

/** extension → webview 的消息联合类型 */
export type InboundMessage = {
	command: "state";
	payload: ViewerPayload;
};
