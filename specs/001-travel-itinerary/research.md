# Research: 出行攻略 (Travel Itinerary)

**Feature**: 001-travel-itinerary  
**Date**: 2026-01-02  
**Status**: Complete

## Research Tasks

### 1. Offline Storage Solution

**Decision**: WatermelonDB

**Rationale**:

- Designed specifically for React Native with SQLite backend
- Built-in sync adapter with `pullChanges`/`pushChanges` pattern
- Content-based conflict resolution (per-column client-wins strategy)
- Lazy loading for large datasets (important for itineraries with many items)
- JSI/Turbo mode for performance-critical initial syncs

**Alternatives Considered**:

- **AsyncStorage**: Rejected - key-value only, no relational queries, poor performance with large datasets
- **Realm**: Rejected - heavier SDK, vendor lock-in concerns
- **SQLite direct**: Rejected - requires manual sync implementation, no reactive queries

**Implementation Pattern**:

```typescript
// Sync configuration from WatermelonDB docs
await synchronize({
  database,
  pullChanges: async ({ lastPulledAt }) => {
    const response = await fetch(`/api/sync?last_pulled_at=${lastPulledAt}`);
    const { changes, timestamp } = await response.json();
    return { changes, timestamp };
  },
  pushChanges: async ({ changes, lastPulledAt }) => {
    await fetch("/api/sync", {
      method: "POST",
      body: JSON.stringify({ changes, lastPulledAt }),
    });
  },
  conflictResolver: (table, local, remote, resolved) => {
    // For itinerary items: keep local order if user was actively editing
    if (table === "itinerary_items" && local._status === "updated") {
      return { ...resolved, order_index: local.order_index };
    }
    return resolved;
  },
});
```

---

### 2. Drag-and-Drop Timeline

**Decision**: react-native-reanimated-dnd

**Rationale**:

- Purpose-built for React Native sortable lists
- Uses Reanimated 3 for 60fps native animations
- `SortableItem.Handle` pattern for controlled drag initiation
- Works with FlatList for virtualized large lists

**Alternatives Considered**:

- **react-native-draggable-flatlist**: Rejected - less active maintenance, older Reanimated version
- **Custom implementation**: Rejected - complex gesture handling, time-consuming

**Implementation Pattern**:

```tsx
// From react-native-reanimated-dnd docs
<Sortable
  data={itineraryItems}
  renderItem={({ item, id, positions, ...props }) => (
    <SortableItem key={id} id={id} positions={positions} {...props}>
      <View style={styles.itemContent}>
        <Text>{item.title}</Text>
        <SortableItem.Handle style={styles.dragHandle}>
          <DragIcon />
        </SortableItem.Handle>
      </View>
    </SortableItem>
  )}
  itemHeight={80}
  onDrop={(itemId, position, allPositions) => {
    // Update order_index in local state and mark for sync
  }}
/>
```

---

### 3. Backend API Framework

**Decision**: Hono with Zod validation

**Rationale**:

- Ultrafast, built on Web Standards (perfect for Deno)
- Type-safe routes with Zod validator middleware
- OpenAPI generation with `hono-openapi`
- Lightweight (< 20KB) for serverless deployment

**Alternatives Considered**:

- **Oak**: Rejected - less type-safe, no built-in validation middleware
- **Fresh**: Rejected - full-stack framework, overkill for API-only

**Implementation Pattern**:

```typescript
// From Hono docs - CRUD route with Zod validation
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const createItinerarySchema = z.object({
  title: z.string().min(1).max(100),
  city: z.string(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

app.post(
  "/itineraries",
  zValidator("json", createItinerarySchema),
  async (c) => {
    const data = c.req.valid("json");
    const itinerary = await itineraryService.create(data);
    return c.json({ itinerary }, 201);
  }
);
```

---

### 4. POI Data Source

**Decision**: Initial - Gaode Maps API (高德地图) + Local POI database

**Rationale**:

- Gaode Maps is the most popular map service in China with rich POI data
- Supports offline tile caching (required by constitution)
- Native SDK available for React Native
- Local POI database for custom ratings and community data

