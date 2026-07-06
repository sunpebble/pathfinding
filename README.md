# Sunpebble Trips

A focused Sunpebble travel itinerary app for planning days, places, notes, and reminders.

A mobile-first travel itinerary planning application with offline support and private trip editing.

## 📱 Features

- **Create & Manage Itineraries**: Plan trips by selecting destination cities and date ranges
- **Add POIs**: Add attractions, restaurants, and other points of interest to your timeline
- **Smart Recommendations**: Browse POIs sorted by rating, filtered by category
- **Edit & Reorder**: Drag-and-drop to reorder items, edit details with undo/redo support
- **Transport Planning**: Set transit modes between POIs with time/distance estimates
- **Reminders**: Get push notifications before scheduled activities
- **Offline Support**: Full offline editing with automatic sync when online

## 🏗️ Architecture

**Tech Stack**:

- **Backend API**: Hono + TiDB + Flue runtime - handles CRUD, auth, shared data APIs, and agent routes
- **Frontend**: Next.js (Dashboard), SwiftUI (iOS)
- **Backend Services**: TypeScript API on Flue
- **AI**: DeepSeek API through Flue/compat routes (`DEEPSEEK_API_KEY`, optional `DEEPSEEK_MODEL` / `MODEL_SPECIFIER`)
- **Geocoding**: Nominatim (OpenStreetMap)
- **Build**: pnpm workspaces + nx

**Project Structure**:

```
apps/
├── dashboard/        # Next.js admin dashboard
└── ios/              # SwiftUI iOS app (iOS 17+)
    └── Pathfinding/
        ├── Config/   # xcconfig files (Debug/Staging/Release)
        └── Pathfinding/
            ├── Core/     # APIClient, AppConfig, AuthManager
            ├── Models/   # Data models
            └── Features/ # SwiftUI views

packages/
├── api/              # Shared backend API (Hono + Flue runtime)
├── constants/        # Shared constants
├── crawler-types/    # Crawler type definitions
├── database/         # TiDB schema and database access (Drizzle)
├── logger/           # Shared logging utilities (Pino)
├── test-utils/       # Shared test utilities
├── types/            # Shared TypeScript types
└── utils/            # Shared utility functions
```

## 📚 API Documentation

### Service URLs

| Service   | Port | Description                    |
| --------- | ---- | ------------------------------ |
| API       | 3000 | CRUD operations backed by TiDB |
| Dashboard | 3002 | Admin dashboard (Next.js)      |

### Base URLs

- **API (Local)**: `http://localhost:3000/api`
- **API (Production)**: `https://api.trips.sunpebblelabs.com/api`

### Authentication

