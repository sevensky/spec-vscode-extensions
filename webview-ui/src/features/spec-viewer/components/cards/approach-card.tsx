interface ApproachCardProps {
	approach: string;
}

/** 方案概述卡片 */
export function ApproachCard({ approach }: ApproachCardProps) {
	if (!approach) return null;
	return (
		<div className="rounded-lg border border-[color:var(--vscode-panel-border)] bg-[color:var(--vscode-editor-background)] p-3">
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--vscode-descriptionForeground)]">
				方案概述
			</h3>
			<p className="text-sm leading-relaxed text-[color:var(--vscode-foreground)]">
				{approach}
			</p>
		</div>
	);
}
