# Data Model: 出行攻略 (Travel Itinerary)

**Feature**: 001-travel-itinerary  
**Date**: 2026-01-02  
**Status**: Complete

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     User        │       │   Itinerary     │       │  ItineraryDay   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──1:N─▶│ id (PK)         │──1:N─▶│ id (PK)         │
│ email           │       │ user_id (FK)    │       │ itinerary_id(FK)│
│ display_name    │       │ title           │       │ day_number      │
│ avatar_url      │       │ city_id (FK)    │       │ date            │
│ created_at      │       │ start_date      │       │ created_at      │
│ updated_at      │       │ end_date        │       │ updated_at      │
└─────────────────┘       │ visibility      │       └────────┬────────┘
                          │ cover_image_url │                │
                          │ copied_from_id  │                │
                          │ created_at      │                │1:N
                          │ updated_at      │                ▼
                          └─────────────────┘       ┌─────────────────┐
                                                    │  ItineraryItem  │
┌─────────────────┐                                 ├─────────────────┤
│      City       │                                 │ id (PK)         │
├─────────────────┤                                 │ day_id (FK)     │
│ id (PK)         │◀──────────────────────────────┤ poi_id (FK)     │
│ name            │                                 │ order_index     │
│ name_en         │                                 │ start_time      │
│ timezone        │                                 │ end_time        │
│ country_code    │                                 │ notes           │
│ latitude        │                                 │ transport_mode  │
│ longitude       │                                 │ transport_mins  │
│ created_at      │                                 │ created_at      │
└─────────────────┘                                 │ updated_at      │
                                                    └────────┬────────┘
                                                             │
┌─────────────────┐                                          │N:1
│       POI       │◀─────────────────────────────────────────┘
├─────────────────┤
│ id (PK)         │       ┌─────────────────┐
│ external_id     │       │    Reminder     │
│ name            │       ├─────────────────┤
│ name_en         │       │ id (PK)         │
│ category        │       │ item_id (FK)    │──N:1──▶ ItineraryItem
│ city_id (FK)    │       │ user_id (FK)    │
│ address         │       │ minutes_before  │
│ latitude        │       │ scheduled_at    │
│ longitude       │       │ sent_at         │
│ rating          │       │ created_at      │
│ rating_count    │       └─────────────────┘
│ price_level     │
│ business_hours  │
│ phone           │
│ image_urls      │
│ source          │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

## Entity Definitions

### User

Managed by Supabase Auth. Extended profile data.

| Field        | Type         | Constraints             | Description           |
| ------------ | ------------ | ----------------------- | --------------------- |
| id           | UUID         | PK, NOT NULL            | Supabase Auth user ID |
| email        | VARCHAR(255) | UNIQUE, NOT NULL        | User email            |
| display_name | VARCHAR(100) |                         | Display name          |
| avatar_url   | TEXT         |                         | Profile image URL     |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW() |                       |
| updated_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW() |                       |

---

### Itinerary

Core travel plan entity.

| Field           | Type         | Constraints                   | Description                 |
| --------------- | ------------ | ----------------------------- | --------------------------- |
| id              | UUID         | PK, DEFAULT gen_random_uuid() |                             |
| user_id         | UUID         | FK → users.id, NOT NULL       | Owner                       |
| title           | VARCHAR(200) | NOT NULL                      | Plan title                  |
| city_id         | UUID         | FK → cities.id, NOT NULL      | Destination city            |
| start_date      | DATE         | NOT NULL                      | Trip start date             |
| end_date        | DATE         | NOT NULL                      | Trip end date               |
| visibility      | ENUM         | DEFAULT 'private'             | 'private', 'team', 'public' |
| cover_image_url | TEXT         |                               | Cover image                 |
| copied_from_id  | UUID         | FK → itineraries.id           | Original if copied          |
| created_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |                             |
| updated_at      | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |                             |

**Validation Rules**:

- `end_date >= start_date`
- `title` length: 1-200 characters
- `visibility` only changeable by owner

**Indexes**:

- `idx_itineraries_user_id` on `user_id`
- `idx_itineraries_city_id` on `city_id`
- `idx_itineraries_visibility` on `visibility` (for public discovery)

---

### ItineraryDay

Single day within an itinerary.

| Field        | Type        | Constraints                                      | Description         |
| ------------ | ----------- | ------------------------------------------------ | ------------------- |
| id           | UUID        | PK, DEFAULT gen_random_uuid()                    |                     |
| itinerary_id | UUID        | FK → itineraries.id, NOT NULL, ON DELETE CASCADE | Parent itinerary    |
| day_number   | INTEGER     | NOT NULL, CHECK > 0                              | Day order (1-based) |
| date         | DATE        | NOT NULL                                         | Actual date         |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                          |                     |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                          |                     |

