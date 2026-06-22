/**
 * 从 history 派生各 step 的阶段时间线。
 *
 * 对每个 step 取首条 started 为 startedAt、首条后续 completed 为 completedAt。
 * 进行态（有 started 无 completed）返回 completedAt: null。
 */
import type { HistoryEntry, PhaseEntry } from "./types";

const STEP_ORDER = [
	"propose",
	"design",
	"specs",
	"tasks",
	"apply",
	"archive",
];

export function derivePhases(history: HistoryEntry[]): PhaseEntry[] {
	const phaseMap = new Map<string, { startedAt: string | null; completedAt: string | null }>();

	for (const step of STEP_ORDER) {
		phaseMap.set(step, { startedAt: null, completedAt: null });
	}

	for (const entry of history) {
		const phase = phaseMap.get(entry.step);
		if (!phase) continue;
		if (entry.status === "started" && !phase.startedAt) {
			phase.startedAt = entry.at;
		}
		if (entry.status === "completed" && !phase.completedAt) {
			phase.completedAt = entry.at;
		}
	}

	return STEP_ORDER.map((step) => {
		const phase = phaseMap.get(step)!;
		return {
			step,
			startedAt: phase.startedAt,
			completedAt: phase.completedAt,
		};
	}).filter((p) => p.startedAt !== null);
}
