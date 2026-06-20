import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "vscode";

/** 改 env.language（绕过 readonly 类型，测试专用） */
function setLanguage(lang: string): void {
	// @ts-expect-error 测试中强制改写 readonly 的 language
	env.language = lang;
}

describe("i18n t()", () => {
	beforeEach(() => {
		setLanguage("en");
	});

	it("returns English text for English locale", async () => {
		const { t } = await import("./index");
		expect(t("common.noWorkspace")).toBe("No workspace folder found");
	});

	it("returns Chinese text for zh-cn locale", async () => {
		setLanguage("zh-cn");
		const { t } = await import("./index");
		expect(t("common.noWorkspace")).toBe("未找到工作区文件夹");
	});

	it("falls back to English value when key exists in both locales (parity check)", async () => {
		setLanguage("zh-cn");
		const { t } = await import("./index");
		// 验证中文 locale 下确实取到中文
		expect(t("common.cancel")).toBe("取消");
	});

	it("supports {placeholder} interpolation", async () => {
		const { t } = await import("./index");
		expect(t("error.failed", { msg: "boom" })).toBe("Failed: boom");
	});

	it("supports multiple {placeholder} interpolation", async () => {
		setLanguage("zh-cn");
		const { t } = await import("./index");
		expect(t("treeview.tasksProgress", { checked: 3, total: 5, percent: 60 })).toBe(
			"3/5 个任务已完成（60%）",
		);
	});

	it("returns key itself when key not found in any locale", async () => {
		const { t } = await import("./index");
		expect(t("nonexistent.key.surely")).toBe("nonexistent.key.surely");
	});

	it("treats zh-tw and zh-hans as zh-cn", async () => {
		const { t } = await import("./index");
		for (const lang of ["zh-tw", "zh-Hans", "zh"]) {
			setLanguage(lang);
			expect(t("common.ok")).toBe("确定");
		}
	});

	it("falls back to en for unknown language", async () => {
		setLanguage("fr");
		const { t } = await import("./index");
		expect(t("common.ok")).toBe("OK");
	});
});
