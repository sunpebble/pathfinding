/**
 * Guide Enrichment API Routes
 * AI-powered travel guide data enhancement with geocoding
 */

import type { Context } from 'hono';
import type { Id } from '../lib/convex.js';
import { Hono } from 'hono';
import { api, convex } from '../lib/convex.js';
import { getNominatimService } from '../services/nominatim.service.js';
import { getOllamaService } from '../services/ollama.service.js';

export const guideEnrichmentRouter = new Hono();

/**
 * POST /api/guides/:id/enrich
 * Run AI enrichment on a single guide
 */
guideEnrichmentRouter.post('/:id/enrich', async (c: Context) => {
  const id = c.req.param('id') as Id<'travelGuides'>;
  const force = c.req.query('force') === 'true';

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

    // 3. Geocode POIs using Nominatim
    const nominatimService = getNominatimService();
    const city = guide.destinations[0] || '';

    const enrichedDays = await Promise.all(
      extraction.days.map(async (day) => {
        const enrichedPois = await Promise.all(
          day.pois.map(async (poi) => {
            const location = await nominatimService.geocode(poi.name, city);
            return {
              name: poi.name,
              type: poi.type,
              description: poi.description,
              latitude: location?.latitude ?? 0,
              longitude: location?.longitude ?? 0,
              address: location?.address,
            };
          })
        );

        return {
          dayNumber: day.dayNumber,
          theme: day.theme,
          pois: enrichedPois,
        };
      })
    );

    // 4. Save to Convex
    await convex.mutation(api.travelGuides.updateAiData, {
      id,
      aiSummary: extraction.summary,
      aiTips: extraction.tips,
      aiBestTime: extraction.bestTime,
      aiDuration: extraction.duration,
      aiBudget: extraction.budget,
      aiDays: enrichedDays,
    });

    console.warn(`[Enrich] Completed: ${guide.title}`);

    return c.json({
      success: true,
      guide_id: id,
      title: guide.title,
      days_extracted: enrichedDays.length,
      pois_geocoded: enrichedDays.reduce((sum, d) => sum + d.pois.length, 0),
    });
  } catch (error: any) {
    console.error('[Enrich] Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api/guides/enrich/batch
 * Batch enrich multiple guides
 */
guideEnrichmentRouter.post('/enrich/batch', async (c: Context) => {
  const body = await c.req.json().catch(() => ({}));
  const limit = body.limit || 5;

  try {
    // Get guides without AI data
    const guides = await convex.query(api.travelGuides.list, { limit: 50 });
    const unprocessed = guides.filter((g) => !g.aiProcessedAt).slice(0, limit);

    if (unprocessed.length === 0) {
      return c.json({ message: 'No guides to process', processed: 0 });
    }

    const results: Array<{ id: string; title: string; success: boolean }> = [];

    for (const guide of unprocessed) {
      try {
        // Call the single enrich endpoint logic
        const ollamaService = getOllamaService();
        const nominatimService = getNominatimService();
        const city = guide.destinations[0] || '';

        const extraction = await ollamaService.extractDayBasedItinerary(
          guide.content,
          guide.destinations
        );

        const enrichedDays = await Promise.all(
          extraction.days.map(async (day) => {
            const enrichedPois = await Promise.all(
              day.pois.map(async (poi) => {
                const location = await nominatimService.geocode(poi.name, city);
                return {
                  name: poi.name,
                  type: poi.type,
                  description: poi.description,
                  latitude: location?.latitude ?? 0,
                  longitude: location?.longitude ?? 0,
                  address: location?.address,
                };
              })
            );
            return {
              dayNumber: day.dayNumber,
              theme: day.theme,
              pois: enrichedPois,
            };
          })
        );

        await convex.mutation(api.travelGuides.updateAiData, {
          id: guide._id,
          aiSummary: extraction.summary,
          aiTips: extraction.tips,
          aiBestTime: extraction.bestTime,
          aiDuration: extraction.duration,
          aiBudget: extraction.budget,
          aiDays: enrichedDays,
        });

        results.push({
          id: guide._id,
          title: guide.title || 'Untitled',
          success: true,
        });
      } catch {
        results.push({
          id: guide._id,
          title: guide.title || 'Untitled',
          success: false,
        });
      }
    }

    return c.json({
      processed: results.length,
      successful: results.filter((r) => r.success).length,
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
    });
  } catch {
    return c.json({ error: 'Guide not found' }, 404);
  }
});
