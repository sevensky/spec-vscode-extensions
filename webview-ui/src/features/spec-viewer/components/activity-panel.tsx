import type {
	HistoryEntry,
	ReviewComment,
	SpecConcern,
	TaskSummary,
} from "../types";
import { PhasesCard } from "./cards/phases-card";
import { ApproachCard } from "./cards/approach-card";
import { TasksCard } from "./cards/tasks-card";
import { DecisionsCard } from "./cards/decisions-card";
import { ConcernsCard } from "./cards/concerns-card";
import { CommentsCard } from "./cards/comments-card";
import { FilesCard } from "./cards/files-card";

interface ActivityPanelProps {
	history: HistoryEntry[];
	approach?: string;
	decisions?: string[];
	concerns?: SpecConcern[];
	filesModified?: string[];
	taskSummaries?: TaskSummary[];
	reviewComments: ReviewComment[];
}

/**
 * Activity 面板：结构化卡片容器。
 * 空数据卡片自动隐藏（各卡片内部判断返回 null）。
 */
export function ActivityPanel({
	history,
	approach,
	decisions,
	concerns,
	filesModified,
	taskSummaries,
	reviewComments,
}: ActivityPanelProps) {
	const hasAnyData =
		history.length > 0 ||
		approach ||
		(decisions && decisions.length > 0) ||
		(concerns && concerns.length > 0) ||
		(filesModified && filesModified.length > 0) ||
		(taskSummaries && taskSummaries.length > 0) ||
		reviewComments.length > 0;

	if (!hasAnyData) {
		return (
			<div className="flex h-full items-center justify-center text-sm italic text-[color:var(--vscode-descriptionForeground)]">
				暂无 Activity 数据
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 overflow-auto py-2">
			<PhasesCard history={history} />
			<ApproachCard approach={approach ?? ""} />
			<TasksCard taskSummaries={taskSummaries ?? []} />
			<DecisionsCard decisions={decisions ?? []} />
			<ConcernsCard concerns={concerns ?? []} />
			<CommentsCard reviewComments={reviewComments} />
			<FilesCard filesModified={filesModified ?? []} />
		</div>
	);
}
