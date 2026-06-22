import type { HistoryEntry } from "../types";

interface ActivityTimelineProps {
	history: HistoryEntry[];
}

/** 动作历史时间线：展示 .spec-context.json 的 history[] 记录。 */
export function ActivityTimeline({ history }: ActivityTimelineProps) {
	return (
		<aside className="w-60 shrink-0 border-l border-[color:color-mix(in_srgb,var(--vscode-foreground)_12%,transparent)] pl-4">
			<h3 className="mb-2 text-sm font-semibold text-[color:var(--vscode-foreground)]">
				历史
			</h3>
			{history.length === 0 ? (
				<p className="text-xs italic text-[color:var(--vscode-descriptionForeground)]">
					暂无
				</p>
			) : (
				<ul className="space-y-1.5 text-xs text-[color:var(--vscode-descriptionForeground)]">
					{history.map((entry, idx) => (
						<li key={`${entry.step}-${entry.at}-${idx}`}>
							<span className="font-medium text-[color:var(--vscode-foreground)]">
								{entry.step}
							</span>{" "}
							· {entry.status} · {entry.agent}
							<div className="text-[10px] opacity-70">{entry.at}</div>
						</li>
					))}
				</ul>
			)}
		</aside>
	);
}
