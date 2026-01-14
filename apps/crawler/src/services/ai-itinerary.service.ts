/**
 * AI Itinerary Generation Service
 * Generates complete travel itineraries using Ollama AI with POI data and geocoding
 */

import type { OllamaGenerateOptions } from './ollama.service.js';
import { createLogger } from '../lib/logger.js';
import { parseJsonSafely } from '../lib/retry.js';
import { getGeocodingService } from './geocoding.service.js';
import { getOllamaService } from './ollama.service.js';

const logger = createLogger('AiItinerary');

/**
 * Travel style preferences
 */
export type TravelStyle = 'leisure' | 'cultural' | 'foodie' | 'adventure' | 'romantic' | 'family';

/**
 * Request for AI itinerary generation
 */
export interface ItineraryGenerationRequest {
  destination: string;
  days: number;
  style: TravelStyle;
  preferences?: {
    budget?: 'budget' | 'moderate' | 'luxury';
    pace?: 'relaxed' | 'moderate' | 'intensive';
    interests?: string[];
    avoidCategories?: string[];
    startTime?: string; // e.g., "09:00"
    endTime?: string; // e.g., "21:00"
  };
  language?: 'zh' | 'en';
}

/**
 * Generated POI with all metadata
 */
export interface GeneratedPoi {
  name: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
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
  geocodeConfidence?: number;
  geocodeSource?: string;
}

/**
 * Generated day structure
 */
export interface GeneratedDay {
  dayNumber: number;
  theme: string;
  description: string;
  pois: GeneratedPoi[];
}

/**
 * Complete generated itinerary
 */
export interface GeneratedItinerary {
  id: string;
  destination: string;
  title: string;
  summary: string;
  days: number;
  style: TravelStyle;
  bestTime: string;
  budget: string;
  tips: string[];
  packing: string[];
  dayPlans: GeneratedDay[];
  reasoning: string;
  generatedAt: string;
}

/**
 * Style descriptions for AI prompt
 */
const STYLE_DESCRIPTIONS: Record<TravelStyle, string> = {
  leisure: '休闲放松型，注重舒适体验，节奏较慢，每天安排2-3个景点，有充足休息时间',
  cultural: '文化探索型，侧重历史古迹、博物馆、艺术场所，深度了解当地文化',
  foodie: '美食之旅型，以当地特色美食和网红餐厅为主，每天安排多个美食打卡点',
  adventure: '冒险刺激型，包含户外活动、极限运动、自然探索等刺激体验',
  romantic: '浪漫情侣型，选择浪漫氛围的景点和餐厅，适合约会和蜜月旅行',
  family: '亲子家庭型，考虑儿童兴趣和安全，选择适合全家的景点和活动',
};

/**
 * AI Itinerary Generation Service
 */
export class AiItineraryService {
  private ollamaService = getOllamaService();
  private geocodingService = getGeocodingService();

  /**
   * Generate a complete travel itinerary
   */
  async generateItinerary(
    request: ItineraryGenerationRequest
  ): Promise<GeneratedItinerary> {
    logger.info('Starting itinerary generation', {
      destination: request.destination,
      days: request.days,
      style: request.style,
    });

    // Check AI service availability
    const isAvailable = await this.ollamaService.healthCheck();
    if (!isAvailable) {
      throw new Error('AI service unavailable');
    }

    // Generate raw itinerary from AI
    const rawItinerary = await this.generateRawItinerary(request);

    // Geocode all POIs
    const geocodedDays = await this.geocodeDays(
      rawItinerary.dayPlans,
      request.destination
    );

    // Optimize POI order based on location
    const optimizedDays = await this.optimizePOIOrder(geocodedDays);

    // Generate unique ID
    const id = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result: GeneratedItinerary = {
      id,
      destination: request.destination,
      title: rawItinerary.title,
      summary: rawItinerary.summary,
      days: request.days,
      style: request.style,
      bestTime: rawItinerary.bestTime,
      budget: rawItinerary.budget,
      tips: rawItinerary.tips,
      packing: rawItinerary.packing || [],
      dayPlans: optimizedDays,
      reasoning: rawItinerary.reasoning,
      generatedAt: new Date().toISOString(),
    };

    logger.info('Itinerary generation completed', {
      id,
      destination: request.destination,
      total_pois: optimizedDays.reduce((sum, d) => sum + d.pois.length, 0),
    });

    return result;
  }

