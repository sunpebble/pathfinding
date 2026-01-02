import { appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * WatermelonDB schema for offline-first data storage
 * Based on data-model.md entities
 */
export const schema = appSchema({
  version: 1,
  tables: [
    // Itineraries table
    tableSchema({
      name: "itineraries",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "user_id", type: "string", isIndexed: true },
        { name: "title", type: "string" },
        { name: "city_id", type: "string", isIndexed: true },
        { name: "start_date", type: "number" }, // timestamp
        { name: "end_date", type: "number" },
        { name: "visibility", type: "string" },
        { name: "cover_image_url", type: "string", isOptional: true },
        { name: "copied_from_id", type: "string", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Itinerary days table
    tableSchema({
      name: "itinerary_days",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "itinerary_id", type: "string", isIndexed: true },
        { name: "day_number", type: "number" },
        { name: "date", type: "number" }, // timestamp
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // Itinerary items table
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
        { name: "transport_mode", type: "string" },
        { name: "transport_minutes", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
        { name: "updated_at", type: "number" },
      ],
    }),

    // POIs table (cached from server)
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

    // Cities table (cached from server)
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

    // Reminders table
    tableSchema({
      name: "reminders",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "item_id", type: "string", isIndexed: true },
        { name: "user_id", type: "string", isIndexed: true },
        { name: "minutes_before", type: "number" },
        { name: "scheduled_at", type: "number" }, // timestamp
        { name: "sent_at", type: "number", isOptional: true },
        { name: "created_at", type: "number" },
      ],
    }),

    // Sync queue for offline changes
    tableSchema({
      name: "sync_queue",
      columns: [
        { name: "table_name", type: "string", isIndexed: true },
        { name: "record_id", type: "string" },
        { name: "action", type: "string" }, // 'create', 'update', 'delete'
        { name: "payload", type: "string" }, // JSON string
        { name: "created_at", type: "number" },
        { name: "retries", type: "number" },
        { name: "last_error", type: "string", isOptional: true },
      ],
    }),
  ],
});
