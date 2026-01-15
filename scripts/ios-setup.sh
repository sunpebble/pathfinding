#!/bin/bash

# iOS development setup script

echo "=== iOS Development Setup ==="

# Check for XcodeGen
if ! command -v xcodegen &> /dev/null; then
  echo "Installing XcodeGen..."
  brew install xcodegen
fi

# Generate Xcode project
echo "Generating Xcode project..."
cd apps/ios/Pathfinding
xcodegen generate

# Boot simulator
echo "Booting iPhone simulator..."
xcrun simctl boot "iPhone 17 Pro Max" 2>/dev/null || true

echo "=== Setup Complete ==="
echo "Run 'pnpm ios:open' to open the project in Xcode"
