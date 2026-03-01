#!/bin/bash

# =============================================================================
# iOS 一键启动脚本 — 探路 Pathfinding
# 自动完成: 环境检查 → 项目生成 → 模拟器启动 → 编译 → 安装 → 运行
# =============================================================================

set -euo pipefail

# ── 配置 ─────────────────────────────────────────────────────────────────────
SIMULATOR_NAME="${IOS_SIMULATOR:-iPhone 17 Pro Max}"
SCHEME="${IOS_SCHEME:-Pathfinding-Debug}"
BUNDLE_ID="${IOS_BUNDLE_ID:-org.pathfinding.app.debug}"
DERIVED_DATA="/tmp/pathfinding-build"
PROJECT_DIR="apps/ios/Pathfinding"
XCODEPROJ="$PROJECT_DIR/Pathfinding.xcodeproj"
PROJECT_YML="$PROJECT_DIR/project.yml"
APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/Pathfinding.app"

# ── 颜色 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step() { echo -e "\n${BLUE}${BOLD}▸ $1${NC}"; }
ok() { echo -e "  ${GREEN}✓ $1${NC}"; }
warn() { echo -e "  ${YELLOW}⚠ $1${NC}"; }
fail() {
	echo -e "\n${RED}${BOLD}✗ $1${NC}" >&2
	exit 1
}
info() { echo -e "  ${CYAN}$1${NC}"; }

# ── 帮助信息 ─────────────────────────────────────────────────────────────────
usage() {
	cat <<EOF
${BOLD}用法:${NC} $0 [选项]

${BOLD}选项:${NC}
  --clean         编译前清理构建缓存
  --release       使用 Release scheme 编译
  --device <名称> 指定模拟器设备 (默认: $SIMULATOR_NAME)
  --skip-gen      跳过 XcodeGen 项目生成
  --build-only    仅编译，不安装运行
  --open          编译后在 Xcode 中打开项目
  -h, --help      显示此帮助信息

${BOLD}环境变量:${NC}
  IOS_SIMULATOR   模拟器名称 (同 --device)
  IOS_SCHEME      构建 scheme
  IOS_BUNDLE_ID   App Bundle ID
EOF
	exit 0
}

# ── 参数解析 ───────────────────────────────────────────────────────────────────
CLEAN=false
SKIP_GEN=false
BUILD_ONLY=false
OPEN_XCODE=false

while [[ $# -gt 0 ]]; do
	case $1 in
	--clean)
		CLEAN=true
		shift
		;;
	--release)
		SCHEME="Pathfinding-Release"
		shift
		;;
	--device)
		SIMULATOR_NAME="$2"
		shift 2
		;;
	--skip-gen)
		SKIP_GEN=true
		shift
		;;
	--build-only)
		BUILD_ONLY=true
		shift
		;;
	--open)
		OPEN_XCODE=true
		shift
		;;
	-h | --help) usage ;;
	*) fail "未知参数: $1 (使用 --help 查看帮助)" ;;
	esac
done

# ── 切换到项目根目录 ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${BOLD}${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║   探路 Pathfinding · iOS 启动     ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"
info "Scheme:    $SCHEME"
info "设备:      $SIMULATOR_NAME"
info "Bundle ID: $BUNDLE_ID"

# ── 1. 环境检查 ──────────────────────────────────────────────────────────────
step "检查开发环境"

command -v xcodebuild &>/dev/null || fail "未找到 xcodebuild，请安装 Xcode 命令行工具: xcode-select --install"
command -v xcrun &>/dev/null || fail "未找到 xcrun，请安装 Xcode 命令行工具"
ok "Xcode CLI 工具就绪"

if ! command -v xcodegen &>/dev/null; then
	warn "XcodeGen 未安装，正在通过 Homebrew 安装..."
	brew install xcodegen || fail "XcodeGen 安装失败"
fi
ok "XcodeGen 就绪 ($(xcodegen --version 2>/dev/null || echo 'unknown'))"

