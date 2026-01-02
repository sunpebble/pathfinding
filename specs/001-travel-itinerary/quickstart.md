# Quickstart: 出行攻略 (Travel Itinerary)

**Feature**: 001-travel-itinerary  
**Date**: 2026-01-02

## Prerequisites

- **Node.js** 20.x or later
- **pnpm** 8.x or later
- **Deno** 1.40+ (stable channel)
- **Docker** (for local Supabase)
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Simulator** (macOS) or **Android Studio** (for emulator)

## Initial Setup

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone git@github.com:kunish-homelab/pathfinding.git
cd pathfinding

# Install dependencies with pnpm workspaces
pnpm install
```

### 2. Configure Environment Variables

```bash
# Copy environment templates
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# Edit apps/api/.env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
SENTRY_DSN=your-sentry-dsn
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Edit apps/mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:8000/v1
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start Local Supabase

```bash
# Start Supabase containers (PostgreSQL, Auth, Realtime, Storage)
npx supabase start

# Apply database migrations
npx supabase db push

# Seed sample data (optional)
npx supabase db seed
```

Output will show your local Supabase credentials:

```
API URL: http://localhost:54321
anon key: eyJhbGciOiJI...
service_role key: eyJhbGciOiJI...
```

### 4. Start Backend API (Deno)

```bash
# Terminal 1: Start API server
cd apps/api
deno task dev

# API running at http://localhost:8000
# Health check: http://localhost:8000/health
```

### 5. Start Mobile App (Expo)

```bash
# Terminal 2: Start Expo development server
cd apps/mobile
pnpm start

# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
# Scan QR code with Expo Go for physical device
```

## Project Structure

```
pathfinding/
├── apps/
│   ├── api/                  # Deno + Hono backend
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   └── middleware/   # Auth, tracing
│   │   ├── tests/
│   │   └── deno.json
│   │
│   └── mobile/               # React Native + Expo
│       ├── src/
│       │   ├── screens/      # Screen components
│       │   ├── components/   # Reusable UI
│       │   ├── services/     # API clients
│       │   └── hooks/        # Custom hooks
│       ├── __tests__/
│       └── app.json
│
├── packages/
│   ├── types/                # Shared TypeScript types
│   ├── utils/                # Shared utilities
│   └── constants/            # Shared constants
│
├── supabase/
│   ├── migrations/           # Database migrations
│   └── seed/                 # Sample data
│
├── specs/                    # Feature specifications
│   └── 001-travel-itinerary/
│
├── turbo.json                # Turborepo config
├── pnpm-workspace.yaml       # pnpm workspace config
└── package.json              # Root package.json
```

## Development Commands

### Turborepo Commands (Root)

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint all packages
pnpm lint

# Type check all packages
pnpm typecheck

# Build only affected packages
pnpm build --filter=...[HEAD^1]
```

### API Commands (apps/api)

```bash
# Start development server with hot reload
deno task dev

# Run tests
deno task test

# Run tests with coverage
deno task test:cov

# Format code
deno fmt

# Lint code
deno lint
```

### Mobile Commands (apps/mobile)

```bash
# Start Expo development server
pnpm start

# Start with cache cleared
pnpm start --clear

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Build for iOS (requires EAS CLI)
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

### Supabase Commands

```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# Create new migration
npx supabase migration new <migration_name>

# Apply migrations
npx supabase db push

# Reset database (destructive)
npx supabase db reset

# Generate TypeScript types from schema
npx supabase gen types typescript --local > packages/types/src/database.ts
```

## Testing the Feature

### 1. Create Test User

```bash
# Using Supabase Dashboard (http://localhost:54323)
# Or via API:
curl -X POST http://localhost:54321/auth/v1/signup \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### 2. Test API Endpoints

```bash
# Get auth token
TOKEN=$(curl -X POST http://localhost:54321/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: your-anon-key" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')

# Create itinerary
curl -X POST http://localhost:8000/v1/itineraries \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "杭州3日游",
    "cityId": "city-uuid-here",
    "startDate": "2026-01-10",
    "endDate": "2026-01-12"
  }'

# List itineraries
curl http://localhost:8000/v1/itineraries \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Test Mobile App

1. Open Expo Go on your device or simulator
2. Sign in with test user credentials
3. Create a new itinerary
4. Add POIs to the timeline
5. Test drag-and-drop reordering
6. Test offline mode (disable network)

## Debugging

### API Logs

```bash
# Deno logs are output to console
# For structured logs, use:
deno task dev 2>&1 | jq .
```

### Mobile Logs

```bash
# React Native logs in Expo CLI output
# For native logs:
# iOS: Console.app → Filter by process
# Android: adb logcat *:S ReactNative:V ReactNativeJS:V
```

### Database Inspection

```bash
# Connect to local PostgreSQL
psql postgresql://postgres:postgres@localhost:54322/postgres

# Or use Supabase Studio
open http://localhost:54323
```

### OpenTelemetry Tracing

```bash
# Start Jaeger for trace visualization
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# View traces at http://localhost:16686
```

## Common Issues

### "Cannot connect to Supabase"

- Ensure `npx supabase start` is running
- Check that environment variables match Supabase output
- Verify no port conflicts on 54321, 54322, 54323

### "WatermelonDB sync failed"

- Clear app data and reinstall
- Check API sync endpoint is accessible
- Verify JWT token is valid

### "Drag-drop not smooth"

- Ensure Reanimated worklet is on UI thread
- Check `react-native-gesture-handler` is properly linked
- Verify no JS thread blocking operations

### "Push notifications not working"

- iOS: Check Expo push token registration
- Android: Verify FCM configuration
- Test with Expo push notification tool

## Next Steps

1. Review [spec.md](./spec.md) for detailed requirements
2. Review [data-model.md](./data-model.md) for database schema
3. Review [contracts/itinerary-api.yaml](./contracts/itinerary-api.yaml) for API specification
4. Run `/speckit.tasks` to generate implementation tasks
