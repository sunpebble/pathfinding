# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pathfinding (探路)** is a travel planning application with an offline-first architecture. It helps users discover, plan, and manage travel itineraries by crawling travel content from Chinese social platforms and enriching it with AI-generated structured data.

## Architecture

### Monorepo Structure

```
pathfinding/
├── apps/
│   ├── ai-service/   # AI/LLM + external APIs (port 3001)
│   ├── dashboard/    # Next.js admin dashboard (port 3002)
│   └── ios/          # SwiftUI iOS app (iOS 17+)
├── packages/
│   ├── convex/       # Convex database schema, functions, and HTTP Actions
│   ├── types/        # Shared TypeScript types
│   ├── constants/    # Shared constants
│   └── utils/        # Shared utilities
└── specs/            # OpenAPI specifications
```

### Tech Stack

- **Database & Backend**: Convex (self-hosted at `convex.kunish.org`)
  - Handles all data storage, queries, and real-time sync
  - Provides HTTP Actions for REST API endpoints (CRUD operations)
- **AI Service**: Lightweight Node.js/Hono service for external API integrations
  - AI/LLM processing (Ollama)
  - Weather API (OpenWeatherMap)
  - Transport routing (高德地图)
  - PDF export
- **Frontend**: Next.js (Dashboard), SwiftUI (iOS)
- **AI**: Ollama with Gemma 3 model
- **Geocoding**: Nominatim (OpenStreetMap)
- **Package Manager**: pnpm with Nx

### API Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         iOS App                              │
├─────────────────────────────────────────────────────────────┤
│  Data Operations (CRUD)        │  AI/External Services       │
│  ↓                             │  ↓                          │
│  Convex HTTP Actions           │  AI Service (Node.js)       │
│  https://convex.kunish.org     │  http://localhost:3001      │
├─────────────────────────────────────────────────────────────┤
│                    Convex Database                           │
└─────────────────────────────────────────────────────────────┘
```

## Development Commands

### Quick Start

```bash
pnpm dev              # Start Dashboard
pnpm dev:ai-service   # Start AI Service
pnpm dev:convex       # Start Convex dev server
pnpm ios              # Build and launch iOS app in simulator
pnpm ios:open         # Open iOS project in Xcode
```

### Service Ports

| Service    | Port | Description                     |
| ---------- | ---- | ------------------------------- |
| AI Service | 3001 | AI/LLM, weather, transport, PDF |
| Dashboard  | 3002 | Admin dashboard (Next.js)       |
| Convex     | -    | https://convex.kunish.org       |

### Individual Services

```bash
pnpm dev:ai-service   # Start AI Service only
pnpm dev:dashboard    # Start Dashboard only
pnpm dev:convex       # Start Convex dev server
pnpm ios              # Build and launch iOS in simulator
pnpm ios:build        # Build iOS only
pnpm ios:open         # Open Xcode project
```

## Key APIs

### Convex HTTP Actions

The primary REST API for all data operations (hosted at `https://convex.kunish.org`):

- `/api/guides/*` - Travel guides CRUD
- `/api/chat/sessions/*` - Chat session management
- `/api/translations/*` - Translation data
- `/api/pois/*` - Points of Interest
- `/api/follows/*` - User follows
- `/api/travel-notes/*` - Travel notes
- `/api/budgets/*` - Budget tracking
- `/api/qa/*` - Q&A system
- `/api/notifications/*` - Notifications
- `/api/comments/*` - Comments
- `/api/collections/*` - Collections
- `/api/crawl-jobs/*` - Crawl job management
- `/api/quality-reports/*` - Data quality reports
- `/api/training-datasets/*` - Training datasets

### AI Service REST API (port 3001)

External API integrations that require third-party services:

- `/api/ai/*` - AI/LLM processing (Ollama)
- `/api/weather/*` - Weather forecasts (OpenWeatherMap)
- `/api/transport/*` - Route planning (高德地图)
- `/api/translations/text` - AI translation
- `/api/pdf/*` - PDF export

