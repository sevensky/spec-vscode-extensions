#!/usr/bin/env bash
# 将扩展项目目录软链接到 Trae/VS Code 扩展目录，
# 实现不打包 vsix、不打开扩展项目即可自动加载编译产物。
#
# 用法：
#   bash scripts/link-extension.sh link     # 创建软链接（替代 vsix 安装版）
#   bash scripts/link-extension.sh unlink   # 移除软链接
#   bash scripts/link-extension.sh status   # 查看当前状态
#
# 改代码后：pnpm build，然后 Ctrl+Shift+P → Reload Window

set -e

# === 配置（按需修改）===
EXT_DIR="${TRAPE_EXTENSIONS_DIR:-/root/.trae-cn-server/extensions}"
EXT_NAME="bairui-dev.openspec-for-agent-1.1.0-universal"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LINK_PATH="$EXT_DIR/$EXT_NAME"

action="${1:-status}"

case "$action" in
  link)
    # 删除旧 vsix 目录（非软链接才删）
    if [ -d "$LINK_PATH" ] && [ ! -L "$LINK_PATH" ]; then
      echo "删除旧 vsix 安装目录: $LINK_PATH"
      rm -rf "$LINK_PATH"
    fi
    # 已有软链接则先删
    if [ -L "$LINK_PATH" ]; then
      rm "$LINK_PATH"
    fi
    # 创建软链接
    ln -s "$PROJECT_DIR" "$LINK_PATH"
    echo "✓ 软链接已创建"
    echo "  $LINK_PATH -> $PROJECT_DIR"
    echo ""
    echo "现在在任何工作区启动 Trae，都会自动加载此扩展。"
    echo "改代码后：pnpm build + Reload Window"
    ;;

  unlink)
    if [ -L "$LINK_PATH" ]; then
      rm "$LINK_PATH"
      echo "✓ 软链接已移除: $LINK_PATH"
      echo "如需恢复 vsix 版本，请重新安装 .vsix 文件。"
    elif [ -d "$LINK_PATH" ]; then
      echo "目录存在但不是软链接（可能是 vsix 安装版），未删除: $LINK_PATH"
    else
      echo "软链接不存在: $LINK_PATH"
    fi
    ;;

  status)
    if [ -L "$LINK_PATH" ]; then
      target=$(readlink "$LINK_PATH")
      echo "✓ 当前为软链接模式"
      echo "  $LINK_PATH -> $target"
    elif [ -d "$LINK_PATH" ]; then
      echo "当前为 vsix 安装模式（静态目录）: $LINK_PATH"
      echo "运行 'bash scripts/link-extension.sh link' 切换到软链接模式。"
    else
      echo "扩展未安装: $LINK_PATH"
    fi
    ;;

  *)
    echo "用法: bash scripts/link-extension.sh [link|unlink|status]"
    exit 1
    ;;
esac
