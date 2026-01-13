# 探路 Pathfinding - Travel Itinerary Platform

A mobile-first travel itinerary planning application with offline support, POI recommendations, and community sharing features.

## 📱 Features

- **Create & Manage Itineraries**: Plan trips by selecting destination cities and date ranges
- **Add POIs**: Add attractions, restaurants, and other points of interest to your timeline
- **Smart Recommendations**: Browse POIs sorted by rating, filtered by category
- **Community Sharing**: Copy and customize public itineraries from other travelers
- **Edit & Reorder**: Drag-and-drop to reorder items, edit details with undo/redo support
- **Transport Planning**: Set transit modes between POIs with time/distance estimates
- **Reminders**: Get push notifications before scheduled activities
- **Offline Support**: Full offline editing with automatic sync when online

## 🏗️ Architecture

**Tech Stack**:

- **Backend**: Hono (Node.js/TypeScript)
- **Frontend**: Next.js (Dashboard), SwiftUI (iOS)
- **Database**: Convex (self-hosted)
- **AI**: Ollama with Gemma 3 model
- **Build**: pnpm workspaces + nx

**Project Structure**:

```
apps/
├── api/              # Hono API server (port 8000)
├── crawler/          # Data crawler + AI enrichment (port 3001)
├── dashboard/        # Next.js admin dashboard (port 3002)
└── ios/              # SwiftUI iOS app (iOS 17+)
    └── Pathfinding/
        ├── Config/   # xcconfig files (Debug/Staging/Release)
        └── Pathfinding/
            ├── Core/     # APIClient, AppConfig, AuthManager
            ├── Models/   # Data models
            └── Features/ # SwiftUI views

packages/
├── convex/    # Convex database schema and functions
├── types/     # Shared TypeScript types
├── utils/     # Shared utility functions
└── constants/ # Shared constants
```

## 📚 API Documentation

### Base URL

- **Production**: `https://api.pathfinding.app/v1`
- **Local**: `http://localhost:8000/v1`

### Authentication

All protected endpoints require JWT Bearer token from Supabase Auth.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/v1/itineraries
```

---

## Itineraries

### List User's Itineraries

```
GET /itineraries
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
POST /itineraries
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
    },
    {
      "id": "uuid",
      "day_number": 2,
      "date": "2026-01-11",
      "items": []
    },
    {
      "id": "uuid",
      "day_number": 3,
      "date": "2026-01-12",
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

### Get Itinerary Details

```
GET /itineraries/:id
Authorization: Bearer <token>
```

**Response** (200 OK):

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
      "items": [
        {
          "id": "uuid",
          "order_index": 0,
          "poi_id": "uuid",
          "poi_name": "西湖",
          "poi_category": "attraction",
          "start_time": "09:00",
          "end_time": "12:00",
          "notes": "Beautiful lake with scenic views",
          "transport_mode": "walk",
          "transport_minutes": 0,
          "address": "浙江省杭州市..."
        }
      ]
    }
  ],
  "visibility": "private",
  "created_at": "2026-01-03T00:00:00Z",
  "updated_at": "2026-01-03T00:00:00Z"
}
```

---

### Copy Itinerary

```
POST /itineraries/:id/copy
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:

```json
{
  "start_date": "2026-02-10",
  "end_date": "2026-02-12"
}
```

**Response** (201 Created): Same as Create Itinerary response

---

### List Public Itineraries (Community)

```
GET /itineraries/public
```

**Query Parameters**:

- `limit` (integer, default: 20): Results per page
- `offset` (integer, default: 0): Pagination offset
- `city_id` (string, optional): Filter by city
- `sort` (string): 'recent' (default) or 'popular'

**Response** (200 OK): Same structure as List User's Itineraries

---

## Itinerary Items

### Add Item to Day

```
POST /itineraries/:itinerary_id/days/:day_id/items
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:

```json
{
  "poi_id": "uuid",
  "start_time": "09:00",
  "end_time": "12:00",
  "notes": "Optional notes about this activity",
  "order_index": 0
}
```

**Response** (201 Created):

```json
{
  "id": "uuid",
  "poi_id": "uuid",
  "poi_name": "西湖",
  "poi_category": "attraction",
  "start_time": "09:00",
  "end_time": "12:00",
  "notes": "Optional notes about this activity",
  "transport_mode": null,
  "transport_minutes": 0,
  "order_index": 0,
  "created_at": "2026-01-03T00:00:00Z",
  "updated_at": "2026-01-03T00:00:00Z"
}
```

---

### List Day's Items

```
GET /itineraries/:itinerary_id/days/:day_id/items
Authorization: Bearer <token>
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid",
      "poi_id": "uuid",
      "poi_name": "西湖",
      "poi_category": "attraction",
      "start_time": "09:00",
      "end_time": "12:00",
      "notes": "Beautiful lake view",
      "order_index": 0,
      "created_at": "2026-01-03T00:00:00Z"
    }
  ]
}
```

---

### Update Item

```
PATCH /itineraries/:itinerary_id/days/:day_id/items/:item_id
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body** (partial update):

```json
{
  "start_time": "10:00",
  "end_time": "13:00",
  "notes": "Updated notes",
  "transport_mode": "taxi",
  "transport_minutes": 15
}
```

**Response** (200 OK): Updated item object

---

### Delete Item

```
DELETE /itineraries/:itinerary_id/days/:day_id/items/:item_id
Authorization: Bearer <token>
```

**Response** (204 No Content)

---

