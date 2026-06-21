# Delta Spec: prompt-generation

## MODIFIED Requirements

### Requirement: Dynamic Prompt Loading
The system MUST read the content of the agent-specific command file when generating prompts. The file path and name are determined by the configured `aiAgent` setting.

#### Scenario: github-copilot agent
- Given the `aiAgent` setting is `github-copilot`
- When the user triggers a prompt operation (propose/apply/archive)
- Then the system reads `.github/prompts/opsx-{id}.prompt.md` from the workspace root
- Where `{id}` is `propose`, `apply`, or `archive`

#### Scenario: github-copilot legacy fallback
- Given the `aiAgent` setting is `github-copilot`
- And the v1 file `.github/prompts/opsx-{id}.prompt.md` does not exist
- And the legacy file `.github/prompts/openspec-{legacyId}.prompt.md` exists
- When the user triggers a prompt operation
- Then the system reads the legacy file
- And shows a deprecation warning guiding the user to migrate

#### Scenario: claude agent
- Given the `aiAgent` setting is `claude`
- When the user triggers a prompt operation
- Then the system reads `.claude/commands/opsx/{id}.md` from the workspace root

#### Scenario: trae agent
- Given the `aiAgent` setting is `trae`
- When the user triggers a prompt operation
- Then the system reads `.trae/commands/opsx/{id}.md` from the workspace root

#### Scenario: codebuddy agent
- Given the `aiAgent` setting is `codebuddy`
- When the user triggers a prompt operation
- Then the system reads `.codebuddy/commands/opsx/{id}.md` from the workspace root

#### Scenario: File does not exist
- Given the agent-specific command file does not exist
- When the user triggers a prompt operation
- Then the system throws a migration error
- And the error message includes the agent name and the required file path
- And the error message guides the user to run `openspec init`

### Requirement: Agent-Specific Migration Error
The system MUST produce a migration error message tailored to the configured agent when the command file is missing.

#### Scenario: trae migration error
- Given the `aiAgent` setting is `trae`
- And the file `.trae/commands/opsx/propose.md` does not exist
- When the user triggers the "Create Spec" operation
- Then the error message contains `trae`
- And the error message contains `Required: .trae/commands/opsx/propose.md`

## ADDED Requirements

### Requirement: Agent Command Path Configuration
The system MUST maintain a mapping from each supported `AiAgent` to its command directory, v1 filename pattern, and optional legacy filename pattern.

#### Scenario: All agents have command configs
- Given the supported agents are `github-copilot`, `codex`, `claude`, `trae`, `codebuddy`
- When the system looks up the command config for any agent
- Then it returns a config with `dir` (directory segments), `v1Filename` (filename builder)
- And only `github-copilot` has a `legacyFilename` builder
