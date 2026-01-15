#!/bin/bash

# Health check script for all services

echo "=== Pathfinding Health Check ==="
echo ""

# API
echo -n "API (localhost:8000): "
if curl -sf http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "✓ OK"
else
  echo "✗ DOWN"
fi

# Crawler
echo -n "Crawler (localhost:3001): "
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
  echo "✓ OK"
else
  echo "✗ DOWN"
fi

# Dashboard
echo -n "Dashboard (localhost:3002): "
if curl -sf http://localhost:3002 > /dev/null 2>&1; then
  echo "✓ OK"
else
  echo "✗ DOWN"
fi

echo ""
echo "=== Check Complete ==="
