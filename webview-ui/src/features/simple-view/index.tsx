import sampleGif from "@/assets/sample.gif";
import { t } from "@/i18n";

export const SimpleView = () => (
	<div className="px-3 py-0.5">
		<h1 className="font-semibold text-[color:var(--vscode-foreground)] text-xl leading-tight">
			{t("simple.title")}
		</h1>
		<p className="text-[color:var(--vscode-descriptionForeground,rgba(255,255,255,0.65))] text-sm">
			{t("simple.description")}
		</p>
		<img
			alt="Animated sample preview"
			height="300"
			src={sampleGif}
			width="300"
		/>
	</div>
);
