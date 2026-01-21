#!/bin/bash
# Batch clean all articles in the database
# Uses cursor-based pagination to process all articles

API_URL="http://localhost:3001/api/crawler/clean-all"
LIMIT=10
CURSOR=""
BATCH=1
TOTAL_CLEANED=0
TOTAL_SKIPPED=0
TOTAL_FAILED=0

echo "Starting batch cleaning..."
echo "Limit per batch: $LIMIT"
echo ""

while true; do
  echo "=== Batch $BATCH ==="

  # Build request body
  if [ -z "$CURSOR" ]; then
    BODY="{\"limit\": $LIMIT}"
  else
    BODY="{\"limit\": $LIMIT, \"cursor\": \"$CURSOR\"}"
  fi

  # Make request
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$BODY")

  # Parse response
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success // false')
  if [ "$SUCCESS" != "true" ]; then
    echo "Error: $RESPONSE"
    exit 1
  fi

  CLEANED=$(echo "$RESPONSE" | jq -r '.results.cleaned // 0')
  SKIPPED=$(echo "$RESPONSE" | jq -r '.results.skipped // 0')
  FAILED=$(echo "$RESPONSE" | jq -r '.results.failed // 0')
  TOTAL=$(echo "$RESPONSE" | jq -r '.results.total // 0')
  IS_DONE=$(echo "$RESPONSE" | jq -r 'if .isDone == true then "true" else "false" end')
  CURSOR=$(echo "$RESPONSE" | jq -r '.nextCursor // ""')

  TOTAL_CLEANED=$((TOTAL_CLEANED + CLEANED))
  TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
  TOTAL_FAILED=$((TOTAL_FAILED + FAILED))

  echo "Processed: $TOTAL | Cleaned: $CLEANED | Skipped: $SKIPPED | Failed: $FAILED"
  echo "Running totals - Cleaned: $TOTAL_CLEANED | Skipped: $TOTAL_SKIPPED | Failed: $TOTAL_FAILED"
  echo ""

  if [ "$IS_DONE" = "true" ] || [ -z "$CURSOR" ] || [ "$CURSOR" = "null" ]; then
    echo "=== All batches complete ==="
    break
  fi

  BATCH=$((BATCH + 1))

  # Small delay between batches
  sleep 1
done

echo ""
echo "=== Final Summary ==="
echo "Total Cleaned: $TOTAL_CLEANED"
echo "Total Skipped: $TOTAL_SKIPPED"
echo "Total Failed: $TOTAL_FAILED"
