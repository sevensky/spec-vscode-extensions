## 背景

本扩展（`openspec-for-agent`，包名 `openspec-for-agent`）当前是 Copilot Chat 专属的 spec 操作工具：点击树节点打开 markdown 文件，动作经 `chat-prompt-runner.ts` 走 `workbench.action.chat.open` 送给 Copilot Chat。上一个变更 `multi-agent-command-paths` 已扩展 agent 类型（trae/codebuddy/claude/copilot）和路径映射，但桥接仍只走 Chat API。

参考项目 speckit-companion（`speckit-companion` v0.24.0）已验证一套成熟架构：富 WebviewPanel（`SpecViewerProvider`）+ 状态桥梁 `.spec-context.json`（`specContextManager`）+ 多 provider 终端桥接（`aiProviderFactory` 含 10 个 provider）。本设计借鉴其架构，但针对本项目的约束做减法。

实测事实（立项依据）：
- **claude CLI**（`@anthropic-ai/claude-code`）、**codebuddy CLI**（`@tencent-ai/codebuddy-code`）、**trae-cli**（v0.120.40，`https://trae.cn/trae-cli/install.sh`）三者接口同构：`[prompt] -p/--print` 非交互、交互会话模式一致。codebuddy 别名 `cbc`，trae-cli 别名 `traecli`/`ta`。
- **zcode**（`/root/.zcode/server/zcode-server.cjs` v3.1.2）是 **stdio JSON 协议的 server**（hello/hello-ack 握手机制），不接受 `[prompt]` 命令行参数，**与终端派 CLI 协议不兼容**——预留接口，低优先级。将来若要支持需走 stdio 客户端（扩展作为 zcode-server 的协议客户端），属第三类 provider，不在本次范围。
- **openspec CLI**（1.4.2）+ opsx command 已存在且工作良好，扩展复用（模式 A），不重造。

约束：
- `.openspec.yaml` 是 openspec CLI 的元数据文件（schema/created），仅 CLI 读写。扩展状态另起文件，不污染它。
- 扩展跑在 VSCode 变体内（含 trae/codebuddy 的 remote server 形态），`executeInTerminal`/`sendText` 可用。

## 目标 / 非目标

**目标：**
- 点击树节点打开富 Webview 面板，展示变更全貌（文档/step/status/历史），按钮驱动流程。
- 引入 `.spec-context.json` 状态桥梁，作为面板刷新与 provider 编排的单一来源。
- 终端派 provider（claude/codebuddy/trae 预留/zcode 预留）经标准终端送指令，与 Copilot Chat 派并存。
- 终端派按接口同构性用单一基类实现，避免 speckit 式的每家一个 provider 文件。

**非目标：**
- 不改动 openspec CLI 或 opsx command（模式 A）。
- 不实现 trae/zcode 的真实桥接（仅预留接口，因其无 CLI 入口）。
- 不重写 Copilot Chat 派（保留现有 `chat-prompt-runner` 逻辑，并入 provider 抽象即可）。
- 不追求 speckit 的全部 62 个命令覆盖——聚焦 spec 浏览/状态/生命周期核心动作。

## 关键决策

### D1：三层架构（UI / 状态 / 桥接）

