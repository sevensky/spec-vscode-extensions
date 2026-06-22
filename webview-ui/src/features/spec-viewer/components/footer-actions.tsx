import type { FooterActionEntry, FooterActionId } from "../types";
import { cn } from "@/lib/utils";

interface FooterActionsProps {
	actions: FooterActionEntry[];
	onAction: (id: FooterActionId) => void;
}

/**
 * footer 动作栏。按钮 catalog 由 extension 侧按状态计算后推送（单一来源契约），
 * webview 只负责渲染 + 点击派发 id。对齐 speckit-companion 的 footerAction 模型。
 */
export function FooterActions({ actions, onAction }: FooterActionsProps) {
	if (actions.length === 0) return null;

	return (
		<footer className="flex items-center justify-end gap-2 border-t border-[color:color-mix(in_srgb,var(--vscode-foreground)_12%,transparent)] pt-3">
			{actions.map((action) => (
				<button
					key={action.id}
					type="button"
					onClick={() => onAction(action.id)}
					className={cn(
						"rounded px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
						action.variant === "primary"
							? "bg-[color:var(--vscode-button-background)] text-[color:var(--vscode-button-foreground)] hover:bg-[color:var(--vscode-button-hoverBackground)]"
							: "border border-[color:color-mix(in_srgb,var(--vscode-foreground)_20%,transparent)] text-[color:var(--vscode-foreground)] hover:bg-[color:color-mix(in_srgb,var(--vscode-foreground)_8%,transparent)]"
					)}
				>
					{action.label}
				</button>
			))}
		</footer>
	);
}
