# spec-explorer Specification

## Purpose
TBD - created by archiving change add-archive-change-command. Update Purpose after archive.
## Requirements
### Requirement: Context Menu
The context menu for changes SHALL include an option to archive the change.

#### Scenario: Archive Change includes custom instructions
- Given I am in the Specs view
- When I right-click on a change item
- And I select "Archive"
- Then the extension executes the archive prompt for that change
- And the prompt is sent using the "Archive Change" instruction context so the configured custom instruction is appended

### Requirement: Display Order
The Spec Explorer SHALL display "Changes" before "Current Specs".

#### Scenario: Default View
- Given the Spec Explorer is opened
- When the tree view is rendered
- Then "Changes" should appear before "Current Specs"

### Requirement: Create Detailed Design
The Spec Explorer SHALL provide a context menu command on change items to generate a detailed design document.

#### Scenario: Create Detailed Design
Given I am in the Specs view
And I right-click on a change item
When I select "Create Detailed Design"
Then the extension should ensure `detailed-design.md` exists under `openspec/changes/<change-id>/` (scaffold if missing)
And the extension should open `detailed-design.md` for editing
And Copilot Chat should be invoked using the prompt at `.github/prompts/openspec-create-detailed-design.prompt.md` plus the change documents as inputs
And I should paste the Copilot output into `detailed-design.md`

### Requirement: Prompt Bootstrapping
The system SHALL create `.github/prompts/openspec-create-detailed-design.prompt.md` with starter content if it does not already exist.

#### Scenario: Missing Prompt File
Given `.github/prompts/openspec-create-detailed-design.prompt.md` does not exist
When I run "Create Detailed Design" for a change
Then the system should create `.github/prompts/openspec-create-detailed-design.prompt.md`
And it should not overwrite the file on subsequent runs

### Requirement: Detailed Design Visibility
When `detailed-design.md` exists for a change, it SHALL be displayed in the Spec Explorer under that change and be openable.

#### Scenario: View Detailed Design
Given `openspec/changes/<change-id>/detailed-design.md` exists
When I expand the change item in the Specs view
Then I should see a "Detailed Design" document entry
And selecting it should open `detailed-design.md`

### Requirement: Update Specs Command
The Spec Explorer SHALL provide a context menu command on change items to update source documents from the detailed design.

#### Scenario: Trigger Update
Given a change item with an existing `detailed-design.md`
When I right-click the change item
Then I should see "Update Specs from Detailed Design" in the context menu
And it should be positioned after "Create Detailed Design"

#### Scenario: Execute Update
Given I have selected "Update Specs from Detailed Design"
Then the extension reads `detailed-design.md` and all source documents (`proposal.md`, `tasks.md`, `design.md`, `specs/**/spec.md`)
And sends a prompt to Copilot Chat instructing it to update the source documents based on the detailed design

#### Scenario: Missing Detailed Design
Given a change item without a `detailed-design.md`
When I try to run "Update Specs from Detailed Design"
Then I should see an error message indicating that the detailed design document is missing

### Requirement: Create GitHub Issue Command
The Spec Explorer SHALL provide a command to create a GitHub issue based on the selected change spec.

#### Scenario: User creates GitHub issue from change
- Given the user has the Specs view open
- And there is a change item listed
- When the user right-clicks on the change item
- Then a "Create GitHub Issue" option is available in the context menu
- When the user selects "Create GitHub Issue"
- Then a prompt is sent to Copilot Chat instructing it to create a GitHub issue for the change
- And the prompt references the `proposal.md`, `design.md`, `tasks.md`, and `detailed-design.md` (if present) of the change

### Requirement: Copy Name Command
The Spec Explorer SHALL provide a context menu command to copy the name of a change or spec item to the system clipboard.

#### Scenario: Copy Change Name
- Given I am in the Specs view
- And there is a change item (e.g., `add-copy-name-command`)
- When I right-click on the change item
- And I select "Copy Name"
- Then the change name (e.g., `add-copy-name-command`) is copied to the system clipboard
- And a notification confirms "Copied: add-copy-name-command"