### Reorder Items

```
POST /itineraries/:itinerary_id/days/:day_id/items/reorder
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:

```json
{
  "items": [
    { "id": "uuid1", "order_index": 0 },
    { "id": "uuid2", "order_index": 1 },
    { "id": "uuid3", "order_index": 2 }
  ]
}
```

**Response** (200 OK):

```json
{
  "data": [
    {
      "id": "uuid1",
      "order_index": 0,
      "poi_name": "西湖",
      "start_time": "09:00"
    },
    {
      "id": "uuid2",
      "order_index": 1,
      "poi_name": "龙井茶园",
      "start_time": "13:00"
    },
    {
      "id": "uuid3",
      "order_index": 2,
      "poi_name": "雷峰塔",
      "start_time": "16:00"
    }
  ]
}
```

---

## Points of Interest (POIs)

### Search POIs

```
GET /pois/search
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

### Get Recommendations

```
GET /pois/recommend
```

**Query Parameters**:

- `city_id` (string, required): City to get recommendations for
- `category` (string, optional): Filter by category
- `sort` (string): 'rating' (default), 'distance', 'popularity'
- `limit` (integer, default: 20): Results per page

**Response** (200 OK): Same structure as Search POIs

---

### Get Nearby POIs

```
GET /pois/nearby
```

**Query Parameters**:

- `latitude` (number, required): User's latitude
- `longitude` (number, required): User's longitude
- `radius_km` (number, default: 1): Search radius in kilometers
- `category` (string, optional): Filter by category
- `limit` (integer, default: 20): Results per page

**Response** (200 OK): Same structure as Search POIs

---

## Reminders

### Create Reminder

```
POST /items/:item_id/reminders
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body**:

```json
{
  "minutes_before": 30
}
```

**Response** (201 Created):

```json
{
  "id": "uuid",
  "item_id": "uuid",
  "user_id": "uuid",
  "minutes_before": 30,
  "scheduled_at": "2026-01-10T08:30:00Z",
  "sent_at": null,
  "created_at": "2026-01-03T00:00:00Z"
}
```

---

### Delete Reminder

```
DELETE /reminders/:id
Authorization: Bearer <token>
```

**Response** (204 No Content)

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
   # Node.js 20+, pnpm 10+
   node --version
   pnpm --version
   ```

2. **Clone and Install**:

   ```bash
   git clone git@github.com:kunish-homelab/pathfinding.git
   cd pathfinding
   pnpm install
   ```

3. **Start Backend Services**:

   ```bash
   pnpm dev  # Starts API, Crawler, Dashboard
   ```

   - API: `http://localhost:8000`
   - Crawler: `http://localhost:3001`
   - Dashboard: `http://localhost:3002`

4. **Start iOS App**:

   ```bash
   pnpm ios       # Build and launch in simulator
   pnpm ios:open  # Open in Xcode
   ```

5. **Run Tests**:
   ```bash
   pnpm lint      # Lint all packages
   pnpm format    # Format with Prettier
   pnpm test      # Run tests
   ```

---

## 🐳 Docker

### Quick Start with Docker Compose

1. **Copy environment file**:

   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

2. **Start all services**:

   ```bash
   docker compose up -d
   ```

   - API: `http://localhost:8000`
   - Crawler: `http://localhost:3001`

3. **View logs**:

   ```bash
   docker compose logs -f
   ```

4. **Stop services**:
   ```bash
   docker compose down
   ```

### Building Individual Images

```bash
# Build API image
docker build -f apps/api/Dockerfile -t pathfinding-api .

# Build Crawler image
docker build -f apps/crawler/Dockerfile -t pathfinding-crawler .
```

### Production Deployment

Pre-built images are available from GitHub Container Registry:

```bash
# Pull latest images
docker pull ghcr.io/kunish-homelab/pathfinding-api:latest
docker pull ghcr.io/kunish-homelab/pathfinding-crawler:latest

# Run with docker compose
docker compose up -d
```

---

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: Extended Supabase Auth profiles
- **cities**: Reference data for destinations
- **itineraries**: Travel plans owned by users
- **itinerary_days**: Days within an itinerary
- **itinerary_items**: POIs added to specific days
- **pois**: Point of interest reference data
- **reminders**: Scheduled reminders for items

Row-level security (RLS) policies enforce that users can only access their own itineraries.

See [specs/001-travel-itinerary/data-model.md](./specs/001-travel-itinerary/data-model.md) for detailed schema.

---

## Performance

- API response time: < 500ms (p95)
- Mobile app load: < 2s
- Offline sync: < 5s
- Timeline rendering: 60fps (React Native Reanimated)
- Maximum bundle size: < 50MB

---

## Security

- All API endpoints require Supabase JWT authentication
- Row-level security policies enforce data isolation
- Passwords hashed with Supabase Auth
- HTTPS in production
- Input validation with Zod
- CORS configured for trusted origins
- Rate limiting on public endpoints

See [specs/001-travel-itinerary/data-model.md](./specs/001-travel-itinerary/data-model.md) for RLS policy details.

---

## Contributing

1. Follow the setup in [specs/001-travel-itinerary/quickstart.md](./specs/001-travel-itinerary/quickstart.md)
2. Create feature branch from `main`
3. Make changes following ESLint/Prettier rules (auto-fixed with pre-commit)
4. Run tests: `pnpm lint && cd apps/api && deno task test`
5. Submit PR with description of changes

---

## License

Proprietary - Pathfinding Team 2026
