/**
 * Guide Enrichment API Routes
 * AI-powered travel guide data enhancement with geocoding and validation
 */

import type { Context } from 'hono';
import type { Id } from '../lib/convex.js';
import type { GeocodingStrategy } from '../services/geocoding.service.js';
import { Hono } from 'hono';
import { api, convex } from '../lib/convex.js';
import { withConcurrency } from '../lib/retry.js';
import {
  normalizePoiName,
  normalizePoiType,
  toStorageFormat,
  validateExtractedDays,
} from '../processors/poi-validator.js';
import { getGeocodingService } from '../services/geocoding.service.js';
import { getOllamaService } from '../services/ollama.service.js';

export const guideEnrichmentRouter = new Hono();

/**
 * POST /api/guides/:id/enrich
 * Run AI enrichment on a single guide with validation
 */
guideEnrichmentRouter.post('/:id/enrich', async (c: Context) => {
  const id = c.req.param('id') as Id<'travelGuides'>;
  const force = c.req.query('force') === 'true';
  const skipValidation = c.req.query('skip_validation') === 'true';
  const strategy = (c.req.query('strategy') || 'multi') as GeocodingStrategy;

  try {
    // 1. Get the guide
    const guide = await convex.query(api.travelGuides.getById, { id });
    if (!guide) {
      return c.json({ error: 'Guide not found' }, 404);
    }

    // Check if already processed (skip if force=true)
    if (guide.aiProcessedAt && !force) {
      return c.json({
        message: 'Guide already processed',
        processedAt: new Date(guide.aiProcessedAt).toISOString(),
        guide_id: id,
      });
    }

    // 2. Extract day-based itinerary using AI
    const ollamaService = getOllamaService();
    const isAvailable = await ollamaService.healthCheck();
    if (!isAvailable) {
      return c.json({ error: 'AI service unavailable' }, 503);
    }

    console.warn(`[Enrich] Processing guide: ${guide.title}`);

    const extraction = await ollamaService.extractDayBasedItinerary(
      guide.content,
      guide.destinations
    );

    // 3. Geocode POIs using enhanced unified GeocodingService
    const geocodingService = getGeocodingService();
    const city = guide.destinations[0] || '';

    const geocodedDays = await Promise.all(
      extraction.days.map(async (day) => {
        const geocodedPois = await Promise.all(
          day.pois.map(async (poi) => {
            // Normalize name before geocoding for better results
            const cleanName = normalizePoiName(poi.name);
            const location = await geocodingService.geocode(cleanName, city, {
              strategy,
              crossValidate: true,
            });

            // Validate geocoding result
            const coords = location
              ? geocodingService.validateCoordinates(
                  location.latitude,
                  location.longitude,
                  city
                )
              : { valid: false };

            // Build POI with all enhanced metadata
            const geocodedPoi: {
              name: string;
              type: string;
              description?: string;
              latitude: number;
              longitude: number;
              address?: string;
              geocodeConfidence: number;
              geocodeSource: string;
              duration?: string;
              priceInfo?: string;
              openingHours?: string;
              tips?: string;
              rating?: number;
              highlights?: string[];
              transportToNext?: {
                mode?: string;
                duration?: string;
                distance?: string;
                notes?: string;
              };
            } = {
              name: poi.name,
              type: poi.type,
              description: poi.description,
              latitude: coords.valid ? location!.latitude : 0,
              longitude: coords.valid ? location!.longitude : 0,
              address: coords.valid ? location!.address : undefined,
              geocodeConfidence: location?.confidence ?? 0,
              geocodeSource: location?.source ?? 'none',
            };

            // Preserve enhanced metadata from AI extraction
            if (poi.duration) geocodedPoi.duration = poi.duration;
            if (poi.priceInfo) geocodedPoi.priceInfo = poi.priceInfo;
            if (poi.openingHours) geocodedPoi.openingHours = poi.openingHours;
            if (poi.tips) geocodedPoi.tips = poi.tips;
            if (poi.rating) geocodedPoi.rating = poi.rating;
            if (poi.highlights && poi.highlights.length > 0) {
              geocodedPoi.highlights = poi.highlights;
            }
            if (poi.transportToNext) {
              geocodedPoi.transportToNext = poi.transportToNext;
            }

            return geocodedPoi;
          })
        );

        return {
          dayNumber: day.dayNumber,
          theme: day.theme,
          pois: geocodedPois,
        };
      })
    );

    // 4. Validate and clean extracted data
    let finalDays: Array<{
      dayNumber: number;
      theme?: string;
      pois: Array<{
        name: string;
        type: string;
        description?: string;
        latitude: number;
        longitude: number;
        address?: string;
      }>;
    }> = geocodedDays;
    let validationStats = null;

    if (!skipValidation) {
      const validationResult = validateExtractedDays(geocodedDays, {
        removeInvalid: false, // Keep all POIs but mark invalid ones
        deduplicate: true,
        minValidationScore: 0.3,
      });

      validationStats = validationResult.stats;

      // Convert back to storage format (removes validation metadata)
      finalDays = toStorageFormat(validationResult.days);

      console.warn(
        `[Enrich] Validation: ${validationStats.validPois}/${validationStats.totalPois} valid, ` +
          `${validationStats.duplicatesRemoved} duplicates removed`
      );
    }

    // 5. Save to Convex
    await convex.mutation(api.travelGuides.updateAiData, {
      id,
      aiSummary: extraction.summary,
      aiTips: extraction.tips,
      aiBestTime: extraction.bestTime,
      aiDuration: extraction.duration,
      aiBudget: extraction.budget,
      aiDays: finalDays,
    });

    console.warn(`[Enrich] Completed: ${guide.title}`);

    const totalPois = finalDays.reduce((sum, d) => sum + d.pois.length, 0);
    const poisWithCoords = finalDays.reduce(
      (sum, d) =>
        sum +
        d.pois.filter((p) => p.latitude !== 0 && p.longitude !== 0).length,
      0
    );

    return c.json({
      success: true,
      guide_id: id,
      title: guide.title,
      days_extracted: finalDays.length,
      pois_total: totalPois,
      pois_geocoded: poisWithCoords,
      geocode_rate:
        totalPois > 0 ? Math.round((poisWithCoords / totalPois) * 100) : 0,
      validation: validationStats,
      geocoding: {
        strategy,
        metrics: geocodingService.getMetrics(),
        service_status: geocodingService.getServiceStatus(),
        cache_stats: geocodingService.getCacheStats(),
      },
    });
  } catch (error: any) {
    console.error('[Enrich] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/guides/enrich/batch
 * Batch enrich multiple guides with validation and controlled concurrency
 */
guideEnrichmentRouter.post('/enrich/batch', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}));
  const limit = body.limit || 5;
  const skipValidation = body.skipValidation || false;
  const force = body.force || false; // Force re-process even if already has AI data
  const concurrency = Math.min(body.concurrency || 2, 5); // Max 5 concurrent AI extractions
  const strategy = (body.strategy || 'multi') as GeocodingStrategy;

  try {
    // Get guides - if force, get all; otherwise only unprocessed
    const guides = await convex.query(api.travelGuides.list, { limit: 50 });
    const toProcess = force
      ? guides.slice(0, limit)
      : guides
          .filter((g: { aiProcessedAt?: number }) => !g.aiProcessedAt)
          .slice(0, limit);

    if (toProcess.length === 0) {
      return c.json({ message: 'No guides to process', processed: 0 });
    }

    const ollamaService = getOllamaService();
    const geocodingService = getGeocodingService();

    // Process guides with controlled concurrency for AI extraction
    // Note: Geocoding is rate-limited by provider, so we do parallel AI extraction
    // then sequential geocoding per guide
    const processedResults = await withConcurrency(
      toProcess,
      async (guide: {
        _id: string;
        title?: string;
        content: string;
        destinations: string[];
      }) => {
        const city = guide.destinations[0] || '';

        // Extract itinerary (AI step - can be parallelized)
        const extraction = await ollamaService.extractDayBasedItinerary(
          guide.content,
          guide.destinations
        );

        // Geocode POIs (rate-limited, sequential within each guide)
        const geocodedDays: Array<{
          dayNumber: number;
          theme?: string;
          pois: Array<{
            name: string;
            type: string;
            description?: string;
            latitude: number;
            longitude: number;
            address?: string;
            geocodeConfidence?: number;
            geocodeSource?: string;
            duration?: string;
            priceInfo?: string;
            openingHours?: string;
            tips?: string;
            rating?: number;
            highlights?: string[];
            transportToNext?: {
              mode?: string;
              duration?: string;
              distance?: string;
              notes?: string;
            };
          }>;
        }> = [];

        for (const day of extraction.days) {
          const geocodedPois: Array<{
            name: string;
            type: string;
            description?: string;
            latitude: number;
            longitude: number;
            address?: string;
            geocodeConfidence?: number;
            geocodeSource?: string;
            duration?: string;
            priceInfo?: string;
            openingHours?: string;
            tips?: string;
            rating?: number;
            highlights?: string[];
            transportToNext?: {
              mode?: string;
              duration?: string;
              distance?: string;
              notes?: string;
            };
          }> = [];

          for (const poi of day.pois) {
            const cleanName = normalizePoiName(poi.name);
            const location = await geocodingService.geocode(cleanName, city, {
              strategy,
              crossValidate: true,
            });

            const coords = location
              ? geocodingService.validateCoordinates(
                  location.latitude,
                  location.longitude,
                  city
                )
              : { valid: false };

            const geocodedPoi: (typeof geocodedPois)[number] = {
              name: poi.name,
              type: normalizePoiType(poi.type),
              description: poi.description,
              latitude: coords.valid ? location!.latitude : 0,
              longitude: coords.valid ? location!.longitude : 0,
              address: coords.valid ? location!.address : undefined,
              geocodeConfidence: location?.confidence ?? 0,
              geocodeSource: location?.source ?? 'none',
            };

            // Preserve enhanced metadata from AI extraction
            if (poi.duration) geocodedPoi.duration = poi.duration;
            if (poi.priceInfo) geocodedPoi.priceInfo = poi.priceInfo;
            if (poi.openingHours) geocodedPoi.openingHours = poi.openingHours;
            if (poi.tips) geocodedPoi.tips = poi.tips;
            if (poi.rating) geocodedPoi.rating = poi.rating;
            if (poi.highlights && poi.highlights.length > 0) {
              geocodedPoi.highlights = poi.highlights;
            }
            if (poi.transportToNext) {
              geocodedPoi.transportToNext = poi.transportToNext;
            }

            geocodedPois.push(geocodedPoi);
          }

          geocodedDays.push({
            dayNumber: day.dayNumber,
            theme: day.theme,
            pois: geocodedPois,
          });
        }

        // Validate and deduplicate
        let finalDays = geocodedDays;
        if (!skipValidation) {
          const validationResult = validateExtractedDays(geocodedDays, {
            removeInvalid: false,
            deduplicate: true,
            minValidationScore: 0.3,
          });
          finalDays = toStorageFormat(validationResult.days);
        }

        // Save to database
        await convex.mutation(api.travelGuides.updateAiData, {
          id: guide._id as Id<'travelGuides'>,
          aiSummary: extraction.summary,
          aiTips: extraction.tips,
          aiBestTime: extraction.bestTime,
          aiDuration: extraction.duration,
          aiBudget: extraction.budget,
          aiDays: finalDays,
        });

        const totalPois = finalDays.reduce((sum, d) => sum + d.pois.length, 0);
        const poisWithCoords = finalDays.reduce(
          (sum, d) => sum + d.pois.filter((p) => p.latitude !== 0).length,
          0
        );

        console.warn(
          `[Batch] Processed: ${guide.title} (${poisWithCoords}/${totalPois} geocoded)`
        );

        return {
          id: guide._id,
          title: guide.title || 'Untitled',
          success: true,
          pois_total: totalPois,
          pois_geocoded: poisWithCoords,
        };
      },
      {
        concurrency,
        onError: (error, guide) => {
          console.error(`[Batch] Failed: ${guide.title}`, error.message);
        },
      }
    );

    // Transform results
    const results: Array<{
      id: string;
      title: string;
      success: boolean;
      pois_total?: number;
      pois_geocoded?: number;
      error?: string;
    }> = processedResults.map((r) => {
      if (r.error) {
        return {
          id: r.item._id,
          title: r.item.title || 'Untitled',
          success: false,
          error: r.error.message,
        };
      }
      return r.result!;
    });

    const successful = results.filter((r) => r.success);
    const totalPoisGeocoded = successful.reduce(
      (sum, r) => sum + (r.pois_geocoded || 0),
      0
    );
    const totalPois = successful.reduce(
      (sum, r) => sum + (r.pois_total || 0),
      0
    );

    return c.json({
      processed: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      concurrency_used: concurrency,
      total_pois: totalPois,
      total_geocoded: totalPoisGeocoded,
      geocode_rate:
        totalPois > 0 ? Math.round((totalPoisGeocoded / totalPois) * 100) : 0,
      geocoding: {
        strategy,
        metrics: geocodingService.getMetrics(),
        service_status: geocodingService.getServiceStatus(),
        cache_stats: geocodingService.getCacheStats(),
      },
      results,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/guides/:id/ai-data
 * Get AI-enriched data for a guide
 */
guideEnrichmentRouter.get('/:id/ai-data', async (c: Context) => {
  const id = c.req.param('id') as Id<'travelGuides'>;

  try {
    const guide = await convex.query(api.travelGuides.getById, { id });
    if (!guide) {
      return c.json({ error: 'Guide not found' }, 404);
    }

    // Calculate POI stats
    const days = guide.aiDays || [];
    const totalPois = days.reduce(
      (
        sum: number,
        d: { pois?: Array<{ latitude: number; longitude: number }> }
      ) => sum + (d.pois?.length || 0),
      0
    );
    const poisWithCoords = days.reduce(
      (
        sum: number,
        d: { pois?: Array<{ latitude: number; longitude: number }> }
      ) =>
        sum +
        (d.pois?.filter(
          (p: { latitude: number; longitude: number }) =>
            p.latitude !== 0 && p.longitude !== 0
        ).length || 0),
      0
    );

    return c.json({
      id,
      title: guide.title,
      processed: !!guide.aiProcessedAt,
      processedAt: guide.aiProcessedAt
        ? new Date(guide.aiProcessedAt).toISOString()
        : null,
      summary: guide.aiSummary,
      tips: guide.aiTips,
      bestTime: guide.aiBestTime,
      duration: guide.aiDuration,
      budget: guide.aiBudget,
      days: guide.aiDays,
      stats: {
        total_days: days.length,
        total_pois: totalPois,
        pois_with_coords: poisWithCoords,
        geocode_rate:
          totalPois > 0 ? Math.round((poisWithCoords / totalPois) * 100) : 0,
      },
    });
  } catch {
    return c.json({ error: 'Guide not found' }, 404);
  }
});

/**
 * POST /api/guides/:id/validate
 * Re-validate AI data for a guide (without re-extracting)
 */
guideEnrichmentRouter.post('/:id/validate', async (c: Context) => {
  const id = c.req.param('id') as Id<'travelGuides'>;

  try {
    const guide = await convex.query(api.travelGuides.getById, { id });
    if (!guide) {
      return c.json({ error: 'Guide not found' }, 404);
    }

    if (!guide.aiDays || guide.aiDays.length === 0) {
      return c.json({ error: 'No AI data to validate' }, 400);
    }

    // Validate existing AI data
    const validationResult = validateExtractedDays(guide.aiDays, {
      removeInvalid: false,
      deduplicate: true,
      minValidationScore: 0.3,
    });

    // Save validated data
    const finalDays = toStorageFormat(validationResult.days);
    await convex.mutation(api.travelGuides.updateAiData, {
      id,
      aiDays: finalDays,
    });

    return c.json({
      success: true,
      guide_id: id,
      validation: validationResult.stats,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /api/guides/geocoding/stats
 * Get geocoding service statistics
 */
guideEnrichmentRouter.get('/geocoding/stats', (c: Context) => {
  const geocodingService = getGeocodingService();
  return c.json({
    cache: geocodingService.getCacheStats(),
    metrics: geocodingService.getMetrics(),
    service_status: geocodingService.getServiceStatus(),
    hit_rate: geocodingService.getHitRate(),
    success_rate: geocodingService.getSuccessRate(),
    services: ['amap', 'nominatim', 'overpass'],
    description: 'Multi-source geocoding with fallback chain',
  });
});

/**
 * GET /api/guides/geocoding/metrics
 * Get detailed geocoding metrics and performance analysis
 */
guideEnrichmentRouter.get('/geocoding/metrics', (c: Context) => {
  const geocodingService = getGeocodingService();
  const metrics = geocodingService.getMetrics();
  const cacheStats = geocodingService.getCacheStats();
  const serviceStatus = geocodingService.getServiceStatus();
  const hitRate = geocodingService.getHitRate();
  const successRate = geocodingService.getSuccessRate();

  // Calculate additional derived metrics
  const totalSuccessful = metrics.totalRequests - metrics.failedRequests;
  const sourceBreakdown = Object.entries(metrics.sourceDistribution)
    .filter(([, count]) => count > 0)
    .map(([source, count]) => ({
      source,
      count,
      percentage:
        metrics.totalRequests > 0
          ? Math.round((count / metrics.totalRequests) * 100 * 10) / 10
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate total cache entries across all services
  const totalCacheEntries =
    cacheStats.unified +
    (cacheStats.amap?.size ?? 0) +
    cacheStats.nominatim.size +
    cacheStats.overpass.size;

  return c.json({
    summary: {
      total_requests: metrics.totalRequests,
      successful_requests: totalSuccessful,
      failed_requests: metrics.failedRequests,
      success_rate: Math.round(successRate * 10) / 10,
      cache_hit_rate: Math.round(hitRate * 10) / 10,
      average_confidence: Math.round(metrics.averageConfidence * 100) / 100,
      consensus_matches: metrics.consensusMatches,
    },
    source_breakdown: sourceBreakdown,
    cache: {
      total_entries: totalCacheEntries,
      by_service: {
        unified: cacheStats.unified,
        amap: cacheStats.amap?.size ?? 0,
        nominatim: cacheStats.nominatim.size,
        overpass: cacheStats.overpass.size,
      },
    },
    services: {
      amap: {
        available: serviceStatus.amap,
        description: 'AMap (Gaode) - Primary geocoder for Chinese POIs',
      },
      nominatim: {
        available: serviceStatus.nominatim,
        description: 'OpenStreetMap Nominatim - Fallback geocoder',
      },
      overpass: {
        available: serviceStatus.overpass,
        description:
          'OpenStreetMap Overpass API - Cross-validation and fallback',
      },
    },
    raw_metrics: metrics,
  });
});

/**
 * POST /api/guides/geocoding/clear-cache
 * Clear all geocoding caches
 */
guideEnrichmentRouter.post('/geocoding/clear-cache', (c: Context) => {
  const geocodingService = getGeocodingService();
  const cacheStatsBefore = geocodingService.getCacheStats();
  geocodingService.clearAllCaches();
  return c.json({
    success: true,
    caches_cleared: ['unified', 'amap', 'nominatim', 'overpass'],
    entries_cleared: {
      unified: cacheStatsBefore.unified,
      amap: cacheStatsBefore.amap?.size ?? 0,
      nominatim: cacheStatsBefore.nominatim.size,
      overpass: cacheStatsBefore.overpass.size,
    },
  });
});

/**
 * POST /api/guides/optimize/all
 * Batch optimize all existing AI data (validate, deduplicate, regeocode invalid POIs)
 */
guideEnrichmentRouter.post('/optimize/all', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}));
  const limit = body.limit || 100;
  const regeocode = body.regeocode !== false; // Default: true
  const _skipAlreadyOptimized = body.skipAlreadyOptimized !== false; // Default: true (reserved for future use)
  const strategy = (body.strategy || 'multi') as GeocodingStrategy;

  try {
    // Get guides with AI data (use smaller limit to avoid Convex size limits)
    const fetchLimit = Math.min(limit * 2, 50); // Fetch enough but stay under limits
    const guides = await convex.query(api.travelGuides.list, {
      limit: fetchLimit,
    });
    const withAiData = guides.filter(
      (g: {
        aiProcessedAt?: number;
        aiDays?: Array<{ pois: Array<{ latitude: number }> }>;
      }) => g.aiProcessedAt && g.aiDays && g.aiDays.length > 0
    );

    if (withAiData.length === 0) {
      return c.json({
        message: 'No guides with AI data to optimize',
        processed: 0,
      });
    }

    const toProcess = withAiData.slice(0, limit);
    const geocodingService = getGeocodingService();

    const results: Array<{
      id: string;
      title: string;
      success: boolean;
      pois_before: number;
      pois_after: number;
      pois_regeocoded: number;
      duplicates_removed: number;
      error?: string;
    }> = [];

    let totalPoisBefore = 0;
    let totalPoisAfter = 0;
    let totalRegeocoded = 0;
    let totalDuplicatesRemoved = 0;

    for (const guide of toProcess) {
      try {
        const city = guide.destinations?.[0] || '';
        const originalDays = guide.aiDays || [];

        // Count POIs before
        const poisBefore = originalDays.reduce(
          (sum: number, d: { pois?: Array<unknown> }) =>
            sum + (d.pois?.length || 0),
          0
        );
        totalPoisBefore += poisBefore;

        // Process each day
        let regeocoded = 0;
        const processedDays = await Promise.all(
          originalDays.map(
            async (day: {
              dayNumber: number;
              theme?: string;
              pois: Array<{
                name: string;
                type: string;
                description?: string;
                latitude: number;
                longitude: number;
                address?: string;
              }>;
            }) => {
              const processedPois = await Promise.all(
                day.pois.map(
                  async (poi: {
                    name: string;
                    type: string;
                    description?: string;
                    latitude: number;
                    longitude: number;
                    address?: string;
                  }) => {
                    // Check if coordinates need regeocoding
                    const needsRegeocode =
                      regeocode &&
                      (poi.latitude === 0 ||
                        poi.longitude === 0 ||
                        !geocodingService.validateCoordinates(
                          poi.latitude,
                          poi.longitude,
                          city
                        ).valid);

                    if (needsRegeocode) {
                      const cleanName = normalizePoiName(poi.name);
                      const location = await geocodingService.geocode(
                        cleanName,
                        city,
                        { strategy, crossValidate: true }
                      );

                      if (
                        location &&
                        geocodingService.validateCoordinates(
                          location.latitude,
                          location.longitude,
                          city
                        ).valid
                      ) {
                        regeocoded++;
                        return {
                          name: poi.name,
                          type: normalizePoiType(poi.type),
                          description: poi.description,
                          latitude: location.latitude,
                          longitude: location.longitude,
                          address: location.address,
                        };
                      }
                    }

                    return {
                      name: poi.name,
                      type: normalizePoiType(poi.type),
                      description: poi.description,
                      latitude: poi.latitude,
                      longitude: poi.longitude,
                      address: poi.address,
                    };
                  }
                )
              );

              return {
                dayNumber: day.dayNumber,
                theme: day.theme,
                pois: processedPois,
              };
            }
          )
        );

        // Validate and deduplicate
        const validationResult = validateExtractedDays(processedDays, {
          removeInvalid: false,
          deduplicate: true,
          minValidationScore: 0.2,
        });

        const finalDays = toStorageFormat(validationResult.days);

        // Count POIs after
        const poisAfter = finalDays.reduce((sum, d) => sum + d.pois.length, 0);
        totalPoisAfter += poisAfter;
        totalRegeocoded += regeocoded;
        totalDuplicatesRemoved += validationResult.stats.duplicatesRemoved;

        // Save optimized data
        await convex.mutation(api.travelGuides.updateAiData, {
          id: guide._id,
          aiDays: finalDays,
        });

        results.push({
          id: guide._id,
          title: guide.title || 'Untitled',
          success: true,
          pois_before: poisBefore,
          pois_after: poisAfter,
          pois_regeocoded: regeocoded,
          duplicates_removed: validationResult.stats.duplicatesRemoved,
        });

        console.warn(
          `[Optimize] ${guide.title}: ${poisAfter}/${poisBefore} POIs, ${regeocoded} regeocoded, ${validationResult.stats.duplicatesRemoved} duplicates`
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          id: guide._id,
          title: guide.title || 'Untitled',
          success: false,
          pois_before: 0,
          pois_after: 0,
          pois_regeocoded: 0,
          duplicates_removed: 0,
          error: errorMessage,
        });
        console.error(`[Optimize] Failed: ${guide.title}`, errorMessage);
      }
    }

    const successful = results.filter((r) => r.success);

    return c.json({
      processed: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      total_guides_with_ai: withAiData.length,
      stats: {
        pois_before: totalPoisBefore,
        pois_after: totalPoisAfter,
        pois_regeocoded: totalRegeocoded,
        duplicates_removed: totalDuplicatesRemoved,
      },
      geocoding: {
        strategy,
        metrics: geocodingService.getMetrics(),
        cache_stats: geocodingService.getCacheStats(),
      },
      results,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * GET /api/guides/optimize/stats
 * Get statistics about data that needs optimization
 */
guideEnrichmentRouter.get('/optimize/stats', async (c: Context) => {
  try {
    // Use smaller limit to avoid Convex size limits
    const guides = await convex.query(api.travelGuides.list, { limit: 50 });

    const stats = {
      total_guides_fetched: guides.length,
      with_ai_data: 0,
      without_ai_data: 0,
      total_pois: 0,
      pois_with_valid_coords: 0,
      pois_with_invalid_coords: 0,
      guides_needing_optimization: 0,
    };

    const geocodingService = getGeocodingService();

    for (const guide of guides) {
      if (guide.aiProcessedAt && guide.aiDays && guide.aiDays.length > 0) {
        stats.with_ai_data++;
        let guideNeedsOptimization = false;

        for (const day of guide.aiDays) {
          for (const poi of day.pois || []) {
            stats.total_pois++;

            const city = guide.destinations?.[0] || '';
            const isValid =
              poi.latitude !== 0 &&
              poi.longitude !== 0 &&
              geocodingService.validateCoordinates(
                poi.latitude,
                poi.longitude,
                city
              ).valid;

            if (isValid) {
              stats.pois_with_valid_coords++;
            } else {
              stats.pois_with_invalid_coords++;
              guideNeedsOptimization = true;
            }
          }
        }

        if (guideNeedsOptimization) {
          stats.guides_needing_optimization++;
        }
      } else {
        stats.without_ai_data++;
      }
    }

    return c.json({
      stats,
      optimization_rate:
        stats.total_pois > 0
          ? Math.round((stats.pois_with_valid_coords / stats.total_pois) * 100)
          : 0,
      note: 'Stats are based on most recent 50 guides due to size limits',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * POST /api/guides/:id/regeocode
 * Re-geocode POIs for a guide (using improved geocoder, without AI re-extraction)
 */
guideEnrichmentRouter.post('/:id/regeocode', async (c: Context) => {
  const id = c.req.param('id') as Id<'travelGuides'>;
  const strategy = (c.req.query('strategy') || 'multi') as GeocodingStrategy;

  try {
    const guide = await convex.query(api.travelGuides.getById, { id });
    if (!guide) {
      return c.json({ error: 'Guide not found' }, 404);
    }

    if (!guide.aiDays || guide.aiDays.length === 0) {
      return c.json({ error: 'No AI data to regeocode' }, 400);
    }

    const geocodingService = getGeocodingService();
    const city = guide.destinations[0] || '';

    console.warn(`[Regeocode] Processing guide: ${guide.title}`);

    // Re-geocode all POIs
    const regeocodedDays = await Promise.all(
      guide.aiDays.map(
        async (day: {
          dayNumber: number;
          theme?: string;
          pois: Array<{
            name: string;
            type: string;
            description?: string;
            latitude: number;
            longitude: number;
            address?: string;
          }>;
        }) => {
          const regeocodedPois = await Promise.all(
            day.pois.map(
              async (poi: {
                name: string;
                type: string;
                description?: string;
                latitude: number;
                longitude: number;
                address?: string;
              }) => {
                const cleanName = normalizePoiName(poi.name);
                const location = await geocodingService.geocode(
                  cleanName,
                  city,
                  { strategy, crossValidate: true }
                );

                const coords = location
                  ? geocodingService.validateCoordinates(
                      location.latitude,
                      location.longitude,
                      city
                    )
                  : { valid: false };

                return {
                  name: poi.name,
                  type: poi.type,
                  description: poi.description,
                  latitude: coords.valid ? location!.latitude : poi.latitude,
                  longitude: coords.valid ? location!.longitude : poi.longitude,
                  address: coords.valid ? location!.address : poi.address,
                  geocodeConfidence: location?.confidence ?? 0,
                  geocodeSource: location?.source ?? 'none',
                };
              }
            )
          );

          return {
            dayNumber: day.dayNumber,
            theme: day.theme,
            pois: regeocodedPois,
          };
        }
      )
    );

    // Validate and save
    const validationResult = validateExtractedDays(regeocodedDays, {
      removeInvalid: false,
      deduplicate: true,
    });
    const finalDays = toStorageFormat(validationResult.days);

    await convex.mutation(api.travelGuides.updateAiData, {
      id,
      aiDays: finalDays,
    });

    const totalPois = finalDays.reduce((sum, d) => sum + d.pois.length, 0);
    const poisWithCoords = finalDays.reduce(
      (sum, d) => sum + d.pois.filter((p) => p.latitude !== 0).length,
      0
    );

    console.warn(
      `[Regeocode] Completed: ${guide.title} (${poisWithCoords}/${totalPois} geocoded)`
    );

    return c.json({
      success: true,
      guide_id: id,
      title: guide.title,
      pois_total: totalPois,
      pois_geocoded: poisWithCoords,
      geocode_rate:
        totalPois > 0 ? Math.round((poisWithCoords / totalPois) * 100) : 0,
      validation: validationResult.stats,
      geocoding: {
        strategy,
        metrics: geocodingService.getMetrics(),
        cache_stats: geocodingService.getCacheStats(),
      },
    });
  } catch (error: any) {
    console.error('[Regeocode] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});
