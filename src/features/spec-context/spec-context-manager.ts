import { workspace, Uri } from "vscode";
import { join } from "node:path";
import {
	DEFAULT_SPEC_CONTEXT,
	type SpecContext,
	type SpecHistoryEntry,
	type SpecStatus,
	type SpecStep,
} from "../../types/spec-context.types";

/**
 * SpecContextManager — 变更状态桥梁 .spec-context.json 的读写管理。
 *
 * 每个 change 目录下的 .spec-context.json 记录该变更的运行时状态，
 * 作为富面板刷新与 provider 编排的状态单一来源。
 *
 * 文件位置：openspec/changes/<变更名>/.spec-context.json
 * 与 openspec CLI 的 .openspec.yaml（元数据）并存，职责分离。
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
	 * 读取某变更的状态。文件不存在时返回默认 active 状态（不创建文件）。
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
			) as Partial<SpecContext>;
			// 容错：字段缺失时回落到默认值
			return {
				step: parsed.step ?? DEFAULT_SPEC_CONTEXT.step,
				status: parsed.status ?? DEFAULT_SPEC_CONTEXT.status,
				history: Array.isArray(parsed.history) ? parsed.history : [],
				agent: parsed.agent ?? DEFAULT_SPEC_CONTEXT.agent,
			};
		} catch {
			// 文件不存在或 JSON 解析失败 → 返回默认状态
			return { ...DEFAULT_SPEC_CONTEXT };
		}
	}

	/**
	 * 写入完整状态（覆盖写）。若父目录不存在会创建。
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
		// 确保父目录存在（change 目录可能刚创建）
		await workspace.fs.createDirectory(Uri.joinPath(uri, ".."));
		const content = JSON.stringify(context, null, 2);
		await workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
	}

	/**
	 * 乐观更新：将 step/status 设为指定值，并追加一条 started 历史记录。
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
		context.status = "active";
		context.agent = agent;
		context.history.push(entry);
		await SpecContextManager.write(changeName, context, specsPath);
		return context;
	}

	/**
	 * 追加一条 completed 历史记录（通常由 agent 经 preamble 更新后触发，
	 * 或由文件兜底校验调用）。不改 step/status，仅追加历史。
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
	 * 更新变更整体状态（active/completed/archived）。
	 */
	static async setStatus(
		changeName: string,
		status: SpecStatus,
		specsPath = "openspec"
	): Promise<SpecContext> {
		const context = await SpecContextManager.read(changeName, specsPath);
		context.status = status;
		await SpecContextManager.write(changeName, context, specsPath);
		return context;
	}
}
