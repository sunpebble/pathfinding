#!/bin/bash
# 马蜂窝爬虫 API 测试脚本
# 使用: ./scripts/test-mafengwo.sh

set -e

BASE_URL="${MOTIA_URL:-http://localhost:3000}"

echo "=== 马蜂窝爬虫 API 测试 ==="
echo "Base URL: $BASE_URL"
echo ""

# 测试 1: 列表爬取
echo "1. 测试列表爬取 API..."
curl -s -X POST "$BASE_URL/api/crawler/mafengwo/list" \
	-H "Content-Type: application/json" \
	-d '{"city": "成都", "scrollCount": 3}' | jq .

echo ""

# 测试 2: 详情爬取
echo "2. 测试详情爬取 API..."
curl -s -X POST "$BASE_URL/api/crawler/mafengwo/detail" \
	-H "Content-Type: application/json" \
	-d '{"url": "https://m.mafengwo.cn/i/24648165.html"}' | jq .

echo ""
echo "=== 测试完成 ==="