# ── 2. 项目生成 ──────────────────────────────────────────────────────────────
if [ "$SKIP_GEN" = false ]; then
	step "检查 XcodeGen 项目状态"

	NEED_GEN=false
	if [ ! -d "$XCODEPROJ" ]; then
		warn "Xcode 项目不存在，需要生成"
		NEED_GEN=true
	elif [ "$PROJECT_YML" -nt "$XCODEPROJ/project.pbxproj" ]; then
		warn "project.yml 已更新，重新生成项目"
		NEED_GEN=true
	fi

	if [ "$NEED_GEN" = true ]; then
		step "生成 Xcode 项目"
		(cd "$PROJECT_DIR" && xcodegen generate) || fail "XcodeGen 项目生成失败"
		ok "Xcode 项目已生成"
	else
		ok "Xcode 项目已是最新"
	fi
else
	info "跳过 XcodeGen 项目生成 (--skip-gen)"
fi

# ── 3. 清理（可选） ─────────────────────────────────────────────────────────
if [ "$CLEAN" = true ]; then
	step "清理构建缓存"
	rm -rf "$DERIVED_DATA"
	xcodebuild -project "$XCODEPROJ" clean 2>/dev/null || true
	ok "构建缓存已清理"
fi

# ── 4. 模拟器 ────────────────────────────────────────────────────────────────
if [ "$BUILD_ONLY" = false ]; then
	step "准备模拟器"

	# 检查设备是否存在（精确匹配设备名，避免 "iPhone 15" 误匹配 "iPhone 15 Pro"）
	if ! xcrun simctl list devices available | grep -qF "$SIMULATOR_NAME ("; then
		warn "未找到模拟器 '$SIMULATOR_NAME'，可用设备:"
		xcrun simctl list devices available | grep -E "iPhone|iPad" | head -10
		echo ""
		fail "请使用 --device <名称> 指定有效设备，或创建: xcrun simctl create '$SIMULATOR_NAME' ..."
	fi

	# 启动模拟器
	BOOT_STATUS=$(xcrun simctl list devices | grep -F "$SIMULATOR_NAME (" | head -1)
	if echo "$BOOT_STATUS" | grep -qF "(Booted)"; then
		ok "模拟器已运行: $SIMULATOR_NAME"
	else
		info "正在启动模拟器: $SIMULATOR_NAME"
		xcrun simctl boot "$SIMULATOR_NAME" 2>/dev/null || true
		# 打开 Simulator.app 使其可见
		open -a Simulator 2>/dev/null || true
		# 等待模拟器就绪
		for i in $(seq 1 15); do
			if xcrun simctl list devices | grep -F "$SIMULATOR_NAME (" | grep -qF "(Booted)"; then
				break
			fi
			sleep 1
		done
		ok "模拟器已启动"
	fi
fi

# ── 5. 编译 ──────────────────────────────────────────────────────────────────
step "编译项目 ($SCHEME)"

BUILD_START=$(date +%s)

xcodebuild \
	-project "$XCODEPROJ" \
	-scheme "$SCHEME" \
	-destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
	-derivedDataPath "$DERIVED_DATA" \
	-quiet \
	build 2>&1 | while IFS= read -r line; do
	# 仅输出错误和警告（bash 内置正则，避免每行 fork 子进程）
	if [[ "$line" =~ error:|warning: ]]; then
		echo "  $line"
	fi
done

# pipefail 下管道退出码可能不可靠，以 PIPESTATUS 为准
if [ "${PIPESTATUS[0]:-0}" -ne 0 ] || [ ! -d "$APP_PATH" ]; then
	fail "编译失败 (xcodebuild 退出码: ${PIPESTATUS[0]:-unknown})"
fi

BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))
ok "编译成功 (${BUILD_TIME}s)"

# ── 6. 安装 & 启动 ──────────────────────────────────────────────────────────
if [ "$BUILD_ONLY" = false ]; then
	step "安装并启动 App"

	# 终止旧实例
	xcrun simctl terminate booted "$BUNDLE_ID" 2>/dev/null || true

	# 安装
	xcrun simctl install booted "$APP_PATH" || fail "安装到模拟器失败"
	ok "App 已安装"

	# 启动
	xcrun simctl launch booted "$BUNDLE_ID" || fail "启动 App 失败"
	ok "App 已启动: $BUNDLE_ID"
fi

# ── 7. 打开 Xcode（可选） ───────────────────────────────────────────────────
if [ "$OPEN_XCODE" = true ]; then
	step "在 Xcode 中打开项目"
	open "$XCODEPROJ"
	ok "已打开 Xcode"
fi

# ── 完成 ─────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}${BOLD}  ✓ 全部完成！${NC} (总计 ${BUILD_TIME:-0}s)\n"
