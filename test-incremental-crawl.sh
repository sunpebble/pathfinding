#!/bin/bash

# Integration Test: Incremental Crawl Triggering
# Tests that stale jobs trigger incremental crawls

set -e

CRAWLER_URL="${CRAWLER_URL:-http://localhost:3001}"
COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"
COLOR_YELLOW="\033[1;33m"
COLOR_BLUE="\033[0;34m"
COLOR_RESET="\033[0m"

log_info() {
    echo -e "${COLOR_BLUE}ℹ️  $1${COLOR_RESET}"
}

log_success() {
    echo -e "${COLOR_GREEN}✅ $1${COLOR_RESET}"
}

log_error() {
    echo -e "${COLOR_RED}❌ $1${COLOR_RESET}"
}

log_warn() {
    echo -e "${COLOR_YELLOW}⚠️  $1${COLOR_RESET}"
}

echo ""
echo "🚀 Incremental Crawl Integration Test"
echo "====================================="
echo "Crawler API: $CRAWLER_URL"
echo ""

# Check if crawler is running
log_info "Checking crawler service..."
if ! curl -s "$CRAWLER_URL/health" > /dev/null 2>&1; then
    log_error "Crawler service is not running!"
    log_info "Please start it with: make crawler"
    exit 1
fi
log_success "Crawler service is healthy"
echo ""

# Step 1: Check scheduler status
log_info "Checking scheduler status..."
SCHEDULER_RESPONSE=$(curl -s "$CRAWLER_URL/api/crawl-jobs/scheduler/status")
INCREMENTAL_TASK=$(echo "$SCHEDULER_RESPONSE" | jq '.data.tasks[] | select(.name=="incremental-crawl")')

if [ -z "$INCREMENTAL_TASK" ]; then
    log_error "Incremental-crawl task not found in scheduler"
    exit 1
fi

log_success "Incremental-crawl task is registered"
CRON_EXPR=$(echo "$INCREMENTAL_TASK" | jq -r '.cronExpression')
LAST_RUN=$(echo "$INCREMENTAL_TASK" | jq -r '.lastRun // "Never"')
echo "   Cron: $CRON_EXPR"
echo "   Last run: $LAST_RUN"
echo ""

# Step 2: Create full crawl job with schedule
log_info "Creating full crawl job with schedule..."
CREATE_RESPONSE=$(curl -s -X POST "$CRAWLER_URL/api/crawl-jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Test - Full Crawl for Incremental",
        "platform": "xiaohongshu",
        "job_type": "full",
        "schedule_cron": "0 0 * * *",
        "config": {
            "geographic_scope": {
                "cities": ["上海"]
            },
            "categories": ["travel"]
        }
    }')

JOB_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id')

if [ "$JOB_ID" = "null" ] || [ -z "$JOB_ID" ]; then
    log_error "Failed to create job"
    echo "Response: $CREATE_RESPONSE"
    exit 1
fi

log_success "Created job: $JOB_ID"
echo "   Status: $(echo "$CREATE_RESPONSE" | jq -r '.data.status')"
echo "   Schedule: $(echo "$CREATE_RESPONSE" | jq -r '.data.schedule_cron')"
echo ""

# Step 3: Complete job and backdate to >24 hours ago
log_info "Completing job and backdating to >24 hours ago..."
log_warn "Note: This test requires direct Convex access to backdate timestamps"
log_warn "Run the TypeScript version for full automated testing:"
log_warn "  pnpm tsx test-incremental-crawl.ts"
echo ""

# For bash version, we'll just complete the job normally and document manual steps
START_RESPONSE=$(curl -s -X POST "$CRAWLER_URL/api/crawl-jobs/$JOB_ID/start")
log_info "Started job (it will run but won't be backdated in bash version)"
echo ""

# Wait a bit for job to process
log_info "Waiting 30 seconds for job to process..."
sleep 30

# Check job status
JOB_STATUS=$(curl -s "$CRAWLER_URL/api/crawl-jobs/$JOB_ID" | jq -r '.data.status')
log_info "Current job status: $JOB_STATUS"
echo ""

# Step 4: Provide manual verification instructions
log_warn "⚠️  MANUAL STEPS REQUIRED ⚠️"
echo ""
echo "To fully test incremental crawl triggering, you need to:"
echo ""
echo "1. Use the TypeScript test for automated backdating:"
echo "   pnpm tsx test-incremental-crawl.ts"
echo ""
echo "2. OR manually backdate the job using Convex console:"
echo "   - Open Convex dashboard: https://convex.kunish.org"
echo "   - Find job: $JOB_ID"
echo "   - Set completedAt to: $(date -u -d '25 hours ago' +%s000 2>/dev/null || echo 'timestamp_25_hours_ago')"
echo ""
echo "3. Wait for the next hour (:00) for scheduler to run"
echo ""
echo "4. Verify incremental job was created:"
echo "   curl '$CRAWLER_URL/api/crawl-jobs' | jq '.data[] | select(.job_type==\"incremental\")'"
echo ""
echo "5. Look for a job named: 'Test - Full Crawl for Incremental (Incremental)'"
echo ""

log_success "Test setup completed - manual verification required"
echo ""
echo "📊 Summary:"
echo "   Job ID: $JOB_ID"
echo "   Job Type: full"
echo "   Schedule: 0 0 * * * (daily)"
echo "   Next: Use TypeScript test or manual steps above"
echo ""
