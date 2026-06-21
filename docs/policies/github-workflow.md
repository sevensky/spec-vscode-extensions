# GitHub Workflow Policy

## 认证现状（事实，勿质疑）

- gh CLI 已用 fine-grained PAT 登录为 `sevensky`，对 `sevensky/spec-vscode-extensions` 是 **ADMIN**。
- `origin` = `sevensky/spec-vscode-extensions`，所有 PR/合并都在此仓库操作。
- `upstream` = `atman-33/openspec-for-copilot`（上游，仅同步用）。

## 已知坑：别用 `gh pr create` / `gh pr merge`

这些命令底层走 **GraphQL mutation**（`createPullRequest` / `mergePullRequest`），会被 fine-grained PAT 拒，报 `Resource not accessible by personal access token`。

**这不是权限问题** —— 不要建议用户换 token、改权限、重登。这是 fine-grained PAT 对 GraphQL mutation 与 REST 端点的已知行为差异。直接改用 REST API：

```bash
# 开 PR
gh api repos/sevensky/spec-vscode-extensions/pulls \
  -f title="<title>" \
  -f head="<branch>" \
  -f base="main" \
  -f body=@<body-file>

# 合并（squash）
gh api -X PUT repos/sevensky/spec-vscode-extensions/pulls/<N>/merge \
  -f merge_method="squash" \
  -f commit_title="<title> (#<N>)"
```

- auto-merge 未启用 + main 无分支保护 → 直接手动 squash merge，别试 `enablePullRequestAutoMerge`。

## 提交规范

- 按语义分组提交，每个提交一个独立主题：
  - `feat`: 新功能
  - `refactor`: 重构（不改外部行为）
  - `chore`: 构建/工具/依赖
  - `docs`: 文档
  - `style`: 纯格式化
- 开发分支命名：`feature/*`，经 PR 合入 `main`。

## pre-commit hook 注意

- husky + Biome pre-commit hook 存在存量 lint 报错（无效的 `nursery/*` suppression、构造函数复杂度超限），与改动无关 → 用 `git commit --no-verify`。
- hook 执行时 Biome `--write` 会把格式化写回磁盘，导致提交后出现**纯格式化的残留 diff**。提交完检查 `git status`，若有这类残留单独归到一个 `style:` 提交，保持工作区干净。
