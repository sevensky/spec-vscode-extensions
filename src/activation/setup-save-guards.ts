import type { ExtensionContext } from "vscode";
import { window, workspace } from "vscode";
import { t } from "../i18n";

export const setupSaveGuards = (context: ExtensionContext) => {
	context.subscriptions.push(
		workspace.onWillSaveTextDocument(async (event) => {
			const document = event.document;
			const filePath = document.fileName;

			if (filePath.includes(".copilot/agents/") && filePath.endsWith(".md")) {
				const saveLabel = t("common.save");
				const result = await window.showWarningMessage(
					t("steering.saveGuard"),
					{ modal: true },
					saveLabel,
					t("common.cancel")
				);

				if (result !== saveLabel) {
					// Cancel the save operation by waiting forever
					// biome-ignore lint/suspicious/noEmptyBlockStatements: ignore
					event.waitUntil(new Promise(() => {}));
				}
			}
		})
	);
};
