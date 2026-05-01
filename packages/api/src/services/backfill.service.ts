import { cities, crawlJobs, getDb, guideDestinations, travelGuides } from '@pathfinding/database';

const BACKFILLABLE_FIELDS = [
  'content',
  'imageUrls',
  'destinations',
  'dayItineraries',
  'geoData',
  'enrichedData',
  'coverImageUrl',
] as const;

export interface FieldGap {
  guideId: number;
  title: string;
  platform: string;
  missingFields: string[];
  missingCount: number;
}

export interface DestinationGap {
  cityName: string;
  countryCode: string;
  guideCount: number;
}

export interface BackfillAnalysis {
  fieldGaps: FieldGap[];
  totalFieldGaps: number;
  fieldMissingDistribution: Record<string, number>;
  destinationGaps: DestinationGap[];
  totalDestinationGaps: number;
}

function getMissingFields(guide: typeof travelGuides.$inferSelect): string[] {
  const missing: string[] = [];

  if (!guide.content || guide.content.trim().length === 0) {
    missing.push('content');
  }
  if (!guide.imageUrls || guide.imageUrls.length === 0) {
    missing.push('imageUrls');
  }
  if (!guide.destinations || guide.destinations.length === 0) {
    missing.push('destinations');
  }
  if (!guide.dayItineraries || guide.dayItineraries.length === 0) {
    missing.push('dayItineraries');
  }
  if (!guide.geoData || !guide.geoData.coordinates) {
    missing.push('geoData');
  }
  if (!guide.enrichedData || Object.keys(guide.enrichedData).length === 0) {
    missing.push('enrichedData');
  }
  if (!guide.coverImageUrl || guide.coverImageUrl.trim().length === 0) {
    missing.push('coverImageUrl');
  }

  return missing;
}

export async function analyzeFieldGaps(limit = 100): Promise<FieldGap[]> {
  const db = getDb();

  const guides = await db
    .select()
    .from(travelGuides)
    .limit(500);

  const gaps: FieldGap[] = [];

  for (const guide of guides) {
    const missingFields = getMissingFields(guide);
    if (missingFields.length > 0) {
      gaps.push({
        guideId: guide.id,
        title: guide.title,
        platform: guide.platform,
        missingFields,
        missingCount: missingFields.length,
      });
    }
  }

  return gaps
    .sort((a, b) => b.missingCount - a.missingCount)
    .slice(0, limit);
}

export async function analyzeDestinationGaps(): Promise<DestinationGap[]> {
  const db = getDb();

  const allCities = await db
    .select()
    .from(cities)
    .limit(1000);

  const destinationsWithGuides = await db
    .select({ destination: guideDestinations.destination })
    .from(guideDestinations)
    .groupBy(guideDestinations.destination);

  const coveredDestinations = new Set(
    destinationsWithGuides.map(d => d.destination.toLowerCase()),
  );

  const gaps: DestinationGap[] = [];

  for (const city of allCities) {
    if (!coveredDestinations.has(city.name.toLowerCase())) {
      gaps.push({
        cityName: city.name,
        countryCode: city.countryCode ?? '',
        guideCount: 0,
      });
    }
  }

  return gaps;
}

export async function generateBackfillJobs(
  fieldGapGuideIds?: number[],
  destinationGapCities?: string[],
): Promise<{ jobsCreated: number }> {
  const db = getDb();
  let jobsCreated = 0;

  if (fieldGapGuideIds && fieldGapGuideIds.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < fieldGapGuideIds.length; i += batchSize) {
      const batch = fieldGapGuideIds.slice(i, i + batchSize);
      await db.insert(crawlJobs).values({
        platform: 'multi',
        jobType: 'field_backfill',
        config: {
          backfillType: 'field',
          targetGuideIds: batch,
        },
        status: 'pending',
      });
      jobsCreated++;
    }
  }

  if (destinationGapCities && destinationGapCities.length > 0) {
    const batchSize = 10;
    for (let i = 0; i < destinationGapCities.length; i += batchSize) {
      const batch = destinationGapCities.slice(i, i + batchSize);
      await db.insert(crawlJobs).values({
        platform: 'multi',
        jobType: 'destination_fill',
        config: {
          backfillType: 'destination',
          targetDestinations: batch,
        },
        status: 'pending',
      });
      jobsCreated++;
    }
  }

  return { jobsCreated };
}

export async function runFullAnalysis(limit = 100): Promise<BackfillAnalysis> {
  const [fieldGaps, destinationGaps] = await Promise.all([
    analyzeFieldGaps(limit),
    analyzeDestinationGaps(),
  ]);

  const fieldMissingDistribution: Record<string, number> = {};
  for (const field of BACKFILLABLE_FIELDS) {
    fieldMissingDistribution[field] = 0;
  }
  for (const gap of fieldGaps) {
    for (const field of gap.missingFields) {
      fieldMissingDistribution[field] = (fieldMissingDistribution[field] ?? 0) + 1;
    }
  }

  return {
    fieldGaps,
    totalFieldGaps: fieldGaps.length,
    fieldMissingDistribution,
    destinationGaps,
    totalDestinationGaps: destinationGaps.length,
  };
}
