/**
 * .spec-context.json 的类型定义
 *
 * 每个 openspec change 目录下的 .spec-context.json 记录该变更的运行时状态，
 * 作为富面板刷新与 provider 编排的状态单一来源。
 * 与 openspec CLI 的 .openspec.yaml（仅 schema/created 元数据）并存，职责分离。
 */

/**
 * 变更当前所处的生命周期阶段。
 * 对齐 openspec 的工件（proposal/design/specs/tasks）+ opsx 命令（apply/archive）。
 */
export type SpecStep =
	| "propose"
	| "design"
	| "specs"
	| "tasks"
	| "apply"
	| "archive";

/**
 * 变更的整体状态。
 * 对齐 speckit-companion 的状态机语义。
 */
export type SpecStatus = "active" | "completed" | "archived";

/**
 * 单条动作历史记录。
 */
export interface SpecHistoryEntry {
	/** 动作发生时的 step */
	step: SpecStep;
	/** 该 step 的子状态（started=开始执行 / completed=已完成） */
	status: "started" | "completed";
	/** ISO 8601 时间戳 */
	at: string;
	/** 执行该动作的 agent（claude / cbc / trae-cli / github-copilot） */
	agent: string;
}

/**
 * .spec-context.json 的完整结构。
 */
export interface SpecContext {
	/** 当前所处阶段 */
	step: SpecStep;
	/** 变更整体状态 */
	status: SpecStatus;
	/** 动作历史，按时间顺序追加 */
	history: SpecHistoryEntry[];
	/** 当前使用的 agent */
	agent: string;
}

/**
 * 默认状态：新建变更的初始状态。
 * 不存在 .spec-context.json 时返回此值。
 */
export const DEFAULT_SPEC_CONTEXT: SpecContext = {
	step: "propose",
	status: "active",
	history: [],
	agent: "github-copilot",
};
