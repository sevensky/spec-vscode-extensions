interface DecisionsCardProps {
	decisions: string[];
}

/** 关键决策卡片 */
export function DecisionsCard({ decisions }: DecisionsCardProps) {
	if (!decisions || decisions.length === 0) return null;
	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				关键决策
			</h3>
			<ul className="space-y-1.5 text-sm">
				{decisions.map((decision, idx) => (
					<li key={`decision-${idx}`} className="flex gap-2">
						<span className="text-[color:var(--vscode-descriptionForeground)]">▸</span>
						<span className="text-[color:var(--vscode-foreground)]">{decision}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
