# Tasks: localize-settings-descriptions

> 将 `package.nls.zh-cn.json` 中 11 项英文配置描述翻译为简体中文。
> 路径：`vscode-extensions/openspec-for-agent-main/package.nls.zh-cn.json`

## 1. 视图可见性配置（4 项）

- [x] **1.1** `config.desc.views_specs_visible` — 译为：「控制活动栏中 Specs 视图的可见性。」
- [x] **1.2** `config.desc.views_prompts_visible` — 译为：「控制活动栏中提示词视图的可见性。」
- [x] **1.3** `config.desc.views_steering_visible` — 译为：「控制活动栏中 Steering 视图的可见性。」
- [x] **1.4** `config.desc.views_settings_visible` — 译为：「控制活动栏中设置视图的可见性。」

## 2. 路径配置（2 项）

- [x] **2.1** `config.desc.copilot_specsPath` — 译为：「Copilot 规格文件的存储路径。」
- [x] **2.2** `config.desc.copilot_promptsPath` — 译为：「Copilot 提示词文件的存储路径。」

## 3. 自定义指令配置（5 项）

- [x] **3.1** `config.desc.customInstructions_global` — 译为：「追加到所有提示词的全局自定义指令。」
- [x] **3.2** `config.desc.customInstructions_createSpec` — 译为：「创建 Spec 时追加的自定义指令。」
- [x] **3.3** `config.desc.customInstructions_startAllTask` — 译为：「启动所有任务时追加的自定义指令。」
- [x] **3.4** `config.desc.customInstructions_archiveChange` — 译为：「归档变更时追加的自定义指令。」
- [x] **3.5** `config.desc.customInstructions_runPrompt` — 译为：「运行提示词时追加的自定义指令。」

## 4. 验证

- [x] **4.1** 确认 `package.nls.json`（英文默认）未被改动。
- [x] **4.2** 确认 `package.json` 中所有 `%config.desc.*%` 键名与 NLS 文件键名一一对应。
- [x] **4.3** 在 VS Code 显示语言为简体中文时，设置面板中 11 项配置描述显示为中文。