All protected endpoints require JWT Bearer token from the shared auth service.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/guides
```

---

## Core API Endpoints

The primary backend for data operations is the shared API service:

- `/api/guides/*` - Travel guides
- `/api/chat/sessions/*` - Chat session management
- `/api/agent/chat/stream` - DeepSeek-backed planning chat stream
- `/api/agent/plan/*` - DeepSeek-backed itinerary planning
- `/agents/trips-planner/:id` - Native Flue agent endpoint
- `/api/crawler/fetch` - Generic HTML fetch and text cleanup
- `/api/weather/forecast` - Weather forecast proxy
- `/api/transport/optimize` - POI route ordering helper
- `/api/translations/*` - Translation data
- `/api/pois/*` - Points of interest
- `/api/follows/*` - User follows
- `/api/travel-notes/*` - Travel notes
- `/api/budgets/*` - Budget tracking
- `/api/qa/*` - Q&A
- `/api/notifications/*` - Notifications
- `/api/comments/*` - Comments
- `/api/collections/*` - Collections
- `/api/share/*` - Share events

See `packages/api/src/routes/` for route implementations. Mafengwo list/detail
crawlers are disabled by default because the old browser-backed parser has not
been migrated to the TypeScript API.

---

## Itineraries

### List User's Itineraries

```
GET /api/itineraries
```

**Query Parameters**:

- `limit` (integer, default: 20): Results per page (max: 100)
- `offset` (integer, default: 0): Pagination offset
- `status` (string): Filter by 'active' or 'archived'

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "杭州 3 日游",
      "city_id": "uuid",
      "city_name": "杭州",
      "start_date": "2026-01-10",
      "end_date": "2026-01-12",
      "visibility": "private",
      "cover_image_url": "https://...",
      "created_at": "2026-01-03T00:00:00Z",
      "updated_at": "2026-01-03T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

### Create Itinerary

```
POST /api/itineraries
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:

```json
{
  "title": "杭州 3 日游",
  "city_id": "uuid",
  "start_date": "2026-01-10",
  "end_date": "2026-01-12"
}
```

**Response** (201 Created):

```json
{
  "id": "uuid",
  "title": "杭州 3 日游",
  "city_id": "uuid",
  "city_name": "杭州",
  "start_date": "2026-01-10",
  "end_date": "2026-01-12",
  "days": [
    {
      "id": "uuid",
      "day_number": 1,
      "date": "2026-01-10",
      "items": []
    }
  ],
  "visibility": "private",
  "cover_image_url": null,
  "created_at": "2026-01-03T00:00:00Z",
  "updated_at": "2026-01-03T00:00:00Z"
}
```

---

## Points of Interest (POIs)

### Search POIs

```
GET /api/pois/search
```

**Query Parameters**:

- `q` (string, required): Search keyword
- `city_id` (string, optional): Filter by city
- `category` (string, optional): Filter by category (attraction, food, accommodation)
- `limit` (integer, default: 20): Results per page
- `offset` (integer, default: 0): Pagination offset

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "external_id": "dianping_123",
      "name": "西湖",
      "name_en": "West Lake",
      "category": "attraction",
      "address": "浙江省杭州市西湖区...",
      "latitude": 30.2741,
      "longitude": 120.1551,
      "rating": 4.8,
      "rating_count": 5234,
      "price_level": 1,
      "business_hours": "09:00-21:00",
      "image_urls": ["https://...", "https://..."],
      "source": "amap",
      "distance_km": 0.5
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Time slot overlaps with existing item",
    "details": {
      "conflicting_item_id": "uuid",
      "conflict_start": "09:30",
      "conflict_end": "12:00"
    }
  }
}
```

### Common Error Codes

| Code             | Status | Description                                  |
| ---------------- | ------ | -------------------------------------------- |
| UNAUTHORIZED     | 401    | Missing or invalid authentication            |
| FORBIDDEN        | 403    | Access denied (e.g., not your itinerary)     |
| NOT_FOUND        | 404    | Resource not found                           |
| VALIDATION_ERROR | 400    | Invalid request data                         |
| CONFLICT         | 409    | Business logic conflict (e.g., time overlap) |
| RATE_LIMITED     | 429    | Too many requests                            |
| INTERNAL_ERROR   | 500    | Server error                                 |

---

## Getting Started

### Local Development Setup

1. **Install Prerequisites**:

   ```bash
   # Node.js 22+, pnpm 10+
   node --version
   pnpm --version
   ```

2. **Clone and Install**:

   ```bash
   git clone git@github.com:sunpebble/trips.git
   cd pathfinding
   pnpm install
   ```

3. **Start Database**:

   ```bash
   docker compose -f docker-compose.dev.yml up tidb -d
   ```

4. **Start Development Servers**:

   ```bash
    pnpm dev              # Starts API and Dashboard
    pnpm dev:api          # Starts API service (separate terminal)
   ```

   - API: `http://localhost:3000`
   - Dashboard: `http://localhost:3002`

5. **Start iOS App**:

   ```bash
   pnpm ios       # Build and launch in simulator
   pnpm ios:open  # Open in Xcode
   ```

6. **Run Tests**:
   ```bash
   pnpm lint                                  # Lint all packages
   pnpm test                                  # Run tests
   pnpm --filter @pathfinding/api flue:build # Verify Flue runtime build
   ```

---

## 🐳 Docker

> **Note**: Docker setup is a work-in-progress. The compose file currently provides TiDB for local development. The TypeScript API (`packages/api`) runs natively via `pnpm dev:api`.

### Quick Start with Docker Compose

1. **Copy environment file**:

   ```bash
   cp .env.example .env
   # Edit .env with your local service credentials
   ```

2. **Start database for development**:

   ```bash
   docker compose -f docker-compose.dev.yml up tidb -d
   ```

3. **Start local database**:

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

4. **View logs**:

   ```bash
   docker compose -f docker-compose.dev.yml logs -f
   ```

5. **Stop services**:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

---

## Database Schema

The application uses TiDB with the following main tables:

- **users**: User profiles and authentication
- **cities**: Reference data for destinations
- **itineraries**: Travel plans owned by users
- **itineraryDays**: Days within an itinerary
- **itineraryItems**: POIs added to specific days
- **pois**: Point of interest reference data
- **reminders**: Scheduled reminders for items
- **travelGuides**: Crawled travel guide content with AI enrichment

See `packages/database/src/schema/` for detailed schema.

---

## Performance

- API response time: < 500ms (p95)
- Mobile app load: < 2s
- Offline sync: < 5s
- Maximum bundle size: < 50MB

---

## Security

- All API endpoints require JWT authentication
- API handlers enforce data access control
- HTTPS in production
- Input validation with Zod
- CORS configured for trusted origins
- Rate limiting on public endpoints

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

---

## License

ISC License
