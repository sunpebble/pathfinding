#!/bin/bash

# Integration Test: Scheduled Crawl Job
# Tests the complete scheduled crawling workflow

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
echo "🚀 Scheduled Crawl Integration Test"
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

# Step 1: Create scheduled crawl job
log_info "Creating scheduled crawl job..."
CREATE_RESPONSE=$(curl -s -X POST "$CRAWLER_URL/api/crawl-jobs" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "Integration Test - Scheduled Crawl",
        "platform": "xiaohongshu",
        "job_type": "full",
        "schedule_cron": "*/5 * * * *",
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

# Step 2: Start the job immediately (instead of waiting for scheduler)
log_info "Starting job immediately..."
START_RESPONSE=$(curl -s -X POST "$CRAWLER_URL/api/crawl-jobs/$JOB_ID/start")

START_STATUS=$(echo "$START_RESPONSE" | jq -r '.data.status')
if [ "$START_STATUS" != "running" ] && [ "$START_STATUS" != "pending" ]; then
    log_error "Failed to start job"
    echo "Response: $START_RESPONSE"
    exit 1
fi

log_success "Job started"
echo "   Status: $START_STATUS"
echo ""

# Step 3: Wait for job to complete
log_info "Waiting for job to complete (max 3 minutes)..."
MAX_WAIT=180
ELAPSED=0
LAST_STATUS=""

while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))

    JOB_RESPONSE=$(curl -s "$CRAWLER_URL/api/crawl-jobs/$JOB_ID")
    CURRENT_STATUS=$(echo "$JOB_RESPONSE" | jq -r '.data.status')

    if [ "$CURRENT_STATUS" != "$LAST_STATUS" ]; then
        echo "   Status: $CURRENT_STATUS (${ELAPSED}s)"
        LAST_STATUS="$CURRENT_STATUS"
    fi

    if [ "$CURRENT_STATUS" = "completed" ] || [ "$CURRENT_STATUS" = "failed" ]; then
        break
    fi
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_error "Job did not complete within $MAX_WAIT seconds"
    exit 1
fi

echo ""

# Step 4: Verify results
log_info "Verifying job results..."

FINAL_JOB=$(curl -s "$CRAWLER_URL/api/crawl-jobs/$JOB_ID")
FINAL_STATUS=$(echo "$FINAL_JOB" | jq -r '.data.status')
STARTED_AT=$(echo "$FINAL_JOB" | jq -r '.data.started_at')
COMPLETED_AT=$(echo "$FINAL_JOB" | jq -r '.data.completed_at')
NEXT_RUN_AT=$(echo "$FINAL_JOB" | jq -r '.data.next_run_at')
STATISTICS=$(echo "$FINAL_JOB" | jq -r '.data.statistics')

echo ""

# Verify status
if [ "$FINAL_STATUS" != "completed" ]; then
    log_error "Expected status 'completed', got '$FINAL_STATUS'"
    exit 1
fi
log_success "Job status: $FINAL_STATUS"

# Verify timestamps
if [ "$STARTED_AT" = "null" ] || [ -z "$STARTED_AT" ]; then
    log_error "started_at is missing"
    exit 1
fi
log_success "Started at: $STARTED_AT"

if [ "$COMPLETED_AT" = "null" ] || [ -z "$COMPLETED_AT" ]; then
    log_error "completed_at is missing"
    exit 1
fi
log_success "Completed at: $COMPLETED_AT"

# Check nextRunAt
if [ "$NEXT_RUN_AT" != "null" ] && [ -n "$NEXT_RUN_AT" ]; then
    log_success "Next run scheduled: $NEXT_RUN_AT"
else
    log_warn "nextRunAt was not set (this is OK for manually started jobs)"
fi

# Verify statistics
if [ "$STATISTICS" = "null" ] || [ -z "$STATISTICS" ]; then
    log_error "Statistics are missing"
    exit 1
fi

log_success "Statistics recorded:"
echo "   Requests: $(echo "$FINAL_JOB" | jq -r '.data.statistics.requests_total // 0')"
echo "   Success: $(echo "$FINAL_JOB" | jq -r '.data.statistics.requests_success // 0')"
echo "   Failed: $(echo "$FINAL_JOB" | jq -r '.data.statistics.requests_failed // 0')"
echo "   Records: $(echo "$FINAL_JOB" | jq -r '.data.statistics.records_extracted // 0')"
echo "   Duration: $(echo "$FINAL_JOB" | jq -r '.data.statistics.duration_seconds // 0')s"

echo ""
log_success "All verification steps passed!"
echo ""
echo "📊 Summary:"
echo "   Job ID: $JOB_ID"
echo "   Status: $FINAL_STATUS"
echo "   Schedule: */5 * * * *"
echo "   Next run: ${NEXT_RUN_AT:-N/A}"
echo ""

# Optional: Test scheduler status endpoint
log_info "Checking scheduler status..."
SCHEDULER_RESPONSE=$(curl -s "$CRAWLER_URL/api/crawl-jobs/scheduler/status")
TASK_COUNT=$(echo "$SCHEDULER_RESPONSE" | jq -r '.data.tasks | length')

if [ "$TASK_COUNT" -gt 0 ]; then
    log_success "Scheduler is running with $TASK_COUNT tasks"
    echo "   Tasks:"
    echo "$SCHEDULER_RESPONSE" | jq -r '.data.tasks[] | "   - \(.name): \(.cronExpression) (\(if .enabled then "enabled" else "disabled" end))"'
else
    log_warn "No scheduled tasks found"
fi

echo ""
log_success "✨ Integration test completed successfully!"