**Alternative Approaches**:

- **Mapbox**: Better for international travel, consider as secondary provider
- **Third-party aggregators**: Meituan/Dianping APIs for restaurant data (Phase 2)

**Implementation Strategy**:

1. Use Gaode POI search API for initial recommendations
2. Cache POI data in Supabase for offline access
3. Layer community ratings on top of base POI data
4. Implement adapter interface for provider switching

---

### 5. Third-Party Deep Links

**Decision**: Use `expo-linking` with platform-specific URL schemes

**Rationale**:

- Expo provides unified API for both iOS and Android
- Handles app installation checks gracefully
- Falls back to App Store/Play Store if app not installed

**Implementation Pattern**:

```typescript
// Deep link patterns
const DEEP_LINKS = {
  didi: {
    ios: "didiglobal://",
    android: "didiglobal://",
    params: (from: Location, to: Location) =>
      `tlat=${to.lat}&tlng=${to.lng}&flat=${from.lat}&flng=${from.lng}`,
  },
  gaode: {
    ios: "iosamap://",
    android: "amapuri://",
    params: (from: Location, to: Location) =>
      `path?sourceApplication=pathfinding&slat=${from.lat}&slon=${from.lng}&dlat=${to.lat}&dlon=${to.lng}&dev=0&t=0`,
  },
};

async function openNavigation(
  provider: "didi" | "gaode",
  from: Location,
  to: Location
) {
  const link = DEEP_LINKS[provider];
  const url = `${Platform.select({
    ios: link.ios,
    android: link.android,
  })}${link.params(from, to)}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback to app store
    await Linking.openURL(APP_STORE_URLS[provider]);
  }
}
```

---

### 6. Push Notifications

**Decision**: Expo Push Notifications + Supabase Edge Functions

**Rationale**:

- Expo Notifications handles iOS/Android differences
- Supabase scheduled functions for time-based triggers
- No need for separate push service (Firebase/APNs direct)

**Implementation Strategy**:

1. Store push tokens in Supabase `user_devices` table
2. Create `reminders` table with scheduled_at timestamp
3. Supabase cron job checks reminders every minute
4. Edge function sends Expo push when scheduled_at reached

---

### 7. Timezone Handling

**Decision**: Store all times in UTC, display in destination timezone

**Rationale**:

- Consistent server-side processing
- Itinerary items display in trip destination timezone
- Reminders trigger based on destination local time

**Implementation Pattern**:

```typescript
// packages/utils/src/dateUtils.ts
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export function formatItineraryTime(
  utcTime: string,
  destinationTimezone: string,
  format: string = "HH:mm"
): string {
  return formatInTimeZone(new Date(utcTime), destinationTimezone, format);
}

export function scheduleReminderTime(
  itemStartTime: string, // UTC
  reminderMinutesBefore: number,
  destinationTimezone: string
): Date {
  const itemLocal = toZonedTime(new Date(itemStartTime), destinationTimezone);
  return new Date(itemLocal.getTime() - reminderMinutesBefore * 60 * 1000);
}
```

---

## Technology Decisions Summary

| Area               | Decision                    | Confidence |
| ------------------ | --------------------------- | ---------- |
| Offline Storage    | WatermelonDB                | High       |
| Drag-Drop          | react-native-reanimated-dnd | High       |
| Backend Framework  | Hono + Zod                  | High       |
| State Management   | Zustand                     | Medium     |
| POI Data           | Gaode Maps API              | Medium     |
| Deep Links         | expo-linking                | High       |
| Push Notifications | Expo + Supabase             | Medium     |
| Timezone           | date-fns-tz (UTC storage)   | High       |

## Remaining Questions (for future phases)

1. **POI Rating Aggregation**: How to combine Gaode ratings with community ratings? (Phase 2)
2. **Offline Map Tiles**: Storage limits and caching strategy for map tiles (Phase 2)
3. **Multi-language POI**: Handle POI names in multiple languages for international travel (Phase 3)
