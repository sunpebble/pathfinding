# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pathfinding (探路)** is a travel planning application with an offline-first architecture. It helps users discover, plan, and manage travel itineraries by crawling travel content from Chinese social platforms and enriching it with AI-generated structured data.

## Architecture

### Monorepo Structure

```
pathfinding/
├── apps/
│   ├── api/          # Hono API server (port 8000)
│   ├── crawler/      # Data crawler + AI enrichment (port 3001)
│   ├── dashboard/    # Next.js admin dashboard (port 3002)
│   └── ios/          # SwiftUI iOS app (iOS 17+)
├── packages/
│   ├── convex/       # Convex database schema and functions
│   ├── types/        # Shared TypeScript types
│   ├── constants/    # Shared constants
│   └── utils/        # Shared utilities
└── specs/            # OpenAPI specifications
```

### Tech Stack

- **Database**: Convex (self-hosted at `convex.kunish.org`)
- **Backend**: Hono (Node.js/TypeScript)
- **Frontend**: Next.js (Dashboard), SwiftUI (iOS)
- **AI**: Ollama with Gemma 3 model
- **Geocoding**: Nominatim (OpenStreetMap)
- **Package Manager**: pnpm with Turborepo

## Development Commands

### Quick Start

```bash
make dev      # Start all services (API, Crawler, Dashboard)
make stop     # Stop all services
make health   # Check service health
make mobile   # Open iOS project in Xcode
```

### Service Ports

| Service   | Port | Description                      |
| --------- | ---- | -------------------------------- |
| API       | 8000 | Main REST API                    |
| Crawler   | 3001 | Data crawler + AI enrichment API |
| Dashboard | 3002 | Admin dashboard                  |

### Individual Services

```bash
make api        # Start API only
make crawler    # Start Crawler only
make dashboard  # Start Dashboard only
make convex     # Start Convex dev server
```

### AI Enrichment

```bash
# Enrich a single guide
make enrich ID=<guide_id>

# Force re-enrich (ignore already processed)
curl -X POST "http://localhost:3001/api/guides/<id>/enrich?force=true"

# List guides
make guides
```

## Key APIs

### Crawler API (port 3001)

- `GET /health` - Health check
- `GET /api/guides` - List travel guides
- `GET /api/guides/:id` - Get guide details
- `POST /api/guides/:id/enrich` - AI enrich a guide
- `POST /api/guides/:id/enrich?force=true` - Force re-enrich

### Convex Functions

Key mutations in `packages/convex/travelGuides.ts`:

- `travelGuides:list` - List guides with pagination
- `travelGuides:getById` - Get single guide
- `travelGuides:upsert` - Create/update guide
- `travelGuides:updateAiData` - Save AI enrichment results
- `travelGuides:clearAllAiData` - Clear AI data for reprocessing

## iOS App Structure

```
apps/ios/Pathfinding/Pathfinding/
├── Core/
│   └── APIClient.swift      # REST API client
├── Models/
│   └── BlogPost.swift       # Data models (matches API response)
├── Features/
│   ├── HomeView.swift       # Home screen with guide cards
│   ├── BlogListView.swift   # Guide list
│   ├── BlogDetailView.swift # Guide detail with image carousel
│   └── ImportedItineraryView.swift  # Map + itinerary view
└── PathfindingApp.swift     # App entry point
```

### iOS Conventions

- Target: iOS 17+
- Use `@Observable` pattern for state management
- API base URL: `http://127.0.0.1:3001` (for simulator)
- All API field names use `snake_case`, Swift uses `camelCase` with `CodingKeys`

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

### `apps/crawler/.env`

```
CONVEX_URL=https://convex.kunish.org
OLLAMA_BASE_URL=https://ol.svc.kunish.org
OLLAMA_MODEL=gemma3:latest
```

## Code Style

- **TypeScript**: ESLint with `@antfu/eslint-config`
- **Swift**: Standard SwiftLint conventions
- **Formatting**: Prettier for TS/JS
- **Commits**: Conventional Commits (`feat:`, `fix:`, etc.)

## Common Tasks

### Adding a new API endpoint

1. Add route in `apps/crawler/src/routes/` or `apps/api/src/routes/`
2. Register in `src/index.ts` with `app.route()`
3. Update types in `packages/types/` if needed

### Adding a new Convex function

1. Add to `packages/convex/*.ts`
2. Run `npx convex dev` to sync
3. Import via `api.<module>.<function>` in backend code

### Modifying iOS data models

1. Update `BlogPost.swift` with new fields
2. Add `CodingKeys` mapping for snake_case API fields
3. Update Preview initializers in affected views

## Troubleshooting

### Services won't start

```bash
make stop    # Kill any orphaned processes
make dev     # Restart all
```

### Convex sync issues

```bash
npx convex dev  # Restart Convex dev server
```

### iOS build errors

```bash
cd apps/ios/Pathfinding
xcodebuild -scheme Pathfinding -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

### Geocoding accuracy issues

The Nominatim geocoder may return inaccurate results for Chinese POIs. The service includes:

- `countrycodes=cn` filter
- Multiple result fetching with city-name matching
- Query string cleaning (removes parentheses, special chars)

To re-enrich with improved geocoding:

```bash
curl -X POST "http://localhost:3001/api/guides/<id>/enrich?force=true"
```
