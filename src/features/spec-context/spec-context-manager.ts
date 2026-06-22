import { workspace, Uri } from "vscode";
import { join } from "node:path";
import {
	DEFAULT_SPEC_CONTEXT,
	STEP_TO_COMPLETED,
	STEP_TO_INPROGRESS,
	type ReviewComment,
	type SpecContext,
	type SpecHistoryEntry,
	type SpecStatus,
	type SpecStep,
	type TerminalStatus,
} from "../../types/spec-context.types";

/**
 * SpecContextManager — 变更状态桥梁 .spec-context.json 的读写管理。
 *
 * 每个 change 目录下的 .spec-context.json 记录该变更的运行时状态，
 * 作为富面板刷新与 provider 编排的状态单一来源。
 *
 * 文件位置：openspec/changes/<变更名>/.spec-context.json
 * 与 openspec CLI 的 .openspec.yaml（元数据）并存，职责分离。
 *
 * status 是 history + terminalStatus 的派生字段（见 deriveStatus），
 * 调用方通过 markStarted/markCompleted/setStatus 驱动，不直接写 status。
 */
export class SpecContextManager {
	/**
	 * 获取某变更的 .spec-context.json 路径。
	 * specsPath 默认 "openspec"，与 ConfigManager 的 specs 配置一致。
	 */
	static getContextPath(
		changeName: string,
		specsPath = "openspec"
	): Uri | undefined {
		const workspaceFolder = workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			return undefined;
		}
		const filePath = join(
			workspaceFolder.uri.fsPath,
			specsPath,
			"changes",
			changeName,
			".spec-context.json"
		);
		return Uri.file(filePath);
	}

	/**
	 * 从 history + terminalStatus 派生 status（单一来源）。
	 *
	 * 规则：
	 *   1. terminalStatus 存在 → 返回该终态（优先）
	 *   2. history 空 → draft
	 *   3. 末条 status=started → STEP_TO_INPROGRESS[末条.step]
	 *   4. 末条 status=completed → STEP_TO_COMPLETED[末条.step]
	 */
	static deriveStatus(
		history: SpecHistoryEntry[],
		terminalStatus?: TerminalStatus
	): SpecStatus {
		if (terminalStatus) {
			return terminalStatus;
		}
		if (history.length === 0) {
			return "draft";
		}
		const last = history[history.length - 1];
		if (last.status === "started") {
			return STEP_TO_INPROGRESS[last.step];
		}
		return STEP_TO_COMPLETED[last.step];
	}

	/**
	 * 读取某变更的状态。文件不存在时返回默认 draft 状态（不创建文件）。
	 * 读取时归一化旧数据（粗粒态 active/completed/archived）。
	 */
	static async read(
		changeName: string,
		specsPath = "openspec"
	): Promise<SpecContext> {
		const uri = SpecContextManager.getContextPath(changeName, specsPath);
		if (!uri) {
			return { ...DEFAULT_SPEC_CONTEXT };
		}
		try {
			const data = await workspace.fs.readFile(uri);
			const parsed = JSON.parse(
				Buffer.from(data).toString("utf-8")
			) as Partial<SpecContext> & { status?: string };

			const history: SpecHistoryEntry[] = Array.isArray(parsed.history)
				? parsed.history
				: [];

			// 归一化旧数据：粗粒态 active/completed/archived → 新状态机
			let terminalStatus: TerminalStatus | undefined =
				parsed.terminalStatus;
			const legacyStatus = parsed.status;
			if (
				!terminalStatus &&
				(legacyStatus === "completed" || legacyStatus === "archived")
			) {
				terminalStatus = legacyStatus;
			}
			// 旧 active：忽略，由 history 派生（terminalStatus 留空）

			return {
				step: parsed.step ?? DEFAULT_SPEC_CONTEXT.step,
				status: SpecContextManager.deriveStatus(history, terminalStatus),
				terminalStatus,
				history,
				agent: parsed.agent ?? DEFAULT_SPEC_CONTEXT.agent,
				reviewComments: Array.isArray(parsed.reviewComments)
					? parsed.reviewComments
					: [],
			};
		} catch {
			// 文件不存在或 JSON 解析失败 → 返回默认状态
			return { ...DEFAULT_SPEC_CONTEXT };
		}
	}

	/**
	 * 写入完整状态（覆盖写）。若父目录不存在会创建。
	 * status 字段在写入前由 deriveStatus 自动填充（调用方传的值被覆盖）。
	 */
	static async write(
		changeName: string,
		context: SpecContext,
		specsPath = "openspec"
	): Promise<void> {
		const uri = SpecContextManager.getContextPath(changeName, specsPath);
		if (!uri) {
			throw new Error("无法确定 workspace 根目录，无法写入 .spec-context.json");
		}
		// status 是派生字段，写入前重算，保证与 history/terminalStatus 一致
		context.status = SpecContextManager.deriveStatus(
			context.history,
			context.terminalStatus
		);
		// 确保父目录存在（change 目录可能刚创建）
		await workspace.fs.createDirectory(Uri.joinPath(uri, ".."));
		const content = JSON.stringify(context, null, 2);
		await workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
	}

	/**
	 * 乐观更新：将 step 设为指定值，并追加一条 started 历史记录。
	 * status 由 write 时从 history 派生（进行态）。
	 * 用于"动作开始时立即更新状态，不等待 agent 完成"。
	 */
	static async markStarted(
		changeName: string,
		step: SpecStep,
		agent: string,
		specsPath = "openspec"
	): Promise<SpecContext> {
		const context = await SpecContextManager.read(changeName, specsPath);
		const entry: SpecHistoryEntry = {
			step,
			status: "started",
			at: new Date().toISOString(),
			agent,
		};
		context.step = step;
		context.agent = agent;
		// 进入进行态时清除终态标记（从 completed/archived 重新激活的场景）
		context.terminalStatus = undefined;
		context.history.push(entry);
		await SpecContextManager.write(changeName, context, specsPath);
		return context;
	}

	/**
	 * 追加一条 completed 历史记录（通常由 agent 经 preamble 更新后触发，
	 * 或由文件兜底校验调用）。不改 step，仅追加历史；status 由 write 派生。
	 */
	static async appendCompleted(
		changeName: string,
		step: SpecStep,
		agent: string,
		specsPath = "openspec"
	): Promise<SpecContext> {
		const context = await SpecContextManager.read(changeName, specsPath);
		const entry: SpecHistoryEntry = {
			step,
			status: "completed",
			at: new Date().toISOString(),
			agent,
		};
		context.history.push(entry);
		await SpecContextManager.write(changeName, context, specsPath);
		return context;
	}

	/**
	 * 更新变更终态（completed/archived）。
	 * 进行态/完成态由 markStarted/appendCompleted 驱动，不接受。
	 * 传 'active' 视为重新激活：清除 terminalStatus，status 交由 history 派生。
	 */
	static async setStatus(
		changeName: string,
		status: SpecStatus | "active",
		specsPath = "openspec"
	): Promise<SpecContext> {
		const context = await SpecContextManager.read(changeName, specsPath);
		if (status === "completed" || status === "archived") {
			context.terminalStatus = status;
		} else if (status === "active") {
			// 重新激活：清除终态，status 由 history 重新派生
			context.terminalStatus = undefined;
		} else {
			throw new Error(
				`setStatus 仅接受终态 'completed'/'archived' 或重新激活 'active'，不接受进行态/完成态 '${status}'（请用 markStarted/markCompleted 驱动）`
			);
		}
		await SpecContextManager.write(changeName, context, specsPath);
		return context;
	}

	/**
	 * 评论操作的串行队列：changeName → Promise chain。
	 * 防止 add/remove/markApplied 并发导致 read-modify-write 覆盖。
	 */
	private static commentQueues = new Map<string, Promise<unknown>>();

	/** 把评论操作排队执行（串行，防并发覆盖）。 */
	private static enqueueCommentMutation(
		changeName: string,
		specsPath: string,
		mutate: (ctx: SpecContext) => SpecContext
	): Promise<SpecContext> {
		const key = `${changeName}@${specsPath}`;
		const prev = SpecContextManager.commentQueues.get(key) ?? Promise.resolve();
		const next = prev.then(() =>
			SpecContextManager.applyCommentMutation(changeName, specsPath, mutate)
		);
		SpecContextManager.commentQueues.set(key, next.then(() => undefined));
		// 失败也清理队列，不阻塞后续
		next.catch(() => undefined);
		return next;
	}

	private static async applyCommentMutation(
		changeName: string,
		specsPath: string,
		mutate: (ctx: SpecContext) => SpecContext
	): Promise<SpecContext> {
		const context = await SpecContextManager.read(changeName, specsPath);
		const next = mutate(context);
		await SpecContextManager.write(changeName, next, specsPath);
		return next;
	}

	/**
	 * 添加一条评论。
	 */
	static addComment(
		changeName: string,
		comment: ReviewComment,
		specsPath = "openspec"
	): Promise<SpecContext> {
		return SpecContextManager.enqueueCommentMutation(
			changeName,
			specsPath,
			(ctx) => {
				ctx.reviewComments = [...(ctx.reviewComments ?? []), comment];
				return ctx;
			}
		);
	}

	/**
	 * 按 id 移除一条评论。
	 */
	static removeComment(
		changeName: string,
		commentId: string,
		specsPath = "openspec"
	): Promise<SpecContext> {
		return SpecContextManager.enqueueCommentMutation(
			changeName,
			specsPath,
			(ctx) => {
				ctx.reviewComments = (ctx.reviewComments ?? []).filter(
					(c) => c.id !== commentId
				);
				return ctx;
			}
		);
	}

	/**
	 * 将指定文档的 pending 评论标记为 applied（refinement 提交后调用）。
	 */
	static markCommentsApplied(
		changeName: string,
		doc: string,
		specsPath = "openspec"
	): Promise<SpecContext> {
		return SpecContextManager.enqueueCommentMutation(
			changeName,
			specsPath,
			(ctx) => {
				ctx.reviewComments = (ctx.reviewComments ?? []).map((c) =>
					c.doc === doc && c.status === "pending"
						? { ...c, status: "applied" }
						: c
				);
				return ctx;
			}
		);
	}
}
