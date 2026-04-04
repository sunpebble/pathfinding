# Agent Team Optimization Design

## Overview

Create a comprehensive Claude Code Agent Team for the Pathfinding project (Nx monorepo) to automate code quality, development workflows, and release processes. The design follows a **hybrid approach**: domain-specific agents for deep expertise + workflow agents for quality gates + hooks for zero-intervention automation.

## Context

- **Project**: Pathfinding — travel itinerary planning app
- **Monorepo structure**: Dashboard (Next.js 16 + React 19), API (Hono + Drizzle + TiDB), iOS (SwiftUI), Go server
- **User profile**: Solo developer, wants high automation with minimal intervention
- **Current state**: `.claude/agents/` and `.claude/hooks/` directories exist but are empty

## Design Goals

1. Zero context loss when switching between frontend/backend/Go domains
2. Automated enforcement of CLAUDE.md rules (security, performance, UX)
3. Automated test generation and coverage checking
4. Streamlined commit/PR workflow with Conventional Commits
5. Dangerous operation prevention via hooks

---

## Agent Definitions

All agents are defined as markdown files in `.claude/agents/`.

### 1. `api-developer.md` — API Domain Expert

- **Purpose**: Hono route development, Drizzle schema/migrations, Zod validation, middleware
- **Tools**: All (Read, Write, Edit, Bash, Glob, Grep, Agent)
- **Model**: sonnet
- **Scope**: `packages/api/`, `packages/database/`, `packages/types/`
- **Built-in constraints**:
  - Mandatory Zod validation on all user inputs
  - Middleware order: auth → rate-limit → handler
  - No N+1 queries — use batch queries or Map cache
  - Column naming: snake_case in MySQL, camelCase in Drizzle schema
  - JWT verification via `verifyToken()` from `services/auth.service.ts` (jose library)
  - Strict equality (`===`) for userId comparisons

### 2. `frontend-developer.md` — Dashboard Domain Expert

- **Purpose**: React components, pages, hooks, Tailwind v4 styling, TanStack Query data layer
- **Tools**: All
- **Model**: sonnet
- **Scope**: `apps/dashboard/`, `packages/types/`, `packages/constants/`
- **Built-in constraints**:
  - Icon-only buttons must be wrapped in Tooltip (TooltipTrigger + TooltipContent)
  - All interactive elements must have `aria-label`
  - Sanitize user-generated HTML with `isomorphic-dompurify`
  - Follow existing Radix UI + CVA component patterns

### 3. `go-developer.md` — Go Service Expert

- **Purpose**: Go crawler service, chromedp browser automation, HTTP services
- **Tools**: All
- **Model**: sonnet
- **Scope**: `apps/server/`
- **Built-in constraints**:
  - Follow Go conventions and idioms
  - Never ignore errors (no `_ = err`)
  - Use context.Context for cancellation and timeouts

### 4. `code-reviewer.md` — Unified Quality Gate (Read-Only)

- **Purpose**: Review code changes against all CLAUDE.md rules (security, performance, UX)
- **Tools**: Read, Glob, Grep, Bash
- **Disallowed tools**: Write, Edit
- **Model**: opus (deep reasoning for review)
- **Checklist**:
  - **Security**: JWT via `verifyToken()` only, userId comparison via `===` only, all inputs Zod-validated, HTML sanitized with dompurify
  - **Performance**: No N+1 (no db calls in loops), database-level `.where()` filtering with indexed columns, auxiliary table usage for substring filtering
  - **UX**: Tooltips on icon buttons, aria-labels on interactive elements
  - **Testing**: Tests exist for new features, AAA pattern, 60% minimum coverage
- **Output format**: Structured report with severity levels (Critical / Warning / Info)

### 5. `test-engineer.md` — Test Engineer

