<!-- SOFTWARE DEVELOPMENT POLICIES:START -->
# Software Development Policies

- `docs/policies/development-policy.md`: Coding standards, branch strategy, commit message conventions, and more
- `docs/policies/testing-policy.md`: Testing strategy, coverage targets
- `docs/policies/review-policy.md`: Code review criteria, checklists
- `docs/policies/deployment-policy.md`: Deployment procedures, CI/CD pipeline
- `docs/policies/github-workflow.md`: GitHub auth facts, PR/merge via REST API, commit conventions, pre-commit hook notes

## 版本号规则（重要）

**功能分支/功能提交永远不碰 `package.json` 的 `version` 字段。** 不要在 feat/fix/chore 提交里手改版本号（即使为了打 vsix——用当前版本号打即可，发版时再 bump）。

版本号的唯一来源是 GitHub Actions 的 `Version Bump` workflow（手动触发，选 patch/minor/major），它负责改 package.json + 打 tag + 触发 release。

如果用户要求"打个 vsix 看看"之类，直接用现有 version 号打包，**不要自作主张递增版本号**。

<!-- SOFTWARE DEVELOPMENT POLICIES:END -->