```
┌─────────────────────────────────────────────────────────────┐
│  UI 层                                                       │
│  · spec-explorer-provider（增强：点击→富面板）               │
│  · spec-viewer/ SpecViewerProvider（新，WebviewPanel）       │
│    - viewerState: 文档内容 + step/status/history             │
│    - 按钮：由 status 驱动可见性                              │
│    - 监听 .spec-context.json 变化自动刷新                    │
├─────────────────────────────────────────────────────────────┤
│  状态层                                                      │
│  · spec-context/ SpecContextManager（新）                    │
│    - 读写 .spec-context.json                                 │
│    - 文件监听（FileSystemWatcher）                           │
│    - prompt preamble 生成（让 agent 更新状态）               │
│    - 文件兜底校验（proposal.md/tasks.md 变化推断 step）      │
├─────────────────────────────────────────────────────────────┤
│  桥接层                                                      │
│  · agent-providers/ AgentProvider 抽象                       │
│    - 终端派：CliAgentProvider(binary) 基类                   │
│      · claude: new CliAgentProvider('claude')                │
│      · codebuddy: new CliAgentProvider('cbc')                │
│      · trae/zcode: 预留（binary 待定，接口同）               │
│    - Chat 派：CopilotProvider（保留现有）                    │
│  · buildPrompt: 动作 → /opsx:xxx + preamble → provider       │
└─────────────────────────────────────────────────────────────┘
```

三层解耦：UI 只读状态层、调桥接层；状态层是单一真相源；桥接层 provider 可换。

### D2：`.spec-context.json` 结构与职责

```json
{
  "step": "plan",
  "status": "active",
  "history": [
    { "step": "propose", "status": "completed", "at": "2026-06-21T10:00:00Z", "agent": "claude" },
    { "step": "plan", "status": "started", "at": "2026-06-21T10:05:00Z", "agent": "claude" }
  ],
  "agent": "claude"
}
```

- `step`：当前所处阶段（propose/design/specs/tasks/apply/archive，对齐 openspec 工件 + opsx 命令）。
- `status`：active/completed/archived（对齐 speckit 的状态机）。
- `history`：动作记录，供面板展示与兜底校验。
- `agent`：当前使用的 agent（决定 preamble 里指示谁更新）。

**谁读写**：扩展在动作开始时写 `step/status`；agent 经 preamble 指示在完成时追加 `history`；兜底校验器读 openspec 工件文件变化修正 `step`。

### D3：状态同步机制——preamble 主导 + 文件兜底（混合，方案 Z）

```
扩展触发动作（如"开始 plan"）
  │
  ├─ 1. buildPrompt: 组装
  │     /opsx:new <change> + preamble（"完成后更新 .spec-context.json 的 step=plan, status=completed"）
  │
  ├─ 2. SpecContextManager: 立即写 step=plan, status=started（乐观更新）
  │
  ├─ 3. provider.executeInTerminal(prompt) → 终端跑
  │
  ├─ 4. agent 执行完，听 preamble 的话 → 追加 history（主路径）
  │
  └─ 5. FileSystemWatcher 监到 .spec-context.json 变化 → 刷新面板
       │
兜底：若 agent 没听话（step 没推进），文件校验器检测到
      plan.md/design.md 等工件生成 → 修正 step（方案 Z 的兜底）
```

**取舍**：preamble 驱动是主路径（体验最顺，agent 完成即更新）；文件兜底处理"agent 不听话"的边缘情况。两者都写，但文件校验作为 `status=started` 超时后的修正手段，不实时跑。

### D4：终端派 provider 用基类实现（不学 speckit 的 11 个文件）

speckit 因各家 CLI 差异大写了 10 个 provider 文件。本项目 claude/codebuddy 实测接口同构，用基类：

```typescript
// 抽象：所有 agent provider 的接口
interface AgentProvider {
  executeInTerminal(prompt: string, title: string): Promise<void>;
  readonly type: 'terminal' | 'chat';
}

// 终端派基类：binary 不同，逻辑同
class CliAgentProvider implements AgentProvider {
  readonly type = 'terminal';
  constructor(private binary: string) {}  // 'claude' | 'cbc' | ...
  async executeInTerminal(prompt: string, title: string) {
    const terminal = vscode.window.createTerminal({ name: title });
    terminal.show();
    terminal.sendText(`${this.binary} ${prompt}`);
  }
}

// 工厂
const providers = {
  claude: new CliAgentProvider('claude'),
  codebuddy: new CliAgentProvider('cbc'),
  trae: new CliAgentProvider('trae-cli'), // 别名 traecli/ta，接口同构
  zcode: new CliAgentProvider('zcode'),   // 预留，低优先级（无 CLI）
  'github-copilot': new CopilotProvider(), // Chat 派，保留现有
};
```