**Validation Rules**:

- `day_number` must be unique within itinerary
- `date` must be within itinerary's date range

**Indexes**:

- `idx_itinerary_days_itinerary_id` on `itinerary_id`
- UNIQUE constraint on `(itinerary_id, day_number)`

---

### ItineraryItem

Single activity/POI on a day.

| Field             | Type        | Constraints                                         | Description                             |
| ----------------- | ----------- | --------------------------------------------------- | --------------------------------------- |
| id                | UUID        | PK, DEFAULT gen_random_uuid()                       |                                         |
| day_id            | UUID        | FK → itinerary_days.id, NOT NULL, ON DELETE CASCADE | Parent day                              |
| poi_id            | UUID        | FK → pois.id                                        | Linked POI (optional for custom items)  |
| order_index       | INTEGER     | NOT NULL, DEFAULT 0                                 | Display order                           |
| start_time        | TIME        |                                                     | Planned start time                      |
| end_time          | TIME        |                                                     | Planned end time                        |
| notes             | TEXT        |                                                     | User notes                              |
| transport_mode    | ENUM        |                                                     | 'walking', 'taxi', 'driving', 'transit' |
| transport_minutes | INTEGER     |                                                     | Estimated travel time to next item      |
| created_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                             |                                         |
| updated_at        | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                             |                                         |

**Validation Rules**:

- If `start_time` and `end_time` both set: `end_time > start_time`
- `transport_minutes` must be >= 0 if set

**Indexes**:

- `idx_itinerary_items_day_id` on `day_id`
- `idx_itinerary_items_poi_id` on `poi_id`

---

### City

Destination city reference data.

| Field        | Type         | Constraints                   | Description                           |
| ------------ | ------------ | ----------------------------- | ------------------------------------- |
| id           | UUID         | PK, DEFAULT gen_random_uuid() |                                       |
| name         | VARCHAR(100) | NOT NULL                      | Chinese name                          |
| name_en      | VARCHAR(100) |                               | English name                          |
| timezone     | VARCHAR(50)  | NOT NULL                      | IANA timezone (e.g., 'Asia/Shanghai') |
| country_code | CHAR(2)      | NOT NULL                      | ISO 3166-1 alpha-2                    |
| latitude     | DECIMAL(9,6) | NOT NULL                      | City center lat                       |
| longitude    | DECIMAL(9,6) | NOT NULL                      | City center lng                       |
| created_at   | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |                                       |

**Indexes**:

- `idx_cities_name` on `name`
- `idx_cities_country_code` on `country_code`

---

### POI (Point of Interest)

Location data for attractions, restaurants, etc.

| Field          | Type         | Constraints                   | Description                                              |
| -------------- | ------------ | ----------------------------- | -------------------------------------------------------- |
| id             | UUID         | PK, DEFAULT gen_random_uuid() |                                                          |
| external_id    | VARCHAR(100) |                               | Provider ID (Gaode, etc.)                                |
| name           | VARCHAR(200) | NOT NULL                      | Chinese name                                             |
| name_en        | VARCHAR(200) |                               | English name                                             |
| category       | ENUM         | NOT NULL                      | 'attraction', 'restaurant', 'hotel', 'shopping', 'other' |
| city_id        | UUID         | FK → cities.id, NOT NULL      |                                                          |
| address        | TEXT         |                               | Full address                                             |
| latitude       | DECIMAL(9,6) | NOT NULL                      |                                                          |
| longitude      | DECIMAL(9,6) | NOT NULL                      |                                                          |
| rating         | DECIMAL(2,1) | CHECK 0-5                     | Average rating                                           |
| rating_count   | INTEGER      | DEFAULT 0                     | Number of ratings                                        |
| price_level    | INTEGER      | CHECK 1-4                     | Cost indicator                                           |
| business_hours | JSONB        |                               | Hours by day                                             |
| phone          | VARCHAR(50)  |                               | Contact phone                                            |
| image_urls     | TEXT[]       |                               | Array of image URLs                                      |
| source         | VARCHAR(50)  | NOT NULL, DEFAULT 'gaode'     | Data provider                                            |
| created_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |                                                          |
| updated_at     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       |                                                          |

**Indexes**:

- `idx_pois_city_id` on `city_id`
- `idx_pois_category` on `category`
- `idx_pois_location` using GIST on `point(longitude, latitude)` (for nearby queries)
- `idx_pois_rating` on `rating DESC`
- UNIQUE constraint on `(external_id, source)` where external_id IS NOT NULL