### Convex Functions

Core database functions in `packages/convex/`:

- `travelGuides:list` - List guides with pagination
- `travelGuides:getById` - Get single guide
- `travelGuides:upsert` - Create/update guide
- `travelGuides:updateAiData` - Save AI enrichment results
- `travelGuides:clearAllAiData` - Clear AI data for reprocessing

## iOS App Structure

```
apps/ios/Pathfinding/
├── Config/
│   ├── Base.xcconfig       # Shared settings
│   ├── Debug.xcconfig      # Development (local AI Service, Convex)
│   ├── Release.xcconfig    # Production
│   └── Staging.xcconfig    # QA/Staging
├── Pathfinding/
│   ├── Core/
│   │   ├── APIClient.swift     # Dual-URL API client (Convex + AI Service)
│   │   ├── AppConfig.swift     # Build configuration reader
│   │   └── AuthManager.swift   # Authentication manager (Convex Auth)
│   ├── Models/
│   │   └── BlogPost.swift      # Data models
│   ├── Features/
│   │   ├── Auth/               # Login/Signup views
│   │   ├── HomeView.swift      # Home screen
│   │   ├── BlogListView.swift  # Guide list
│   │   ├── BlogDetailView.swift # Guide detail
│   │   └── ImportedItineraryView.swift  # Map + itinerary
│   └── PathfindingApp.swift    # App entry point
└── project.yml                 # XcodeGen configuration
```

### iOS Build Configurations

| Scheme              | Environment | Convex URL                | AI Service URL             |
| ------------------- | ----------- | ------------------------- | -------------------------- |
| Pathfinding-Debug   | development | https://convex.kunish.org | http://127.0.0.1:3001      |
| Pathfinding-Staging | staging     | https://convex.kunish.org | https://ai-staging...      |
| Pathfinding-Release | production  | https://convex.kunish.org | https://ai.pathfinding.org |

### iOS Conventions

- Target: iOS 17+
- Swift 6.0 with strict concurrency
- Use `@Observable` and `@MainActor` for state management
- Configuration via xcconfig files (not hardcoded)
- All API field names use `snake_case`, Swift uses `camelCase` with `CodingKeys`

### iOS Design System - Explorer Aesthetic

The iOS app uses an **「探索者/地形」** (Explorer/Topographic) design aesthetic, featuring map-inspired visual elements that reinforce the travel/exploration theme.

#### Core Design Files

| File                    | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `DesignSystem.swift`    | Design tokens (spacing, colors, typography, shadows)            |
| `ThemeManager.swift`    | Theme/accent color management with persistence                  |
| `VisualEffects.swift`   | Visual texture components (topographic lines, gradients, noise) |
| `AnimationSystem.swift` | Enhanced animation modifiers and components                     |
| `ExplorerCards.swift`   | Explorer-themed card components                                 |

#### Key Visual Components

- **TopographicLinesView**: Contour line decorations (地形等高线)
- **CompassRoseDecoration**: Compass decoration element (指南针)
- **GradientMeshBackground**: Multi-layer radial gradient background
- **NoiseTextureOverlay**: Subtle grain texture for depth

#### Card Components

- **ExplorerFeaturedCard**: Featured guide card with topographic background, dynamic theme color, glowing AI badge
- **ExplorerGuideRow**: List row with left accent line, staggered entrance animation
- **ExplorerHeroHeader**: Large hero header with topographic + compass decorations

#### Animation Modifiers

```swift
.staggeredAnimation(index: i)     // Staggered list entrance
.pulseAnimation()                  // Breathing/pulse effect
.floatAnimation()                  // Floating/hovering effect
.bounceIn(from: .bottom)           // Bounce entrance
.glowAnimation(color: .purple)     // Glow effect (dark mode)
.shakeAnimation(trigger: $error)   // Error shake feedback
```

