import { workspace, Uri } from "vscode";
import { join } from "node:path";
import { SpecContextManager } from "./spec-context-manager";
import type { SpecStep } from "../../types/spec-context.types";

/**
 * SpecContextReconciler — 文件兜底校验状态。
 *
 * 当 agent 未更新 .spec-context.json 时（未听从 preamble），
 * 通过 openspec 工件文件（proposal.md/design.md/specs/tasks.md）的存在性
 * 兜底推断并修正 step。
 *
 * 仅在 step 处于 started 超过阈值时间后触发，不实时运行。
 */

/** 每个 step 完成后应存在的工件文件名 */
const STEP_ARTIFACTS: Record<SpecStep, string[]> = {
	propose: ["proposal.md"],
	design: ["proposal.md", "design.md"],
	specs: ["proposal.md", "design.md", "specs"],
	tasks: ["proposal.md", "tasks.md"],
	apply: [], // apply 无固定工件（改代码）
	archive: [], // archive 是状态变更，无工件
};

/** started 超时阈值（毫秒）。超过此时间且 step 未推进，触发兜底校验。 */
const STARTED_TIMEOUT_MS = 5 * 60 * 1000; // 5 分钟

interface ReconcileResult {
	/** 是否修正了 step */
	corrected: boolean;
	/** 修正后的 context（若 corrected 为 false 则为原值） */
	context: ReturnType<typeof SpecContextManager.read> extends Promise<infer T>
		? T
		: never;
}

export class SpecContextReconciler {
	/**
	 * 检查某变更是否需要兜底修正，若需要则修正。
	 *
	 * 判定逻辑：
	 * 1. 找到 history 里最后一条 started 记录
	 * 2. 若距现在 < STARTED_TIMEOUT_MS，不修正（agent 可能还在跑）
	 * 3. 若超时，检查该 step 对应的工件是否都已生成
	 * 4. 工件齐全 → 推进 step 到下一个合理阶段
	 *
	 * @returns 修正结果
	 */
	static async reconcile(
		changeName: string,
		specsPath = "openspec"
	): Promise<ReconcileResult> {
		const context = await SpecContextManager.read(changeName, specsPath);

		// 找最后一条 started
		const lastStarted = [...context.history]
			.reverse()
			.find((h) => h.status === "started");

		if (!lastStarted) {
			return { corrected: false, context };
		}

		// 未超时，不修正
		const elapsed = Date.now() - new Date(lastStarted.at).getTime();
		if (elapsed < STARTED_TIMEOUT_MS) {
			return { corrected: false, context };
		}

		// 超时了，检查工件是否齐全
		const workspaceFolder = workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			return { corrected: false, context };
		}

		const changeDir = join(
			workspaceFolder.uri.fsPath,
			specsPath,
			"changes",
			changeName
		);
		const artifacts = STEP_ARTIFACTS[lastStarted.step] ?? [];
		const allPresent = await SpecContextReconciler.allArtifactsExist(
			changeDir,
			artifacts
		);

		if (!allPresent) {
			// 工件不齐，agent 可能真的没完成，不修正
			return { corrected: false, context };
		}

		// 工件齐全 → 推进 step
		// 简单策略：若 started 的 step 工件齐全，说明该 step 已完成，
		// 推进到下一阶段（保守推进一步）
		const nextStep = SpecContextReconciler.getNextStep(lastStarted.step);
		if (nextStep === context.step) {
			// 已经在这个 step 了，无需修正
			return { corrected: false, context };
		}

		const corrected = await SpecContextManager.appendCompleted(
			changeName,
			lastStarted.step,
			lastStarted.agent,
			specsPath
		);
		corrected.step = nextStep;
		await SpecContextManager.write(changeName, corrected, specsPath);

		return { corrected: true, context: corrected };
	}

	/**
	 * 检查指定工件是否都存在于 change 目录。
	 */
	private static async allArtifactsExist(
		changeDir: string,
		artifacts: string[]
	): Promise<boolean> {
		for (const artifact of artifacts) {
			const uri = Uri.file(join(changeDir, artifact));
			try {
				await workspace.fs.stat(uri);
			} catch {
				return false;
			}
		}
		return true;
	}

	/**
	 * 推进到下一个 step（保守，一步）。
	 */
	private static getNextStep(step: SpecStep): SpecStep {
		const order: SpecStep[] = [
			"propose",
			"design",
			"specs",
			"tasks",
			"apply",
			"archive",
		];
		const idx = order.indexOf(step);
		return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : step;
	}
}
