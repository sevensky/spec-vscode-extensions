## Why

扩展的 `package.nls.zh-cn.json`（简体中文语言包）中，11 项配置描述仍为英文原文。当 VS Code 显示语言为简体中文时，设置面板里这些配置项的说明没有本地化，与已翻译的命令标题、`aiAgent`、`chatLanguage` 描述不一致，影响中文用户体验。

## What Changes

- 将 `package.nls.zh-cn.json` 中 11 项仍为英文的 `config.desc.*` 描述翻译为简体中文。
- 涉及的配置项：
  - `views.specs.visible` / `views.prompts.visible` / `views.steering.visible` / `views.settings.visible`（视图可见性，4 项）
  - `copilot.specsPath` / `copilot.promptsPath`（路径配置，2 项）
  - `customInstructions.global` / `createSpec` / `startAllTask` / `archiveChange` / `runPrompt`（自定义指令，5 项）
- 不改动 `package.nls.json`（英文默认）和 `package.json`（键名不变）。
- 不改动 `src/i18n/locales/` 下的运行时字典（本次仅针对 VS Code 设置面板的 NLS 资源）。

## Capabilities

### Modified Capabilities
- `chinese-localization`: 扩展中文化范围从运行时文案补齐到 VS Code 设置面板的配置描述。

## Impact

- 仅影响 `package.nls.zh-cn.json` 一个文件。
- 不影响任何运行时逻辑、配置键名、默认值。
- 无破坏性变更：英文用户不受影响（`package.nls.json` 不变）。