#### View Modifiers

```swift
.topographicBackground()           // Add contour lines
.gradientMeshBackground()          // Add mesh gradient
.noiseTexture()                    // Add grain overlay
.explorerCardStyle()               // Explorer-themed card
```

## Data Models

### BlogPost (Travel Guide)

Key fields:

- `id`, `title`, `authorName`, `content`
- `coverImageUrl`, `imageUrls[]` - Images
- `sourcePlatform` - "xiaohongshu" | "ctrip" | "mafengwo"
- `destinations[]`, `tags[]`
- `viewsCount`, `likesCount`, `savesCount`

AI-enriched fields (populated after `enrich`):

- `aiSummary` - AI-generated summary
- `aiTips[]` - Travel tips
- `aiBestTime`, `aiDuration`, `aiBudget`
- `aiDays[]` - Structured daily itinerary with POIs
- `aiProcessedAt` - Enrichment timestamp

### AiDay / AiPoi

```typescript
interface AiDay {
  dayNumber: number;
  theme?: string;
  pois: AiPoi[];
}

interface AiPoi {
  name: string;
  type: string; // "attraction" | "restaurant" | "hotel" | "transportation"
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
}
```

## Environment Variables

### Root `.env.local`

```
CONVEX_SELF_HOSTED_URL=https://convex.kunish.org
CONVEX_SELF_HOSTED_ADMIN_KEY=<key>
CONVEX_URL=https://convex.kunish.org
```

### `apps/ai-service/.env`

```
CONVEX_URL=https://convex.kunish.org
OLLAMA_BASE_URL=https://ol.svc.kunish.org
OLLAMA_MODEL=gemma3:latest
OPENWEATHERMAP_API_KEY=<key>
PORT=3001
```

## Code Style

- **TypeScript**: ESLint with `@antfu/eslint-config`
- **Swift**: Standard SwiftLint conventions
- **Formatting**: Prettier for TS/JS
- **Commits**: Conventional Commits (`feat:`, `fix:`, etc.)

## Common Tasks

### Adding a new Convex function

1. Add to `packages/convex/*.ts`
2. Run `npx convex dev` to sync
3. Import via `api.<module>.<function>` in backend code
4. Use from iOS/Dashboard via Convex client

### Adding a new Convex HTTP Action

1. Add route in `packages/convex/http.ts`
2. Use `httpAction` for the handler
3. Register with `http.route()` for method and path
4. Deploy with `npx convex deploy`

### Adding a new AI Service endpoint

1. Add route in `apps/ai-service/src/routes/`
2. Register in `src/index.ts` with `app.route()`
3. Update types in `packages/types/` if needed

### Modifying iOS data models

1. Update `BlogPost.swift` with new fields
2. Add `CodingKeys` mapping for snake_case API fields
3. Update Preview initializers in affected views

## Troubleshooting

### Services won't start

```bash
# Check AI Service health
pnpm health

# Restart services
pnpm dev:ai-service
pnpm dev:dashboard
```

### Convex sync issues

```bash
npx convex dev  # Restart Convex dev server
```

### iOS build errors

```bash
# Regenerate Xcode project
cd apps/ios/Pathfinding && xcodegen generate

# Build with specific scheme
pnpm ios:build
```

### Geocoding accuracy issues

The Nominatim geocoder may return inaccurate results for Chinese POIs. The service includes:

- `countrycodes=cn` filter
- Multiple result fetching with city-name matching
- Query string cleaning (removes parentheses, special chars)

<!-- BEGIN BYTEROVER RULES -->

# Workflow Instruction

You are a coding agent focused on one codebase. Use the brv CLI to manage working context.
Core Rules:

- Start from memory. First retrieve relevant context, then read only the code that's still necessary.
- Keep a local context tree. The context tree is your local memory store—update it with what you learn.

