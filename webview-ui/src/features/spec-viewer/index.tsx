import { useEffect, useState } from "react";
import { vscode } from "@/bridge/vscode";
import type {
	DocType,
	FooterActionId,
	InboundMessage,
	ViewerPayload,
} from "./types";
import { SpecHeader } from "./components/spec-header";
import { NavigationBar } from "./components/navigation-bar";
import { MarkdownContent } from "./components/markdown-content";
import { FooterActions } from "./components/footer-actions";
import { ActivityTimeline } from "./components/activity-timeline";

/**
 * spec-viewer React 面板主组件。
 *
 * 数据流：
 *   - extension → webview: {command:'state', payload} 推送完整 ViewerPayload
 *   - webview → extension: ready / switchDoc / footerAction / refreshContent
 *
 * changeName 等全部状态由 payload 持有，webview 不自行解析路径。
 */
export function SpecViewer() {
	const [payload, setPayload] = useState<ViewerPayload | null>(null);

	useEffect(() => {
		const listener = (event: MessageEvent) => {
			const msg = event.data as InboundMessage;
			if (msg?.command === "state" && msg.payload) {
				setPayload(msg.payload);
			}
		};
		window.addEventListener("message", listener);
		// 握手：通知 extension 面板已就绪，请求初始状态
		vscode.postMessage({ command: "ready" });
		return () => window.removeEventListener("message", listener);
	}, []);

	if (!payload) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-[color:var(--vscode-descriptionForeground)]">
				加载中…
			</div>
		);
	}

	const currentDocEntry = payload.docs.find((d) => d.type === payload.currentDoc);

	const handleSwitch = (docType: DocType) => {
		vscode.postMessage({ command: "switchDoc", docType });
	};

	const handleAction = (id: FooterActionId) => {
		vscode.postMessage({ command: "footerAction", id });
	};

	return (
		<div className="mx-auto flex h-full max-w-5xl flex-col gap-4 px-4 py-3">
			<SpecHeader
				changeName={payload.changeName}
				status={payload.status}
				step={payload.step}
				agent={payload.agent}
			/>
			<NavigationBar
				docs={payload.docs}
				currentDoc={payload.currentDoc}
				onSwitch={handleSwitch}
			/>
			<div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
				<main className="min-w-0 flex-1 overflow-auto py-2">
					<MarkdownContent doc={currentDocEntry} />
				</main>
				<ActivityTimeline history={payload.history} />
			</div>
			<FooterActions actions={payload.footer} onAction={handleAction} />
		</div>
	);
}
