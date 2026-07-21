# configuration Specification

## Purpose
Defines the user-configurable settings for the OpenSpec for Agent extension, including paths, AI agent selection, chat language, and custom instructions.

## Requirements
### Requirement: Configure Paths
The user MUST be able to configure the workspace-relative paths for specs and prompts via VS Code settings.

#### Scenario: Default Paths
- Given the user has not modified the extension settings
- When they check the settings
- Then `openspec-for-agent.agent.specsPath` should be `openspec`
- And `openspec-for-agent.agent.promptsPath` should be `.agent/prompts`

#### Scenario: Custom Paths
- Given the user opens VS Code settings
- When they set `openspec-for-agent.agent.promptsPath` to `.trae/prompts`
- Then the extension reads prompts from `.trae/prompts` in the workspace

#### Scenario: Legacy Configuration Fallback
- Given the user has an old configuration with `openspec-for-agent.copilot.promptsPath` set
- And they have not set `openspec-for-agent.agent.promptsPath`
- When the extension reads the prompts path
- Then it MUST fall back to the legacy `copilot.promptsPath` value

### Requirement: Configure Chat Language
The user MUST be able to select their preferred language for AI agent chat interactions via VS Code settings.

#### Scenario: Default Setting
- Given the user has not modified the extension settings
- When they check the `openspec-for-agent.chatLanguage` setting
- Then the value should be `English`

#### Scenario: Change to Chinese
- Given the user opens VS Code settings
- When they search for "OpenSpec Chat Language"
- And they select "Chinese (Simplified)" from the dropdown
- Then the setting `openspec-for-agent.chatLanguage` is updated to `Chinese (Simplified)`

#### Scenario: Support Multiple Languages
- The setting should support a list of common languages including but not limited to:
  - English
  - Chinese (Simplified)
  - Russian
  - Spanish
  - French
  - German

### Requirement: Global Custom Instruction Setting
The extension MUST provide a configuration setting for a global custom instruction that applies to all prompts.

#### Scenario: User configures global instruction
- Given the user opens VS Code settings
- When they search for "openspec custom instructions"
- Then they see a "Global" setting
- And they can enter a multiline string

### Requirement: Specific Custom Instruction Settings
The extension MUST provide configuration settings for specific custom instructions for "Create Spec", "Start All Task", "Archive Change", and "Run Prompt".

#### Scenario: User configures specific instructions including Archive Change
- Given the user opens VS Code settings
- When they search for "openspec custom instructions"
- Then they see settings for "Create Spec", "Start All Task", "Archive Change", and "Run Prompt"
- And "Archive Change" appears immediately after "Start All Task"
- And they can enter multiline strings for each

