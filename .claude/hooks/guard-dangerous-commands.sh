#!/usr/bin/env bash
#
# PreToolUse hook for Bash tool calls.
# Blocks destructive commands that could cause irreversible damage.
# Exit 0 = allow, Exit 2 = block (stderr shown as feedback).

set -euo pipefail

# Read the tool input from stdin (JSON with tool_name, tool_input, etc.)
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Patterns to block — each is a regex checked against the full command string
BLOCKED_PATTERNS=(
  'rm\s+-rf\s+/'
  'rm\s+-rf\s+\.'
  'git\s+push\s+.*--force'
  'git\s+push\s+-f\b'
  'git\s+reset\s+--hard'
  'DROP\s+TABLE'
  'DROP\s+DATABASE'
  'TRUNCATE\s+TABLE'
  'git\s+clean\s+-fd'
  'git\s+checkout\s+--\s+\.'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qEi "$pattern"; then
    echo "BLOCKED: Command matches destructive pattern '$pattern'. Command: $COMMAND" >&2
    echo "If you truly need this, ask the user to run it manually with: ! $COMMAND" >&2
    exit 2
  fi
done

exit 0
