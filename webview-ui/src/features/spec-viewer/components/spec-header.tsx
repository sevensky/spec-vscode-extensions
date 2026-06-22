import type { SpecStatus } from "../types";
import { cn } from "@/lib/utils";

interface SpecHeaderProps {
	changeName: string;
	status: SpecStatus;
	step: string;
	agent: string;
}

const STATUS_LABEL: Record<SpecStatus, string> = {
	active: "进行中",
	completed: "已完成",
	archived: "已归档",
};

const STATUS_CLASS: Record<SpecStatus, string> = {
	active:
		"bg-[color:var(--vscode-badge-background)] text-[color:var(--vscode-badge-foreground)]",
	completed: "bg-[color:color-mix(in_srgb,#22c55e_22%,transparent)] text-[#22c55e]",
	archived:
		"bg-[color:color-mix(in_srgb,var(--vscode-disabledForeground)_22%,transparent)] text-[color:var(--vscode-disabledForeground)]",
};

/** 标题区：变更名 + status 徽章 + step/agent 次要信息。 */
export function SpecHeader({ changeName, status, step, agent }: SpecHeaderProps) {
	return (
		<header className="flex flex-wrap items-center gap-3 pb-3 border-b border-[color:color-mix(in_srgb,var(--vscode-foreground)_12%,transparent)]">
			<h1 className="text-lg font-semibold text-[color:var(--vscode-foreground)]">
				{changeName}
			</h1>
			<span
				className={cn(
					"rounded px-2 py-0.5 text-xs font-medium",
					STATUS_CLASS[status]
				)}
			>
				{STATUS_LABEL[status]}
			</span>
			<span className="text-xs text-[color:var(--vscode-descriptionForeground)]">
				{step} · {agent}
			</span>
		</header>
	);
}