---

### Reminder

Push notification schedule for itinerary items.

| Field          | Type        | Constraints                                          | Description            |
| -------------- | ----------- | ---------------------------------------------------- | ---------------------- |
| id             | UUID        | PK, DEFAULT gen_random_uuid()                        |                        |
| item_id        | UUID        | FK → itinerary_items.id, NOT NULL, ON DELETE CASCADE |                        |
| user_id        | UUID        | FK → users.id, NOT NULL                              |                        |
| minutes_before | INTEGER     | NOT NULL, CHECK > 0                                  | Alert time offset      |
| scheduled_at   | TIMESTAMPTZ | NOT NULL                                             | Computed trigger time  |
| sent_at        | TIMESTAMPTZ |                                                      | When notification sent |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                              |                        |

**Indexes**:

- `idx_reminders_scheduled_at` on `scheduled_at` WHERE `sent_at IS NULL`
- `idx_reminders_item_id` on `item_id`

---

## Supabase Row Level Security (RLS)

```sql
-- Itineraries: Owner can CRUD, team members can read team itineraries
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own itineraries"
  ON itineraries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public itineraries"
  ON itineraries FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can insert own itineraries"
  ON itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own itineraries"
  ON itineraries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own itineraries"
  ON itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- Cascade to itinerary_days and itinerary_items via FK constraints
-- POIs are public read, admin write
-- Cities are public read, admin write
```

---

## WatermelonDB Schema (Mobile Offline)

```typescript
// packages/types/src/watermelon/schema.ts
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "itineraries",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "user_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "city_id", type: "string" },
        { name: "start_date", type: "number" }, // timestamp
        { name: "end_date", type: "number" },
        { name: "visibility", type: "string" },
        { name: "cover_image_url", type: "string", isOptional: true },
        { name: "copied_from_id", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "itinerary_days",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "itinerary_id", type: "string", isIndexed: true },
        { name: "day_number", type: "number" },
        { name: "date", type: "number" },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "itinerary_items",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "day_id", type: "string", isIndexed: true },
        { name: "poi_id", type: "string", isOptional: true },
        { name: "order_index", type: "number" },
        { name: "start_time", type: "string", isOptional: true },
        { name: "end_time", type: "string", isOptional: true },
        { name: "notes", type: "string", isOptional: true },
        { name: "transport_mode", type: "string", isOptional: true },
        { name: "transport_minutes", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "pois",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "name_en", type: "string", isOptional: true },
        { name: "category", type: "string", isIndexed: true },
        { name: "city_id", type: "string", isIndexed: true },
        { name: "address", type: "string", isOptional: true },
        { name: "latitude", type: "number" },
        { name: "longitude", type: "number" },
        { name: "rating", type: "number", isOptional: true },
        { name: "rating_count", type: "number" },
        { name: "price_level", type: "number", isOptional: true },
        { name: "business_hours", type: "string", isOptional: true }, // JSON string
        { name: "image_urls", type: "string", isOptional: true }, // JSON array string
      ],
    }),
    tableSchema({
      name: "cities",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "name", type: "string" },
        { name: "name_en", type: "string", isOptional: true },
        { name: "timezone", type: "string" },
        { name: "country_code", type: "string" },
        { name: "latitude", type: "number" },
        { name: "longitude", type: "number" },
      ],
    }),
  ],
});
```

---

## State Transitions

### Itinerary Lifecycle

```
┌─────────┐     create      ┌─────────┐     publish     ┌─────────┐
│  DRAFT  │ ──────────────▶ │ PRIVATE │ ──────────────▶ │ PUBLIC  │
└─────────┘                 └─────────┘                 └─────────┘
     │                           │                           │
     │         delete            │       unpublish           │
     ▼                           ▼                           ▼
┌─────────┐                 ┌─────────┐                 ┌─────────┐
│ DELETED │ ◀────────────── │ DELETED │ ◀────────────── │ PRIVATE │
└─────────┘                 └─────────┘                 └─────────┘
```

### Sync Status (WatermelonDB)

```
┌─────────┐     create      ┌─────────┐     push       ┌─────────┐
│  NEW    │ ──────────────▶ │ CREATED │ ─────────────▶ │ SYNCED  │
└─────────┘                 └─────────┘                └─────────┘
                                                            │
                                edit                        │
                                                            ▼
                            ┌─────────┐     push       ┌─────────┐
                            │ UPDATED │ ◀───────────── │ SYNCED  │
                            └─────────┘                └─────────┘
                                 │
                                 │ push
                                 ▼
                            ┌─────────┐
                            │ SYNCED  │
                            └─────────┘
```
