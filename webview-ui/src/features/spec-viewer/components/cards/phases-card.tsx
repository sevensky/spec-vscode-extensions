import { ElapsedTimer } from "../elapsed-timer";
import { derivePhases } from "../../timelineEvents";
import type { HistoryEntry } from "../../types";

interface PhasesCardProps {
	history: HistoryEntry[];
}

const STEP_LABEL: Record<string, string> = {
	propose: "提案",
	design: "设计",
	specs: "规格",
	tasks: "任务",
	apply: "实现",
	archive: "归档",
};

/** 阶段时间线卡片：各 step 的耗时 + 进行态实时计时 */
export function PhasesCard({ history }: PhasesCardProps) {
	const phases = derivePhases(history);
	if (phases.length === 0) return null;

	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				阶段时间线
			</h3>
			<ul className="space-y-1.5">
				{phases.map((phase) => {
					const isInProgress = phase.startedAt && !phase.completedAt;
					return (
						<li
							key={phase.step}
							className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
								isInProgress
									? "bg-[color:color-mix(in_srgb,var(--vscode-focusBorder)_15%,transparent)]"
									: ""
							}`}
						>
							<span className="font-medium text-[color:var(--vscode-foreground)]">
								{STEP_LABEL[phase.step] ?? phase.step}
							</span>
							{isInProgress ? (
								<span className="text-[color:var(--vscode-charts-blue)]">
									<ElapsedTimer startedAt={phase.startedAt!} />
								</span>
							) : (
								<span className="text-[color:var(--vscode-descriptionForeground)]">
									{formatDuration(phase.startedAt, phase.completedAt)}
								</span>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
	if (!startedAt || !completedAt) return "—";
	const start = new Date(startedAt).getTime();
	const end = new Date(completedAt).getTime();
	const diff = Math.max(0, end - start);
	const totalSec = Math.floor(diff / 1000);
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const parts: string[] = [];
	if (h > 0) parts.push(`${h}h`);
	if (m > 0 || h > 0) parts.push(`${m}m`);
	parts.push(`${s}s`);
	return parts.join(" ");
}
