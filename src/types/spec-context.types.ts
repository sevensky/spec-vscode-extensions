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

/** SpecStep 的顺序，用于派生「下一阶段」。 */
export const STEP_ORDER: SpecStep[] = [
	"propose",
	"design",
	"specs",
	"tasks",
	"apply",
	"archive",
];

/**
 * 进行态映射：step → 进行中状态（step + ing）。
 */
export const STEP_TO_INPROGRESS: Record<SpecStep, SpecStatus> = {
	propose: "proposing",
	design: "designing",
	specs: "specifying",
	tasks: "tasking",
	apply: "applying",
	archive: "archiving",
};

/**
 * 完成态映射：step → 已完成状态（step + ed）。
 */
export const STEP_TO_COMPLETED: Record<SpecStep, SpecStatus> = {
	propose: "proposed",
	design: "designed",
	specs: "specified",
	tasks: "tasked",
	apply: "applied",
	archive: "archived",
};

/**
 * 终态：用户决策的收尾状态，不从 step 派生。
 */
export type TerminalStatus = "completed" | "archived";

/**
 * 变更的整体状态。
 * 从 SpecStep 派生（进行态/完成态）+ draft 初始态 + completed/archived 终态。
 * status 由 history 派生（见 SpecContextManager.deriveStatus），不应直接写入。
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
	| TerminalStatus;

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

/** 评论锚定（源文件漂移后重锚用） */
export interface ReviewCommentAnchor {
	/** 评论所在标题（heading），用于漂移后定位，null 表示无标题 */
	heading: string | null;
	/** 评论锚定块的首行文本（用于内容匹配重锚） */
	blockText: string;
	/** 创建时的 1-based 源行号 */
	line: number;
}

/** 评论生命周期 */
export type ReviewCommentStatus = "pending" | "applied";

/** 持久化的内联评论（存于 .spec-context.json 的 reviewComments） */
export interface ReviewComment {
	id: string;
	/** 归属文档（proposal/design/tasks/specs） */
	doc: string;
	anchor: ReviewCommentAnchor;
	comment: string;
	status: ReviewCommentStatus;
	createdAt: string;
}

/** 任务摘要（agent 协作过程填写） */
export interface TaskSummary {
	id: string;
	status: "pending" | "in_progress" | "done";
	did?: string;
	files?: string[];
}

/** concern 关联项（agent 协作过程填写） */
export interface SpecConcern {
	text: string;
	task?: string;
}

/**
 * .spec-context.json 的完整结构。
 */
export interface SpecContext {
	/** 当前所处阶段 */
	step: SpecStep;
	/** 变更整体状态（由 history + terminalStatus 派生，只读） */
	status: SpecStatus;
	/** 终态标记。存在时 status 派生为该值，优先于 history 派生 */
	terminalStatus?: TerminalStatus;
	/** 动作历史，按时间顺序追加 */
	history: SpecHistoryEntry[];
	/** 当前使用的 agent */
	agent: string;
	/** 内联评论（跨会话持久化） */
	reviewComments?: ReviewComment[];
	/** 方案概述（agent 填写） */
	approach?: string;
	/** 关键决策列表 */
	decisions?: string[];
	/** 关注点列表 */
	concerns?: SpecConcern[];
	/** 修改的文件列表 */
	filesModified?: string[];
	/** 任务摘要列表 */
	taskSummaries?: TaskSummary[];
}

/**
 * 默认状态：新建变更的初始状态。
 * 不存在 .spec-context.json 时返回此值。
 */
export const DEFAULT_SPEC_CONTEXT: SpecContext = {
	step: "propose",
	status: "draft",
	terminalStatus: undefined,
	history: [],
	agent: "github-copilot",
	reviewComments: [],
};
