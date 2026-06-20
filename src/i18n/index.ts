import { env } from "vscode";
import { en } from "./locales/en";
import { zhCn } from "./locales/zh-cn";

/**
 * 轻量 i18n 模块（host 侧）。
 *
 * 语言源：vscode.env.language（VS Code 显示语言）。
 * UI 语言跟随 VS Code locale，与 chatLanguage（AI 回复语言）独立。
 *
 * 用法：
 *   t("common.noWorkspace")                          // 静态
 *   t("error.createPromptFailed", { msg: e.message }) // 插值 {msg}
 *
 * 不引入 i18next/vscode-nls，t() 自带 {placeholder} 替换。
 */

type Locale = "en" | "zh-cn";

const dictionaries: Record<Locale, Record<string, string>> = {
	en,
	"zh-cn": zhCn,
};

/**
 * 当前 UI locale。读 vscode.env.language（如 "zh-cn"、"en"）。
 * 未知语言回退英文。
 */
export function getCurrentLocale(): Locale {
	const lang = env.language.toLowerCase();
	// VS Code 中文变体：zh-cn / zh-tw / zh-hans 等，统一映射 zh-cn（仅简体）
	if (lang.startsWith("zh")) {
		return "zh-cn";
	}
	return "en";
}

/**
 * 翻译查找。支持 {placeholder} 插值。
 * key 不存在时回退英文，英文也没有则返回 key 本身（避免空白）。
 */
export function t(key: string, params?: Record<string, string | number>): string {
	const locale = getCurrentLocale();
	const dict = dictionaries[locale];
	const enDict = dictionaries.en;

	let raw = dict[key] ?? enDict[key] ?? key;

	if (params) {
		for (const [k, v] of Object.entries(params)) {
			raw = raw.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
		}
	}

	return raw;
}
