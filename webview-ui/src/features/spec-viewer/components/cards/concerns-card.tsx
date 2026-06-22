import type { SpecConcern } from "../../types";

interface ConcernsCardProps {
	concerns: SpecConcern[];
}

/** 关注点卡片 */
export function ConcernsCard({ concerns }: ConcernsCardProps) {
	if (!concerns || concerns.length === 0) return null;
	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				关注点
			</h3>
			<ul className="space-y-1.5 text-sm">
				{concerns.map((concern, idx) => (
					<li key={`concern-${idx}`} className="flex items-start gap-2">
						<span className="text-[color:var(--vscode-errorForeground)]">⚠</span>
						<div>
							<span className="text-[color:var(--vscode-foreground)]">{concern.text}</span>
							{concern.task && (
								<code className="ml-2 rounded bg-[color:color-mix(in_srgb,var(--vscode-focusBorder)_20%,transparent)] px-1.5 py-0.5 text-[10px] text-[color:var(--vscode-foreground)]">
									{concern.task}
								</code>
							)}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
