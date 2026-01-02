import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {
  City,
  Itinerary,
  ItineraryDay,
  ItineraryItem,
  Poi,
  Reminder,
  SyncQueue,
} from './models';
import { schema } from './schema';

/**
 * SQLite adapter for WatermelonDB
 */
const adapter = new SQLiteAdapter({
  schema,
  // Database file name
  dbName: 'pathfinding',
  // Use JSI for better performance
  jsi: true,
  // Enable WAL mode for better concurrency
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

/**
 * WatermelonDB database instance
 */
export const database = new Database({
  adapter,
  modelClasses: [
    Itinerary,
    ItineraryDay,
    ItineraryItem,
    Poi,
    City,
    Reminder,
    SyncQueue,
  ],
});

/**
 * Get typed collection helpers
 */
export const collections = {
  itineraries: database.get<Itinerary>('itineraries'),
  itineraryDays: database.get<ItineraryDay>('itinerary_days'),
  itineraryItems: database.get<ItineraryItem>('itinerary_items'),
  pois: database.get<Poi>('pois'),
  cities: database.get<City>('cities'),
  reminders: database.get<Reminder>('reminders'),
  syncQueue: database.get<SyncQueue>('sync_queue'),
};

export * from './models';
export { schema } from './schema';
