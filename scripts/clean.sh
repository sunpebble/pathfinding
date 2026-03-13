#!/bin/bash
set -euo pipefail

# Clean script for the monorepo

echo "=== Cleaning Pathfinding Monorepo ==="

# Clean Nx cache
echo "Cleaning Nx cache..."
pnpm nx reset 2>/dev/null || true
rm -rf .nx/cache

# Clean dist directories
echo "Cleaning dist directories..."
find . -name 'dist' -type d -not -path './node_modules/*' -exec rm -rf {} + 2>/dev/null || true

# Clean Next.js cache
echo "Cleaning Next.js cache..."
rm -rf apps/dashboard/.next

# Clean iOS build
echo "Cleaning iOS build..."
rm -rf /tmp/pathfinding-build

# Clean coverage
echo "Cleaning coverage..."
find . -name 'coverage' -type d -not -path './node_modules/*' -exec rm -rf {} + 2>/dev/null || true

echo "=== Clean Complete ==="
