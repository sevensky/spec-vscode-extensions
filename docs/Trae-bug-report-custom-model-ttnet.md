# Bug Report: 自定义模型 Remote-SSH 模式下请求失败（已定位并找到 Workaround）

## 环境

| 项 | 值 |
|---|---|
| Trae 版本 | 3.3.68 (stable) |
| 构建时间 | 2026-06-18T07:09:21.837Z |
| vscode_version | 1.107.1 |
| 操作系统 | Windows 11 Pro (客户端) → Linux 5.15.152-7.5.ve2.x86_64 (远程服务器) |
| 连接方式 | Remote-SSH |
| Server 架构 | x86_64, debian10 |
| 自定义模型 | bigmodel-plan//glm-5.1 (智谱 GLM) |
| ai-agent 版本 | build 2.3.44175, stable |
| 代理 | mihomo-tui, mixed-port 7892, socks-port 7891 |

## 问题描述

在 Remote-SSH 模式下使用自定义模型（如智谱 GLM）发送聊天提示词后，UI 卡在"召回上下文"状态，永远不会收到回复或错误提示。自带模型不受影响，在 Windows 本地使用自定义模型也正常。

## 根因（已验证）

**系统代理环境变量（`http_proxy`/`https_proxy`）干扰了 ai-agent 的 Cronet/TTNet 网络栈连接建立。**

### 详细分析

1. ai-agent (Rust 二进制) 的 `AhaNetHTTPClient` 使用 Cronet（Chromium 网络栈）发请求
2. Cronet **会读取系统 `http_proxy`/`https_proxy` 环境变量**，尽管 TTNet 文档声称有独立网络栈
3. 当系统设置了代理（如 mihomo 7892），Cronet 尝试通过代理连接 `trae-api-cn.mchost.guru`
4. 代理对字节内部域名的路由策略不一致（有时直连，有时走节点），导致 Cronet 连接超时/被关闭
5. Cronet Error: `code=11 (CONNECTION_TIMED_OUT) / internal_code=-324 (ERR_CONNECTION_CLOSED)`
6. 聊天请求失败后**无 fallback**、**无重试**、**无错误上报**，请求被静默丢弃
7. ai-agent 64 个线程全部进入睡眠，UI 卡在"召回上下文"

### 验证过程

**条件**：系统 shell 配置（`.bashrc`/`.profile`/`.zshrc`）中设置 `export http_proxy=http://127.0.0.1:7892`

**有代理时**（复现 bug）：
```
ERROR [AhaNetHTTPClient] fetch error, error: Cronet Error: code=11 / internal_code=-324
→ 聊天请求静默丢弃，UI 卡在"召回上下文"
```

**无代理时**（ workaround ）：
```
INFO [AhaNetHTTPClient/Stream] https://trae-api-cn.mchost.guru/api/agent/v3/create_agent_task, Status: 200
INFO [AhaNetHTTPClient/Stream] https://trae-api-cn.mchost.guru/api/agent/v3/llm_utils_chat, Status: 200
→ 自定义模型正常工作，GLM 返回结果
```

### 之前错误诊断的纠正

- ❌ ~~TTNet/Cronet 在 Linux 无头服务器上完全不可用~~ → 实际可用，是代理干扰导致
- ❌ ~~Cronet 静态链接，与系统无关~~ → Cronet 实际上会读取系统代理环境变量
- ✅ ai-agent 聊天请求确实无 fallback → 仍是 bug，但不影响 workaround

## Workaround

在 shell 配置中注释掉代理变量，然后**杀掉 trae-cn-server 进程**并重连 Remote-SSH：

```bash
# 1. 注释掉代理
for f in ~/.bashrc ~/.profile ~/.zshrc; do
  sed -i 's/^export http_proxy/#export http_proxy/' "$f"
  sed -i 's/^export https_proxy/#export https_proxy/' "$f"
  sed -i 's/^export HTTP_PROXY/#export HTTP_PROXY/' "$f"
  sed -i 's/^export HTTPS_PROXY/#export HTTPS_PROXY/' "$f"
  sed -i 's/^export ALL_PROXY/#export ALL_PROXY/' "$f"
  sed -i 's/^export all_proxy/#export all_proxy/' "$f"
  sed -i 's/^export no_proxy/#export no_proxy/' "$f"
  sed -i 's/^export NO_PROXY/#export NO_PROXY/' "$f"
done

# 2. 杀掉 trae-cn-server（需要重连才生效）
kill -9 $(pgrep -f 'trae-cn-server')

# 3. 在 Trae IDE 中重新连接 Remote-SSH
```

**注意**：关闭系统代理会影响其他需要翻墙的工具（git、npm、curl 等）。需要翻墙时用 `proxychains4` 或单次 `--proxy` 参数代替。

## 期望 Trae 官方修复

1. **ai-agent 不应读取系统代理环境变量**（或应在 Remote-SSH 模式下忽略）
2. **聊天请求失败应有 fallback**（与 `batch_get_detail_param` 的双路径策略一致）
3. **应有用户可见的错误反馈**（而非永久卡在"召回上下文"）

## 日志证据

### 有代理时 — Cronet 失败

```
2026-06-22T18:31:07.013 ERROR [AhaNetHTTPClient] fetch error,
  url: "https://trae-api-cn.mchost.guru/api/ide/v1/batch_get_detail_param",
  error: http request connect error: Cronet Error: code=11 / internal_code=-324
  current_config_info: CurrentConfigInfo { config_name: "bigmodel-plan//glm-5.1", is_custom_model: true }
```

### 无代理时 — Cronet 成功

```
2026-06-22T19:01:25.987 INFO [AhaNetHTTPClient/Stream]
  https://trae-api-cn.mchost.guru/api/agent/v3/create_agent_task, Status: 200

2026-06-22T19:01:26.378 INFO [AhaNetHTTPClient/Stream]
  https://trae-api-cn.mchost.guru/api/agent/v3/llm_utils_chat, Status: 200
```

## 相关 trace_id

### 有代理时的错误
- `c89a6db68d47e97dc3f82fa2b1c7f774` (chat_mode Cronet 失败)
- `e2ddf35a88c2f287d96f1de320289a99` (batch_get_detail_param Cronet 失败)
- `11194c88a86c8415338dcb5757ecd6d4` (batch_get_detail_param fallback 成功)
- `d1e56099f3cbbe29c0d5dfcf64b68759` (model_list_by_function)

### 无代理时成功
- `ff58b2b8cb89069d28011298689f1d11` (create_agent_task + llm_utils_chat 全部 200)