trae-cli/claude/codebuddy 装了即可用；zcode 目前无 CLI，`executeInTerminal` 会失败——基类加 binary 存在性检查，缺失时降级提示"该 agent 的 CLI 未安装"。

### D5：buildPrompt 组装规则

```
动作（按钮/右键）→ buildPrompt(changeDir, action, agent)
  = preamble(agent, action)
  + "\n\n"
  + command(action, changeDir)

其中：
  command(action, changeDir) = `/opsx:<action> <changeDir相对路径>`
    例：/opsx:new user-auth / /opsx:apply user-auth
  preamble(agent, action) = 指示 agent：
    "你正在为变更 <changeDir> 执行 <action>。
     完成后请更新 .spec-context.json：step=<next>, status=<相应值>。
     只更新该变更的 .spec-context.json，勿动其他变更目录。"
```

preamble 模板存配置，可按 agent 微调（不同 agent 听话程度不同）。

## 风险 / 权衡

| 风险 | 影响 | 缓解 |
|---|---|---|
| preamble 驱动依赖 agent 听话 | agent 不更新 bridge → 状态停滞 | 文件兜底校验（D3）；status=started 超时触发 |
| zcode 协议不兼容（stdio server，非终端 CLI） | 终端派 sendText 无法送指令 | 预留接口 + 降级提示"zcode 为 server 架构，暂不支持终端派"；将来需 stdio 客户端 provider（第三类，本次不做） |
| 富面板工程量大 | 开发周期长 | 拆分迭代：先文档展示，再按钮动作，再多面板 |
| .spec-context.json 与 .openspec.yaml 并存 | 用户混淆两文件 | 职责文档化；.openspec.yaml 不动，bridge 是扩展专属 |
| 终端会话状态难追踪 | 不知道 agent 跑完没 | 不依赖终端返回值；靠 bridge.json 文件变化感知（D3） |

## 迁移计划

**上线步骤**（建议迭代）：
1. **迭代一：状态桥梁**。先做 `.spec-context.json` + SpecContextManager + 文件监听，不依赖面板。命令行手动测读写。
2. **迭代二：终端派 provider**。做 CliAgentProvider 基类 + claude/codebuddy，buildPrompt 组装，用现有命令触发验证终端送指令。
3. **迭代三：富面板**。做 SpecViewerProvider，接状态层，展示文档+状态+按钮。
4. **迭代四：树点击改造**。点击从开文件改触发面板，右键保留开文件。
5. **迭代五：Copilot 派并入抽象**。把 chat-prompt-runner 重构进 provider 抽象，保持行为不变。

**回滚**：各迭代独立，面板/provider/状态互不强依赖。任一层可单独回滚（回滚面板则点击恢复开文件，状态层和 provider 不受影响）。

**兼容性**：Copilot Chat 派行为不变（用户选 github-copilot 时走原路径）；`.openspec.yaml` 不动。

## 待确认问题

1. **.spec-context.json 放哪**：**决定**——放每个 change 目录内（`openspec/changes/<name>/.spec-context.json`），与 speckit 一致，状态随变更走。
2. **preamble 是否多语言**：**决定**——用英文。agent 对英文指令听话度更稳定，且 preamble 是机器指令非用户可见文案。
3. **富面板技术选型**：**决定**——参考 speckit 做法（纯 HTML/JS，不引入框架），避免构建复杂度。
4. **trae 是否有 CLI 入口**：**已确认**——trae-cli v0.120.40 存在（`https://trae.cn/trae-cli/install.sh`），接口与 claude/codebuddy 同构（`[prompt] -p`），binary 名 `trae-cli`（别名 traecli/ta）。已从"预留"升级为可直接实现的第四个终端派 provider。
