#!/bin/bash
set -euo pipefail

# Health check script for all services

echo "=== Pathfinding Health Check ==="
echo ""

# API Server (port 8000)
echo -n "API (localhost:8000): "
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
	echo "✓ OK"
else
	echo "✗ DOWN"
fi

# Crawler Service
echo -n "Crawler (localhost:3001): "
if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
	echo "✓ OK"
else
	echo "✗ DOWN"
fi

# Ollama LLM
echo -n "Ollama (localhost:11434): "
if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
	echo "✓ OK"
else
	echo "✗ DOWN"
fi

# n8n Workflow Engine
echo -n "n8n (localhost:5678): "
if curl -sf http://localhost:5678/healthz >/dev/null 2>&1; then
	echo "✓ OK"
else
	echo "✗ DOWN"
fi

echo ""
echo "=== Check Complete ==="