  /**
   * Generate raw itinerary from AI
   */
  private async generateRawItinerary(
    request: ItineraryGenerationRequest
  ): Promise<{
    title: string;
    summary: string;
    bestTime: string;
    budget: string;
    tips: string[];
    packing: string[];
    dayPlans: GeneratedDay[];
    reasoning: string;
  }> {
    const language = request.language || 'zh';
    const styleDesc = STYLE_DESCRIPTIONS[request.style];
    const preferences = request.preferences || {};

    const systemPrompt = language === 'zh'
      ? `你是一位经验丰富的旅行规划师，专门为游客设计个性化的旅行行程。
你的特点是:
1. 了解各地热门景点和小众去处
2. 擅长根据旅行风格优化行程安排
3. 注重实用性，提供具体可执行的建议
4. 考虑交通衔接和时间安排的合理性

请根据用户需求生成完整的旅行行程，确保每个景点都是真实存在的、可以在地图上找到的具体地点。`
      : `You are an experienced travel planner who specializes in creating personalized itineraries.
Your strengths are:
1. Knowledge of popular and hidden gem destinations
2. Optimizing itineraries based on travel style
3. Providing practical, actionable suggestions
4. Considering transportation connections and time management

Generate a complete travel itinerary ensuring every POI is a real, mappable location.`;

    const prompt = language === 'zh'
      ? `请为以下旅行需求生成完整的行程规划:

目的地: ${request.destination}
天数: ${request.days}天
旅行风格: ${request.style} - ${styleDesc}
${preferences.budget ? `预算偏好: ${preferences.budget}` : ''}
${preferences.pace ? `行程节奏: ${preferences.pace === 'relaxed' ? '轻松' : preferences.pace === 'intensive' ? '紧凑' : '适中'}` : ''}
${preferences.interests?.length ? `特别兴趣: ${preferences.interests.join(', ')}` : ''}
${preferences.avoidCategories?.length ? `避免类型: ${preferences.avoidCategories.join(', ')}` : ''}
${preferences.startTime ? `每天开始时间: ${preferences.startTime}` : ''}
${preferences.endTime ? `每天结束时间: ${preferences.endTime}` : ''}

请返回以下JSON格式:
{
  "title": "行程标题（如：成都3日文化美食之旅）",
  "summary": "2-3句话的行程概述",
  "bestTime": "最佳旅行时间",
  "budget": "预算范围（人均）",
  "tips": ["实用建议1", "实用建议2", ...],
  "packing": ["必带物品1", "必带物品2", ...],
  "reasoning": "行程设计理由，解释为什么这样安排",
  "dayPlans": [
    {
      "dayNumber": 1,
      "theme": "当日主题",
      "description": "当日行程概述（1-2句）",
      "pois": [
        {
          "name": "具体景点名称（必须是真实存在的地点）",
          "type": "attraction|restaurant|hotel|cafe|shopping|museum|historic|park|entertainment",
          "description": "景点描述和推荐理由（30-50字）",
          "duration": "建议停留时长（如：1-2小时）",
          "priceInfo": "门票或人均消费",
          "openingHours": "营业时间",
          "tips": "该景点的特别提示",
          "rating": 1-5评分,
          "highlights": ["亮点1", "亮点2"],
          "transportToNext": {
            "mode": "walking|driving|transit|taxi",
            "duration": "时间估计",
            "distance": "距离",
            "notes": "交通备注"
          }
        }
      ]
    }
  ]
}

重要要求:
1. 每天安排${preferences.pace === 'relaxed' ? '2-3' : preferences.pace === 'intensive' ? '5-6' : '3-4'}个景点
2. POI名称必须是具体的、真实存在的地点名称
3. 确保每天的景点在地理位置上是合理的，便于交通衔接
4. 根据旅行风格选择合适的景点类型
5. 餐厅类POI需要是当地知名或特色餐厅
6. 只返回JSON对象，不要其他文字`
      : `Generate a complete travel itinerary for:

Destination: ${request.destination}
Duration: ${request.days} days
Travel Style: ${request.style} - ${styleDesc}
${preferences.budget ? `Budget: ${preferences.budget}` : ''}
${preferences.pace ? `Pace: ${preferences.pace}` : ''}
${preferences.interests?.length ? `Interests: ${preferences.interests.join(', ')}` : ''}
${preferences.avoidCategories?.length ? `Avoid: ${preferences.avoidCategories.join(', ')}` : ''}

Return JSON format:
{
  "title": "Itinerary title",
  "summary": "2-3 sentence overview",
  "bestTime": "Best time to visit",
  "budget": "Budget range per person",
  "tips": ["Tip 1", "Tip 2"],
  "packing": ["Item 1", "Item 2"],
  "reasoning": "Explanation of itinerary design",
  "dayPlans": [
    {
      "dayNumber": 1,
      "theme": "Day theme",
      "description": "Day overview",
      "pois": [
        {
          "name": "Specific POI name (must be real location)",
          "type": "attraction|restaurant|hotel|cafe|shopping|museum|historic|park|entertainment",
          "description": "Description and recommendation (30-50 chars)",
          "duration": "Suggested duration",
          "priceInfo": "Price info",
          "openingHours": "Hours",
          "tips": "Special tips",
          "rating": 1-5,
          "highlights": ["highlight1", "highlight2"],
          "transportToNext": {
            "mode": "walking|driving|transit|taxi",
            "duration": "Time estimate",
            "distance": "Distance",
            "notes": "Notes"
          }
        }
      ]
    }
  ]
}

Requirements:
1. Plan ${preferences.pace === 'relaxed' ? '2-3' : preferences.pace === 'intensive' ? '5-6' : '3-4'} POIs per day
2. POI names must be real, mappable locations
3. Ensure geographic logic within each day
4. Match POI types to travel style
5. Only return JSON, no other text`;

    const options: OllamaGenerateOptions = {
      temperature: 0.4,
      max_tokens: 6000,
    };

    const response = await this.ollamaService.generate(prompt, {
      system: systemPrompt,
      ...options,
    });

    const { data, success, error } = parseJsonSafely<{
      title?: string;
      summary?: string;
      bestTime?: string;
      budget?: string;
      tips?: string[];
      packing?: string[];
      reasoning?: string;
      dayPlans?: Array<{
        dayNumber?: number;
        theme?: string;
        description?: string;
        pois?: Array<{
          name?: string;
          type?: string;
          description?: string;
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
      }>;
    }>(response, {
      title: `${request.destination}${request.days}日游`,
      summary: '',
      bestTime: '',
      budget: '',
      tips: [],
      packing: [],
      reasoning: '',
      dayPlans: [],
    });

    if (!success) {
      logger.warn('Failed to parse AI response', { error });
    }

    // Normalize the response
    const normalizedDays: GeneratedDay[] = (data.dayPlans || []).map(
      (day, index) => ({
        dayNumber: day.dayNumber || index + 1,
        theme: day.theme || `Day ${index + 1}`,
        description: day.description || '',
        pois: (day.pois || [])
          .filter((poi) => poi.name && poi.name.length >= 2)
          .map((poi) => ({
            name: poi.name!.trim(),
            type: poi.type || 'attraction',
            description: poi.description || '',
            latitude: 0,
            longitude: 0,
            duration: poi.duration,
            priceInfo: poi.priceInfo,
            openingHours: poi.openingHours,
            tips: poi.tips,
            rating: poi.rating,
            highlights: poi.highlights,
            transportToNext: poi.transportToNext,
          })),
      })
    );

    return {
      title: data.title || `${request.destination}${request.days}日游`,
      summary: data.summary || '',
      bestTime: data.bestTime || '',
      budget: data.budget || '',
      tips: data.tips || [],
      packing: data.packing || [],
      dayPlans: normalizedDays,
      reasoning: data.reasoning || '',
    };
  }

  /**
   * Geocode all POIs in the itinerary
   */
  private async geocodeDays(
    days: GeneratedDay[],
    destination: string
  ): Promise<GeneratedDay[]> {
    const geocodedDays: GeneratedDay[] = [];

    for (const day of days) {
      const geocodedPois: GeneratedPoi[] = [];

      for (const poi of day.pois) {
        try {
          const location = await this.geocodingService.geocode(
            poi.name,
            destination,
            { strategy: 'multi', crossValidate: true }
          );

          if (location) {
            const coords = this.geocodingService.validateCoordinates(
              location.latitude,
              location.longitude,
              destination
            );

            geocodedPois.push({
              ...poi,
              latitude: coords.valid ? location.latitude : 0,
              longitude: coords.valid ? location.longitude : 0,
              address: coords.valid ? location.address : undefined,
              geocodeConfidence: location.confidence,
              geocodeSource: location.source,
            });
          } else {
            geocodedPois.push(poi);
          }
        } catch (error) {
          logger.warn('Geocoding failed for POI', {
            poi: poi.name,
            error: error instanceof Error ? error.message : String(error),
          });
          geocodedPois.push(poi);
        }
      }

      geocodedDays.push({
        ...day,
        pois: geocodedPois,
      });
    }

    return geocodedDays;
  }

  /**
   * Optimize POI order within each day based on location
   */
  private async optimizePOIOrder(
    days: GeneratedDay[]
  ): Promise<GeneratedDay[]> {
    return days.map((day) => {
      // Get POIs with valid coordinates
      const poisWithCoords = day.pois.filter(
        (poi) => poi.latitude !== 0 && poi.longitude !== 0
      );
      const poisWithoutCoords = day.pois.filter(
        (poi) => poi.latitude === 0 || poi.longitude === 0
      );

      if (poisWithCoords.length <= 2) {
        return day; // No optimization needed
      }

      // Simple greedy nearest neighbor optimization
      const optimizedPois: GeneratedPoi[] = [];
      const remaining = [...poisWithCoords];

      // Start with the first POI (assuming it's breakfast/morning)
      optimizedPois.push(remaining.shift()!);

      while (remaining.length > 0) {
        const lastPoi = optimizedPois[optimizedPois.length - 1];
        let nearestIndex = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const dist = this.calculateDistance(
            lastPoi.latitude,
            lastPoi.longitude,
            remaining[i].latitude,
            remaining[i].longitude
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIndex = i;
          }
        }

        optimizedPois.push(remaining.splice(nearestIndex, 1)[0]);
      }

      // Update transport info between optimized POIs
      for (let i = 0; i < optimizedPois.length - 1; i++) {
        const current = optimizedPois[i];
        const next = optimizedPois[i + 1];
        const distance = this.calculateDistance(
          current.latitude,
          current.longitude,
          next.latitude,
          next.longitude
        );

        if (!current.transportToNext) {
          current.transportToNext = {};
        }

        // Estimate transport mode and duration
        if (distance < 1) {
          current.transportToNext.mode = 'walking';
          current.transportToNext.duration = `${Math.round(distance * 15)}分钟`;
          current.transportToNext.distance = `${Math.round(distance * 1000)}米`;
        } else if (distance < 5) {
          current.transportToNext.mode = 'taxi';
          current.transportToNext.duration = `${Math.round(distance * 3)}分钟`;
          current.transportToNext.distance = `${distance.toFixed(1)}公里`;
        } else {
          current.transportToNext.mode = 'transit';
          current.transportToNext.duration = `${Math.round(distance * 4)}分钟`;
          current.transportToNext.distance = `${distance.toFixed(1)}公里`;
        }
      }

      return {
        ...day,
        pois: [...optimizedPois, ...poisWithoutCoords],
      };
    });
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Singleton instance
let aiItineraryServiceInstance: AiItineraryService | null = null;

export function getAiItineraryService(): AiItineraryService {
  if (!aiItineraryServiceInstance) {
    aiItineraryServiceInstance = new AiItineraryService();
  }
  return aiItineraryServiceInstance;
}

export default AiItineraryService;
