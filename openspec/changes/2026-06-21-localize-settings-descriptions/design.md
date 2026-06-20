# Design: localize-settings-descriptions

## 背景

VS Code 扩展的设置面板文案通过 `package.nls.json`（默认英文）和 `package.nls.{locale}.json`（区域语言包）实现本地化。`package.json` 中用 `%key%` 占位符引用，VS Code 根据当前显示语言选择对应的 NLS 文件。

当前 `package.nls.zh-cn.json` 已翻译命令标题（`command.title.*`）和 2 项配置描述（`aiAgent`、`chatLanguage`），但 11 项 `config.desc.*` 仍为英文原文。

## 方案

直接在 `package.nls.zh-cn.json` 中将 11 项英文值替换为中文译文。不新增/删除键，不改 `package.json`，不改英文默认 `package.nls.json`。

## 译文原则

- 与已翻译的 `src/i18n/locales/zh-cn.ts` 术语保持一致（如「提示词」「Spec」「Steering」）。
- 保持简洁，符合 VS Code 设置面板描述风格（一句话说明用途）。
- 配置键名、枚举值不翻译（如 `github-copilot`、`claude`）。

## 非目标

- 不翻译 `src/i18n/locales/` 运行时字典（已在 `chinese-localization` spec 覆盖）。
- 不翻译 webview UI 文案（webview 有独立字典，不在本次范围）。
- 不改动配置项的键名、类型、默认值、枚举。

## 风险

- 无功能风险：NLS 文件仅影响显示文案。
- 术语一致性风险：已对照 `zh-cn.ts` 核对术语，无冲突。