#### Scenario: Copy Spec Name
- Given I am in the Specs view
- And there is a spec item under "Current Specs" (e.g., `spec-explorer`)
- When I right-click on the spec item
- And I select "Copy Name"
- Then the spec name (e.g., `spec-explorer`) is copied to the system clipboard
- And a notification confirms "Copied: spec-explorer"

#### Scenario: Paste Copied Name in Chat
- Given I have copied a change or spec name via "Copy Name"
- When I focus on Copilot Chat or any text input
- And I paste (Ctrl+V / Cmd+V)
- Then the copied name appears as plain text

### Requirement: Change Task Progress Indicator
The Spec Explorer SHALL display a task progress status indicator inline with each change item in the Changes group. The indicator is derived from the change's `tasks.md` file.

#### Scenario: Missing tasks.md
- Given a change is displayed in the Changes group
- And `openspec/changes/<change-id>/tasks.md` does not exist
- When the Changes group is rendered
- Then the change item shows a muted warning status indicator
- And the tooltip reads "No tasks.md found"

#### Scenario: tasks.md has no recognized task lines
- Given a change has `tasks.md`
- And the file contains no checkbox task lines (`- [ ]` or `- [x]`)
- When the Changes group is rendered
- Then the change item shows an empty/unknown status indicator
- And no percent value is displayed
- And the tooltip reads "tasks.md contains no recognized tasks"

#### Scenario: All tasks complete
- Given a change has `tasks.md`
- And every recognized task line is marked complete (`- [x]`)
- When the Changes group is rendered
- Then the change item shows a completed status indicator
- And the description shows "100%"
- And the tooltip reads "All tasks complete"

#### Scenario: Partial task completion
- Given a change has `tasks.md`
- And at least one task is complete and at least one is incomplete
- When the Changes group is rendered
- Then the change item shows an in-progress status indicator
- And the description shows `<floor(checked/total*100)>%`
- And the tooltip reads "<checked> of <total> tasks complete (<percent>%)"

#### Scenario: No tasks started
- Given a change has `tasks.md`
- And no task lines are marked complete
- When the Changes group is rendered
- Then the change item shows a not-started (0%) indicator
- And the description shows "0%"
- And the tooltip reads "0 of <total> tasks complete (0%)"

#### Scenario: Status refreshes after tasks.md changes
- Given the Spec Explorer is visible
- When `tasks.md` for a change is created, edited, or deleted
- Then the corresponding change row indicator updates automatically
- And no extension reload is required

### Requirement: 顶层 spec 节点点击行为

「Current Specs」分组下的顶层 spec 文档节点（路径形如 `openspec/specs/<name>/spec.md`）与 change 下的文档节点共用 `openspec-for-agent.spec.open` 命令入口。由于顶层 spec 不属于任何 change，系统 MUST 按路径类型分流：change 路径打开 change 面板，非 change 路径以 markdown 编辑器打开该文档。

#### Scenario: 点击顶层 spec 节点以编辑器打开

- **WHEN** 用户点击「Current Specs」分组下的 spec 文档节点
- **AND** 该节点路径形如 `openspec/specs/<name>/spec.md`（不含 `changes/` 段）
- **THEN** 系统 MUST 以 markdown 编辑器打开该 spec.md
- **AND** MUST NOT 打开 change 面板
- **AND** MUST NOT 出现标题为 `openspec`、文档全部缺失的空面板

#### Scenario: 点击 change 下文档节点仍打开面板

- **WHEN** 用户点击某变更下的文档节点（proposal/tasks/design/detailed-design/specs）
- **AND** 该节点路径含 `changes/` 段
- **THEN** 系统 MUST 打开对应变更的 change 面板
- **AND** 行为不受顶层 spec 分流逻辑影响

#### Scenario: 分流依据为路径是否含 changes 段

- **WHEN** `openspec-for-agent.spec.open` 命令收到 `relativePath`
- **THEN** 系统 MUST 用「路径是否匹配 `^(?:openspec\/)?changes\//`」判定走面板还是编辑器
- **AND** 判定逻辑 MUST 与 change 名提取用的 `CHANGES_PREFIX` 正则同源一致