- **Purpose**: Generate unit tests, check coverage, ensure test quality
- **Tools**: All
- **Model**: sonnet
- **Scope**: All `__tests__/` directories across packages
- **Built-in constraints**:
  - AAA pattern (Arrange, Act, Assert)
  - Use `vi.hoisted()` for module mocks
  - Restore `process.env` in `afterEach` for env-dependent tests
  - Minimum 60% coverage threshold
  - Test file naming: `__tests__/<module>.test.ts` next to source

### 6. `release-assistant.md` — Release Assistant (Read-Only + Git)

- **Purpose**: Generate Conventional Commits, create PRs with proper format
- **Tools**: Read, Glob, Grep, Bash
- **Disallowed tools**: Write, Edit
- **Model**: haiku (lightweight task)
- **Built-in constraints**:
  - Conventional Commits format: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`
  - PR title < 70 characters
  - PR body includes Summary (1-3 bullets) + Test Plan

---

## Hooks Configuration

Hooks are defined in `.claude/settings.json` under the project.

### PreToolUse Hooks

#### 1. Security File Write Guardian

- **Matcher**: `Write|Edit`
- **Condition**: File path matches `packages/api/src/routes/**` or `packages/api/src/services/auth*`
- **Type**: prompt
- **Behavior**: Injects security checklist reminder — verify JWT uses `verifyToken()`, userId uses `===`, inputs use Zod validation
- **Action**: Returns `additionalContext` with security reminders, does not block

#### 2. Dangerous Command Blocker

- **Matcher**: `Bash`
- **Type**: command
- **Behavior**: Script checks if command matches destructive patterns (`rm -rf /`, `git push --force`, `git reset --hard`, `DROP TABLE`, `DROP DATABASE`)
- **Action**: Exit code 2 (block) with warning message if matched

### PostToolUse Hooks

#### 3. Auto-Lint on Edit

- **Matcher**: `Write|Edit`
- **Type**: command
- **Behavior**: Extracts the package name from the modified file's path (e.g., `packages/api/src/foo.ts` → `api`, `apps/dashboard/src/bar.tsx` → `dashboard`), then runs `pnpm lint --fix --filter=<package>`
- **Action**: Returns lint output as context feedback; non-blocking (exit 0 even on lint warnings)

### Stop Hooks

#### 4. Completion Quality Check

- **Type**: prompt
- **Behavior**: Lightweight check — were new files created without tests? Were security-sensitive files modified without review mention?
- **Action**: Returns `additionalContext` suggesting follow-up actions if issues detected

---

## Settings Configuration

### `.claude/settings.json` additions

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Team Usage Patterns

**Daily development (Subagent mode)**:
- Invoke domain agents directly: "Use api-developer to add a new route"
- Auto-triggered: code-reviewer runs via hooks after edits

**Large feature development (Team mode)**:
- Spin up a team: api-developer + frontend-developer + test-engineer
- Each teammate owns their domain's files, no conflicts
- code-reviewer as post-completion quality gate

---

## File Inventory

Files to create:

| File | Purpose |
|------|---------|
| `.claude/agents/api-developer.md` | API domain agent definition |
| `.claude/agents/frontend-developer.md` | Dashboard domain agent definition |
| `.claude/agents/go-developer.md` | Go service domain agent definition |
| `.claude/agents/code-reviewer.md` | Read-only quality gate agent |
| `.claude/agents/test-engineer.md` | Test generation agent |
| `.claude/agents/release-assistant.md` | Commit/PR automation agent |
| `.claude/hooks/guard-dangerous-commands.sh` | Bash command blocker script |
| `.claude/settings.json` | Hook definitions + Agent Teams env var |

Files to modify:

| File | Change |
|------|--------|
| (none) | No existing files are modified |

---

## Success Criteria

1. All 6 agents can be invoked independently as subagents
2. Agents can be composed into teams for large features
3. Dangerous commands are automatically blocked
4. Security-sensitive file edits trigger automated reminders
5. Edited files are auto-linted
6. Completion quality check catches missing tests