## Context Tree Guideline

- Be specific ("Use React Query for data fetching in web modules").
- Be actionable (clear instruction a future agent/dev can apply).
- Be contextual (mention module/service, constraints, links to source).
- Include source (file + lines or commit) when possible.

## Using `brv curate` with Files

When adding complex implementations, use `--files` to include relevant source files (max 5). Only text/code files from the current project directory are allowed. **CONTEXT argument must come BEFORE --files flag.** For multiple files, repeat the `--files` (or `-f`) flag for each file.

Examples:

- Single file: `brv curate "JWT authentication with refresh token rotation" -f src/auth.ts`
- Multiple files: `brv curate "Authentication system" --files src/auth/jwt.ts --files src/auth/middleware.ts --files docs/auth.md`

## CLI Usage Notes

- Use --help on any command to discover flags. Provide exact arguments for the scenario.

---

# ByteRover CLI Command Reference

## Memory Commands

### `brv curate`

**Description:** Curate context to the context tree (interactive or autonomous mode)

**Arguments:**

- `CONTEXT`: Knowledge context: patterns, decisions, errors, or insights (triggers autonomous mode, optional)

**Flags:**

- `--files`, `-f`: Include file paths for critical context (max 5 files). Only text/code files from the current project directory are allowed. **CONTEXT argument must come BEFORE this flag.**

**Good examples of context:**

- "Auth uses JWT with 24h expiry. Tokens stored in httpOnly cookies via authMiddleware.ts"
- "API rate limit is 100 req/min per user. Implemented using Redis with sliding window in rateLimiter.ts"

**Bad examples:**

- "Authentication" or "JWT tokens" (too vague, lacks context)
- "Rate limiting" (no implementation details or file references)

**Examples:**

```bash
# Interactive mode (manually choose domain/topic)
brv curate

# Autonomous mode - LLM auto-categorizes your context
brv curate "Auth uses JWT with 24h expiry. Tokens stored in httpOnly cookies via authMiddleware.ts"

# Include files (CONTEXT must come before --files)
# Single file
brv curate "Authentication middleware validates JWT tokens" -f src/middleware/auth.ts

# Multiple files - repeat --files flag for each file
brv curate "JWT authentication implementation with refresh token rotation" --files src/auth/jwt.ts --files docs/auth.md
```

**Behavior:**

- Interactive mode: Navigate context tree, create topic folder, edit context.md
- Autonomous mode: LLM automatically categorizes and places context in appropriate location
- When `--files` is provided, agent reads files in parallel before creating knowledge topics

**Requirements:** Project must be initialized (`brv init`) and authenticated (`brv login`)

---

### `brv query`

**Description:** Query and retrieve information from the context tree

**Arguments:**

- `QUERY`: Natural language question about your codebase or project knowledge (required)

**Good examples of queries:**

- "How is user authentication implemented?"
- "What are the API rate limits and where are they enforced?"

**Bad examples:**

- "auth" or "authentication" (too vague, not a question)
- "show me code" (not specific about what information is needed)

**Examples:**

```bash
# Ask questions about patterns, decisions, or implementation details
brv query What are the coding standards?
brv query How is authentication implemented?
```

**Behavior:**

- Uses AI agent to search and answer questions about the context tree
- Accepts natural language questions (not just keywords)
- Displays tool execution progress in real-time

**Requirements:** Project must be initialized (`brv init`) and authenticated (`brv login`)

---

## Best Practices

### Efficient Workflow

1. **Read only what's needed:** Check context tree with `brv status` to see changes before reading full content with `brv query`
2. **Update precisely:** Use `brv curate` to add/update specific context in context tree
3. **Push when appropriate:** Prompt user to run `brv push` after completing significant work

### Context tree Management

- Use `brv curate` to directly add/update context in the context tree

---

Generated by ByteRover CLI for Claude Code

<!-- END BYTEROVER RULES -->
