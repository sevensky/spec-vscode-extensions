import { en } from "./locales/en";
import { zhCn } from "./locales/zh-cn";

/**
 * webview 侧 i18n（独立 bundle，不复用 host 的 i18n）。
 * locale 由 host 通过 HTML data-locale 属性传入（vscode.env.language）。
 */
type Locale = "en" | "zh-cn";

const dictionaries: Record<Locale, Record<string, string>> = {
	en,
	"zh-cn": zhCn,
};

/** 从 HTML data-locale 属性初始化（index.tsx 调用 setLocale） */
let currentLocale: Locale = "en";

export function setLocale(lang: string): void {
	currentLocale = lang.toLowerCase().startsWith("zh") ? "zh-cn" : "en";
}

export function getLocale(): Locale {
	return currentLocale;
}

export function t(key: string, params?: Record<string, string | number>): string {
	const dict = dictionaries[currentLocale];
	const enDict = dictionaries.en;

	let raw = dict[key] ?? enDict[key] ?? key;

	if (params) {
		for (const [k, v] of Object.entries(params)) {
			raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
		}
	}

	return raw;
}
