/**
 * AI Itinerary Generation API Routes
 * Endpoints for generating complete travel itineraries using AI
 */

import type { Context } from 'hono';
import { Hono } from 'hono';
import { createLogger } from '../lib/logger.js';
import {
  type ItineraryGenerationRequest,
  type TravelStyle,
  getAiItineraryService,
} from '../services/ai-itinerary.service.js';
import { getOllamaService } from '../services/ollama.service.js';

const logger = createLogger('AiItineraryRoute');

export const aiItineraryRouter = new Hono();

/**
 * GET /api/ai-itinerary/health
 * Check AI service health for itinerary generation
 */
aiItineraryRouter.get('/health', async (c: Context) => {
  const ollamaService = getOllamaService();
  const isAvailable = await ollamaService.healthCheck();
  const isModelReady = isAvailable ? await ollamaService.isModelAvailable() : false;

  return c.json({
    status: isAvailable && isModelReady ? 'healthy' : 'degraded',
    services: {
      ollama: isAvailable,
      model: isModelReady,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/ai-itinerary/styles
 * Get available travel styles with descriptions
 */
aiItineraryRouter.get('/styles', (c: Context) => {
  const styles = [
    {
      id: 'leisure',
      name: '休闲放松',
      nameEn: 'Leisure',
      description: '舒适体验，节奏较慢，有充足休息时间',
      descriptionEn: 'Comfortable experience with a relaxed pace',
      icon: 'leaf',
    },
    {
      id: 'cultural',
      name: '文化探索',
      nameEn: 'Cultural',
      description: '历史古迹、博物馆、艺术场所，深度了解当地文化',
      descriptionEn: 'Historical sites, museums, and art venues',
      icon: 'building.columns',
    },
    {
      id: 'foodie',
      name: '美食之旅',
      nameEn: 'Foodie',
      description: '当地特色美食和网红餐厅，吃遍当地美食',
      descriptionEn: 'Local specialties and popular restaurants',
      icon: 'fork.knife',
    },
    {
      id: 'adventure',
      name: '冒险刺激',
      nameEn: 'Adventure',
      description: '户外活动、极限运动、自然探索',
      descriptionEn: 'Outdoor activities and extreme sports',
      icon: 'figure.hiking',
    },
    {
      id: 'romantic',
      name: '浪漫约会',
      nameEn: 'Romantic',
      description: '浪漫氛围的景点和餐厅，适合情侣和蜜月',
      descriptionEn: 'Romantic venues for couples and honeymoons',
      icon: 'heart.fill',
    },
    {
      id: 'family',
      name: '亲子家庭',
      nameEn: 'Family',
      description: '适合全家的景点和活动，考虑儿童兴趣',
      descriptionEn: 'Family-friendly attractions and activities',
      icon: 'figure.and.child.holdinghands',
    },
  ];

  return c.json({ styles });
});

/**
 * POST /api/ai-itinerary/generate
 * Generate a complete travel itinerary using AI
 */
aiItineraryRouter.post('/generate', async (c: Context) => {
  const startTime = Date.now();

  try {
    const body = await c.req.json();

    // Validate required fields
    if (!body.destination || typeof body.destination !== 'string') {
      return c.json({ error: 'destination is required and must be a string' }, 400);
    }

    if (!body.days || typeof body.days !== 'number' || body.days < 1 || body.days > 14) {
      return c.json({ error: 'days is required and must be a number between 1 and 14' }, 400);
    }

    const validStyles: TravelStyle[] = ['leisure', 'cultural', 'foodie', 'adventure', 'romantic', 'family'];
    if (!body.style || !validStyles.includes(body.style)) {
      return c.json({
        error: `style is required and must be one of: ${validStyles.join(', ')}`,
      }, 400);
    }

    // Build request
    const request: ItineraryGenerationRequest = {
      destination: body.destination.trim(),
      days: body.days,
      style: body.style,
      preferences: {
        budget: body.budget,
        pace: body.pace,
        interests: body.interests,
        avoidCategories: body.avoidCategories,
        startTime: body.startTime,
        endTime: body.endTime,
      },
      language: body.language || 'zh',
    };

    logger.info('Starting itinerary generation', {
      destination: request.destination,
      days: request.days,
      style: request.style,
    });

    const aiItineraryService = getAiItineraryService();
    const itinerary = await aiItineraryService.generateItinerary(request);

    const duration = Date.now() - startTime;

    logger.info('Itinerary generation completed', {
      id: itinerary.id,
      destination: itinerary.destination,
      duration_ms: duration,
    });

    // Calculate statistics
    const totalPois = itinerary.dayPlans.reduce((sum, d) => sum + d.pois.length, 0);
    const poisWithCoords = itinerary.dayPlans.reduce(
      (sum, d) => sum + d.pois.filter((p) => p.latitude !== 0 && p.longitude !== 0).length,
      0
    );

    return c.json({
      success: true,
      itinerary,
      stats: {
        total_days: itinerary.dayPlans.length,
        total_pois: totalPois,
        pois_geocoded: poisWithCoords,
        geocode_rate: totalPois > 0 ? Math.round((poisWithCoords / totalPois) * 100) : 0,
        generation_time_ms: duration,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Itinerary generation failed', err);

    if (err.message === 'AI service unavailable') {
      return c.json({ error: 'AI service is currently unavailable. Please try again later.' }, 503);
    }

    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /api/ai-itinerary/regenerate-day
 * Regenerate a specific day in an itinerary
 */
aiItineraryRouter.post('/regenerate-day', async (c: Context) => {
  try {
    const body = await c.req.json();

    if (!body.destination || !body.dayNumber || !body.style) {
      return c.json({
        error: 'destination, dayNumber, and style are required',
      }, 400);
    }

    const aiItineraryService = getAiItineraryService();

    // Generate a single-day itinerary
    const request: ItineraryGenerationRequest = {
      destination: body.destination,
      days: 1,
      style: body.style,
      preferences: body.preferences,
      language: body.language || 'zh',
    };

    const result = await aiItineraryService.generateItinerary(request);

    if (result.dayPlans.length === 0) {
      return c.json({ error: 'Failed to generate day plan' }, 500);
    }

    const regeneratedDay = {
      ...result.dayPlans[0],
      dayNumber: body.dayNumber,
    };

    return c.json({
      success: true,
      day: regeneratedDay,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Day regeneration failed', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * POST /api/ai-itinerary/explain
 * Get AI explanation for why certain POIs were chosen
 */
aiItineraryRouter.post('/explain', async (c: Context) => {
  try {
    const body = await c.req.json();

    if (!body.destination || !body.style || !body.pois) {
      return c.json({
        error: 'destination, style, and pois are required',
      }, 400);
    }

    const ollamaService = getOllamaService();
    const isAvailable = await ollamaService.healthCheck();
    if (!isAvailable) {
      return c.json({ error: 'AI service unavailable' }, 503);
    }

    const poiNames = body.pois.map((p: { name: string }) => p.name).join(', ');

    const prompt = `请解释为什么为${body.destination}的${body.style}风格旅行选择了以下景点：${poiNames}

请从以下几个角度进行解释：
1. 为什么这些景点适合${body.style}风格旅行
2. 景点之间的关联性和游览顺序的合理性
3. 预计的整体体验和亮点

请用简洁的语言回答，每个角度2-3句话。`;

    const explanation = await ollamaService.generate(prompt, {
      temperature: 0.5,
      max_tokens: 500,
    });

    return c.json({
      success: true,
      explanation: explanation.trim(),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Explanation generation failed', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * GET /api/ai-itinerary/suggestions
 * Get destination suggestions based on style
 */
aiItineraryRouter.get('/suggestions', async (c: Context) => {
  const style = c.req.query('style') as TravelStyle | undefined;

  // Predefined popular destinations by style
  const destinationsByStyle: Record<TravelStyle, string[]> = {
    leisure: ['三亚', '丽江', '厦门', '大理', '桂林'],
    cultural: ['北京', '西安', '南京', '洛阳', '苏州'],
    foodie: ['成都', '广州', '重庆', '长沙', '西安'],
    adventure: ['张家界', '稻城亚丁', '九寨沟', '香格里拉', '西藏'],
    romantic: ['杭州', '苏州', '青岛', '大理', '厦门'],
    family: ['上海', '北京', '广州', '成都', '珠海'],
  };

  if (style && destinationsByStyle[style]) {
    return c.json({
      style,
      destinations: destinationsByStyle[style].map((name) => ({
        name,
        recommended: true,
      })),
    });
  }

  // Return all destinations if no style specified
  const allDestinations = new Set<string>();
  Object.values(destinationsByStyle).forEach((dests) => {
    dests.forEach((d) => allDestinations.add(d));
  });

  return c.json({
    destinations: Array.from(allDestinations).map((name) => ({
      name,
      styles: Object.entries(destinationsByStyle)
        .filter(([, dests]) => dests.includes(name))
        .map(([s]) => s),
    })),
  });
});
