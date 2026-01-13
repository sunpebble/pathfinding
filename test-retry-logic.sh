#!/bin/bash
#
# Manual Integration Test: Retry Logic with Exponential Backoff
#
# This script manually tests the retry mechanism for failed crawl jobs:
# 1. Creates a crawl job with invalid configuration to trigger failures
# 2. Executes the job and observes retry attempts
# 3. Verifies retryCount, lastFailureAt, and lastFailureReason are tracked
# 4. Checks that job stops after MAX_RETRIES (3 attempts)
#

set -e

CRAWLER_API_URL="${CRAWLER_API_URL:-http://localhost:3001}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🚀 Retry Logic Integration Test"
echo "====================================="
echo "Crawler API: $CRAWLER_API_URL"
echo ""

# Step 1: Check crawler health
echo "🔍 Checking crawler service..."
if ! curl -sf "$CRAWLER_API_URL/health" > /dev/null; then
  echo -e "${RED}❌ Crawler service is not running!${NC}"
  echo "   Please start it with: make crawler"
  exit 1
fi
echo -e "${GREEN}✅ Crawler service is healthy${NC}"
echo ""

# Step 2: Create job with invalid platform
echo "📋 Creating job with invalid configuration..."
JOB_RESPONSE=$(curl -sf "$CRAWLER_API_URL/api/crawl-jobs" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Test - Retry Logic",
    "platform": "invalid-platform-xyz",
    "job_type": "full",
    "config": {
      "geographic_scope": {
        "cities": ["TestCity"]
      }
    }
  }')

JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.data.id')
echo -e "${GREEN}✅ Created job: $JOB_ID${NC}"
echo "   Platform: invalid-platform-xyz (will cause failures)"
echo ""

# Step 3: Execute the job (will trigger retries)
echo "▶️  Executing job (this will fail and trigger retries)..."
curl -sf "$CRAWLER_API_URL/api/crawl-jobs/$JOB_ID/execute" -X POST || echo "   (Expected to fail)"
echo ""

# Step 4: Monitor job status
echo "⏳ Monitoring retry attempts..."
echo "   Expected: 4 total attempts (initial + 3 retries)"
echo "   Backoff delays: 1s, 2s, 4s"
echo ""

for i in {1..20}; do
  JOB=$(curl -sf "$CRAWLER_API_URL/api/crawl-jobs/$JOB_ID" | jq -r '.data')

  STATUS=$(echo "$JOB" | jq -r '.status')
  RETRY_COUNT=$(echo "$JOB" | jq -r '.retry_count // .retryCount // 0')

  echo "   [$(date +%H:%M:%S)] Status: $STATUS, Retry Count: $RETRY_COUNT"

  # Check if job reached final state
  if [[ "$STATUS" == "failed" ]] && [[ "$RETRY_COUNT" -ge 3 ]]; then
    echo ""
    echo -e "${GREEN}✅ Job reached max retries and stopped${NC}"
    break
  fi

  sleep 2
done

echo ""

# Step 5: Verify final job state
echo "🔍 Verifying final job state..."
FINAL_JOB=$(curl -sf "$CRAWLER_API_URL/api/crawl-jobs/$JOB_ID" | jq '.data')

STATUS=$(echo "$FINAL_JOB" | jq -r '.status')
RETRY_COUNT=$(echo "$FINAL_JOB" | jq -r '.retry_count // .retryCount // 0')
LAST_FAILURE_AT=$(echo "$FINAL_JOB" | jq -r '.last_failure_at // .lastFailureAt // "null"')
LAST_FAILURE_REASON=$(echo "$FINAL_JOB" | jq -r '.last_failure_reason // .lastFailureReason // .error_message // .errorMessage // "null"')

echo "   Status: $STATUS"
echo "   Retry Count: $RETRY_COUNT"
echo "   Last Failure At: $LAST_FAILURE_AT"
echo "   Last Failure Reason: $(echo "$LAST_FAILURE_REASON" | head -c 60)..."
echo ""

# Verify expectations
PASS=true

if [[ "$STATUS" != "failed" ]]; then
  echo -e "${RED}❌ Expected status 'failed', got '$STATUS'${NC}"
  PASS=false
else
  echo -e "${GREEN}✅ Job status: failed${NC}"
fi

if [[ "$RETRY_COUNT" != "3" ]]; then
  echo -e "${YELLOW}⚠️  Expected retry count 3, got $RETRY_COUNT${NC}"
  PASS=false
else
  echo -e "${GREEN}✅ Retry count: 3${NC}"
fi

if [[ "$LAST_FAILURE_AT" == "null" ]]; then
  echo -e "${RED}❌ lastFailureAt is not set${NC}"
  PASS=false
else
  echo -e "${GREEN}✅ lastFailureAt is tracked${NC}"
fi

if [[ "$LAST_FAILURE_REASON" == "null" ]]; then
  echo -e "${RED}❌ lastFailureReason is not set${NC}"
  PASS=false
else
  echo -e "${GREEN}✅ lastFailureReason is tracked${NC}"
fi

echo ""

# Summary
if [[ "$PASS" == true ]]; then
  echo -e "${GREEN}✅ All verification steps passed!${NC}"
  echo ""
  echo "📊 Summary:"
  echo "   - Job failed after 4 attempts (1 initial + 3 retries)"
  echo "   - Retry count tracked correctly"
  echo "   - Failure information recorded"
  echo "   - Dashboard can display retry information"
  exit 0
else
  echo -e "${RED}❌ Some verification steps failed${NC}"
  exit 1
fi
