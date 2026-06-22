import type { TaskSummary } from "../../types";

interface TasksCardProps {
	taskSummaries: TaskSummary[];
}

const STATUS_LABEL: Record<TaskSummary["status"], string> = {
	pending: "待办",
	in_progress: "进行中",
	done: "已完成",
};

const STATUS_COLOR: Record<TaskSummary["status"], string> = {
	pending: "text-[color:var(--vscode-descriptionForeground)]",
	in_progress: "text-[color:var(--vscode-charts-blue)]",
	done: "text-[#22c55e]",
};

/** 任务摘要卡片 */
export function TasksCard({ taskSummaries }: TasksCardProps) {
	if (!taskSummaries || taskSummaries.length === 0) return null;
	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				任务进度
			</h3>
			<ul className="space-y-1.5">
				{taskSummaries.map((task) => (
					<li key={task.id} className="text-xs">
						<div className="flex items-center gap-2">
							<span className={`font-medium ${STATUS_COLOR[task.status]}`}>
								{STATUS_LABEL[task.status]}
							</span>
							<code className="text-[color:var(--vscode-descriptionForeground)]">{task.id}</code>
						</div>
						{task.did && (
							<p className="mt-0.5 text-[color:var(--vscode-foreground)]">{task.did}</p>
						)}
						{task.files && task.files.length > 0 && (
							<p className="mt-0.5 text-[10px] text-[color:var(--vscode-descriptionForeground)]">
								{task.files.join(", ")}
							</p>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
