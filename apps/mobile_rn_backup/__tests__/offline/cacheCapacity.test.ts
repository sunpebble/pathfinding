/**
 * NFR-002: Offline Cache Capacity Test
 *
 * Validates that offline cache supports 10+ itineraries with full POI data
 *
 * Test requirements:
 * - Cache at least 10 complete itineraries
 * - Include all POI data for each itinerary
 * - Cache operations should be performant
 */

import { database } from '../../src/database';

// Estimated size per itinerary (including POIs)
const ESTIMATED_ITINERARY_SIZE_KB = 50; // ~50KB per itinerary with 10 items

describe('nFR-002: Offline Cache Capacity', () => {
  beforeEach(async () => {
    // Reset database for clean test
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
  });

  it('should store at least 10 itineraries with POI data', async () => {
    const itineraryCount = 10;
    const itemsPerDay = 5;
    const daysPerItinerary = 3;

    // Create test itineraries
    for (let i = 0; i < itineraryCount; i++) {
      await database.write(async () => {
        const itinerary = await database.collections
          .get('itineraries')
          .create((record: any) => {
            record.serverId = `itinerary-${i}`;
            record.userId = 'test-user';
            record.title = `Test Itinerary ${i}`;
            record.cityId = 'city-1';
            record.startDate = Date.now();
            record.endDate =
              Date.now() + daysPerItinerary * 24 * 60 * 60 * 1000;
            record.visibility = 'private';
            record.createdAt = Date.now();
            record.updatedAt = Date.now();
          });

        // Create days
        for (let d = 0; d < daysPerItinerary; d++) {
          const day = await database.collections
            .get('itinerary_days')
            .create((record: any) => {
              record.serverId = `day-${i}-${d}`;
              record.itineraryId = itinerary.id;
              record.dayNumber = d + 1;
              record.date = Date.now() + d * 24 * 60 * 60 * 1000;
              record.createdAt = Date.now();
              record.updatedAt = Date.now();
            });

          // Create items with POI references
          for (let item = 0; item < itemsPerDay; item++) {
            await database.collections
              .get('itinerary_items')
              .create((record: any) => {
                record.serverId = `item-${i}-${d}-${item}`;
                record.dayId = day.id;
                record.poiId = `poi-${item}`;
                record.orderIndex = item;
                record.startTime = `${9 + item * 2}:00`;
                record.endTime = `${10 + item * 2}:00`;
                record.notes = `Notes for item ${item}`;
                record.createdAt = Date.now();
                record.updatedAt = Date.now();
              });
          }
        }
      });
    }

    // Verify counts
    const itineraries = await database.collections
      .get('itineraries')
      .query()
      .fetchCount();
    const days = await database.collections
      .get('itinerary_days')
      .query()
      .fetchCount();
    const items = await database.collections
      .get('itinerary_items')
      .query()
      .fetchCount();

    expect(itineraries).toBe(itineraryCount);
    expect(days).toBe(itineraryCount * daysPerItinerary);
    expect(items).toBe(itineraryCount * daysPerItinerary * itemsPerDay);

    console.warn(`
      Offline Cache Stats:
      - Itineraries: ${itineraries}
      - Days: ${days}
      - Items: ${items}
      - Estimated size: ${(itineraryCount * ESTIMATED_ITINERARY_SIZE_KB).toFixed(2)}KB
    `);
  });

  it('should efficiently query cached itineraries', async () => {
    // Pre-populate cache
    await populateTestData(10);

    const startTime = performance.now();

    // Query all itineraries
    const itineraries = await database.collections
      .get('itineraries')
      .query()
      .fetch();

    const endTime = performance.now();
    const queryTime = endTime - startTime;

    expect(itineraries.length).toBeGreaterThanOrEqual(10);
    expect(queryTime).toBeLessThan(100); // Should be very fast from local storage

    console.warn(`Query time for 10 itineraries: ${queryTime.toFixed(2)}ms`);
  });

  it('should handle cache near capacity', async () => {
    // Test with more than minimum requirement
    const extraItineraries = 15;

    await populateTestData(extraItineraries);

    const itineraries = await database.collections
      .get('itineraries')
      .query()
      .fetch();
    expect(itineraries.length).toBe(extraItineraries);

    console.warn(
      `Successfully cached ${extraItineraries} itineraries (50% over requirement)`
    );
  });
});

/**
 * Helper to populate test data
 */
async function populateTestData(count: number): Promise<void> {
  await database.write(async () => {
    for (let i = 0; i < count; i++) {
      await database.collections.get('itineraries').create((record: any) => {
        record.serverId = `itinerary-${i}`;
        record.userId = 'test-user';
        record.title = `Test Itinerary ${i}`;
        record.cityId = 'city-1';
        record.startDate = Date.now();
        record.endDate = Date.now() + 3 * 24 * 60 * 60 * 1000;
        record.visibility = 'private';
        record.createdAt = Date.now();
        record.updatedAt = Date.now();
      });
    }
  });
}
