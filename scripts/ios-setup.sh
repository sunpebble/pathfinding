#!/bin/bash
set -euo pipefail

# iOS development setup script

echo "=== iOS Development Setup ==="

# Check for Homebrew
if ! command -v brew &>/dev/null; then
	echo "Error: Homebrew is required. Install from https://brew.sh"
	exit 1
fi

# Check for XcodeGen
if ! command -v xcodegen &>/dev/null; then
	echo "Installing XcodeGen..."
	brew install xcodegen
fi

# Ensure project directory exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../apps/ios/Pathfinding"

if [ ! -d "$PROJECT_DIR" ]; then
	echo "Error: Project directory not found at $PROJECT_DIR"
	exit 1
fi

# Generate Xcode project
echo "Generating Xcode project..."
(cd "$PROJECT_DIR" && xcodegen generate)

# Boot simulator — pick the first available iPhone instead of hardcoding
echo "Booting iPhone simulator..."
SIMULATOR=$(xcrun simctl list devices available -j 2>/dev/null |
	python3 -c "
import sys, json
data = json.load(sys.stdin)
for runtime, devices in data.get('devices', {}).items():
    if 'iOS' not in runtime:
        continue
    for d in devices:
        if d.get('isAvailable') and 'iPhone' in d.get('name', ''):
            print(d['udid'])
            sys.exit(0)
" 2>/dev/null || true)

if [ -n "$SIMULATOR" ]; then
	xcrun simctl boot "$SIMULATOR" 2>/dev/null || true
	echo "Simulator booted: $SIMULATOR"
else
	echo "Warning: No available iPhone simulator found. Skipping boot."
fi

echo "=== Setup Complete ==="
echo "Run 'pnpm ios:open' to open the project in Xcode"
