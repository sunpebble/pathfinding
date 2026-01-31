/**
 * Content Enricher Graph
 * LangGraph pipeline for enriching travel guide content
 *
 * Pipeline: extract_metadata → extract_pois → geocode_pois → generate_summary → save_to_db
 */

import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { createLLM } from '../lib/llm/index.js';
import { loggers } from '../lib/logger.js';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// State annotation for the enrichment pipeline
const EnrichmentState = Annotation.Root({
  // Input
  guideId: Annotation<string>,
  content: Annotation<string>,
  title: Annotation<string | undefined>,
  destinations: Annotation<string[]>,

  // Extracted data
  extractedPois: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  geocodedPois: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // Generated content
  summary: Annotation<string | undefined>,
  tips: Annotation<string[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),
  bestTime: Annotation<string | undefined>,
  duration: Annotation<string | undefined>,
  budget: Annotation<string | undefined>,
  days: Annotation<any[]>({
    reducer: (_, b) => b,
    default: () => [],
  }),

  // Status
  error: Annotation<string | undefined>,
  step: Annotation<string>({
    reducer: (_, b) => b,
    default: () => 'init',
  }),
});

type EnrichmentStateType = typeof EnrichmentState.State;

/**
 * Node: Extract metadata from content
 */
async function extractMetadata(
  state: EnrichmentStateType,
): Promise<Partial<EnrichmentStateType>> {
  try {
    const llm = createLLM({ temperature: 0.3 });

    const prompt = `分析以下旅行内容，提取关键信息，返回JSON格式：

标题：${state.title || '无'}
目的地：${state.destinations.join(', ') || '未知'}
内容：${state.content.substring(0, 3000)}

请返回JSON对象，包含：
- summary: 100字以内的内容摘要
- tips: 3-5条实用旅行建议（数组）
- bestTime: 最佳旅行时间（如"3-5月"）
- duration: 建议行程天数（如"3-5天"）
- budget: 预算范围（如"人均3000-5000元"）

JSON:`;

    const response = await llm.invoke(prompt);
    const responseText
      = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        summary: data.summary,
        tips: data.tips || [],
        bestTime: data.bestTime,
        duration: data.duration,
        budget: data.budget,
        step: 'metadata_extracted',
      };
    }

    return { step: 'metadata_extracted' };
  }
  catch (error) {
    loggers.langgraph.error({ error }, 'Extract metadata error');
    return {
      error: `Metadata extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      step: 'metadata_extracted',
    };
  }
}

/**
 * Node: Extract POIs from content
 */
async function extractPois(
  state: EnrichmentStateType,
): Promise<Partial<EnrichmentStateType>> {
  try {
    const llm = createLLM({ temperature: 0.3 });

    const prompt = `从以下旅行内容中提取所有地点（景点、餐厅、酒店等），按日程安排分组，返回JSON格式：

目的地：${state.destinations.join(', ') || '未知'}
内容：${state.content.substring(0, 4000)}

请返回JSON数组，表示每天的行程，格式：
[
  {
    "dayNumber": 1,
    "theme": "城市探索",
    "pois": [
      {
        "name": "地点名称",
        "type": "attraction/restaurant/hotel/transportation/shopping",
        "description": "简短描述",
        "address": "地址（如果提到）",
        "duration": "建议停留时长",
        "tips": "特别提示"
      }
    ]
  }
]

如果内容没有明确的日程安排，请根据地点合理规划。

JSON:`;

    const response = await llm.invoke(prompt);
    const responseText
      = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const days = JSON.parse(jsonMatch[0]);
      // Flatten POIs for geocoding
      const allPois = days.flatMap((day: any) =>
        (day.pois || []).map((poi: any) => ({
          ...poi,
          dayNumber: day.dayNumber,
        })),
      );
      return {
        days,
        extractedPois: allPois,
        step: 'pois_extracted',
      };
    }

    return { step: 'pois_extracted' };
  }
  catch (error) {
    loggers.langgraph.error({ error }, 'Extract POIs error');
    return {
      error: `POI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      step: 'pois_extracted',
    };
  }
}

/**
 * Node: Geocode POIs using Nominatim
 */
async function geocodePois(
  state: EnrichmentStateType,
): Promise<Partial<EnrichmentStateType>> {
  if (!state.extractedPois || state.extractedPois.length === 0) {
    return { step: 'pois_geocoded' };
  }

  try {
    const destination = state.destinations[0] || '';
    const geocodedPois: any[] = [];

    // Geocode each POI (with rate limiting for Nominatim)
    for (const poi of state.extractedPois) {
      try {
        const query = destination
          ? `${poi.name}, ${destination}, China`
          : `${poi.name}, China`;

        const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(query)}&format=json&limit=3&countrycodes=cn`;

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Pathfinding/1.0 (Travel Planning App)',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const results = await response.json();
          if (results.length > 0) {
            const best = results[0];
            geocodedPois.push({
              ...poi,
              latitude: Number.parseFloat(best.lat),
              longitude: Number.parseFloat(best.lon),
              geocodeConfidence: 0.8,
              geocodeSource: 'nominatim',
            });
          }
          else {
            // No geocoding result, keep POI without coordinates
            geocodedPois.push({
              ...poi,
              latitude: 0,
              longitude: 0,
              geocodeConfidence: 0,
              geocodeSource: 'none',
            });
          }
        }

        // Rate limiting: 1 request per second for Nominatim
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
      catch (err) {
        loggers.langgraph.error({ err, poiName: poi.name }, 'Geocoding error for POI');
        geocodedPois.push({
          ...poi,
          latitude: 0,
          longitude: 0,
          geocodeConfidence: 0,
          geocodeSource: 'error',
        });
      }
    }

    // Update days with geocoded POIs
    const updatedDays = state.days.map((day: any) => ({
      ...day,
      pois: (day.pois || []).map((poi: any) => {
        const geocoded = geocodedPois.find(
          g => g.name === poi.name && g.dayNumber === day.dayNumber,
        );
        return geocoded || poi;
      }),
    }));

    return {
      geocodedPois,
      days: updatedDays,
      step: 'pois_geocoded',
    };
  }
  catch (error) {
    loggers.langgraph.error({ error }, 'Geocode POIs error');
    return {
      error: `Geocoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      step: 'pois_geocoded',
    };
  }
}

/**
 * Node: Save enriched data to Convex
 */
async function saveToDb(
  state: EnrichmentStateType,
): Promise<Partial<EnrichmentStateType>> {
  try {
    // Prepare the update payload
    const updatePayload = {
      aiProcessedAt: Date.now(),
      aiSummary: state.summary,
      aiTips: state.tips,
      aiBestTime: state.bestTime,
      aiDuration: state.duration,
      aiBudget: state.budget,
      aiDays: state.days.map((day: any) => ({
        dayNumber: day.dayNumber,
        theme: day.theme,
        pois: (day.pois || []).map((poi: any) => ({
          name: poi.name,
          type: poi.type || 'attraction',
          description: poi.description,
          latitude: poi.latitude || 0,
          longitude: poi.longitude || 0,
          address: poi.address,
          duration: poi.duration,
          tips: poi.tips,
          geocodeConfidence: poi.geocodeConfidence,
          geocodeSource: poi.geocodeSource,
        })),
      })),
      enrichmentStatus: state.error ? 'failed' : 'completed',
      enrichmentError: state.error,
    };

    // Call Convex HTTP API to update the guide
    const response = await fetch(
      `${CONVEX_URL}/api/guides/${state.guideId}/ai-data`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status}`);
    }

    return { step: 'saved' };
  }
  catch (error) {
    loggers.langgraph.error({ error }, 'Save to DB error');
    return {
      error: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      step: 'save_failed',
    };
  }
}

/**
 * Build the content enricher graph
 */
export function buildContentEnricherGraph() {
  const workflow = new StateGraph(EnrichmentState)
    .addNode('extract_metadata', extractMetadata)
    .addNode('extract_pois', extractPois)
    .addNode('geocode_pois', geocodePois)
    .addNode('save_to_db', saveToDb)
    .addEdge(START, 'extract_metadata')
    .addEdge('extract_metadata', 'extract_pois')
    .addEdge('extract_pois', 'geocode_pois')
    .addEdge('geocode_pois', 'save_to_db')
    .addEdge('save_to_db', END);

  return workflow.compile();
}

/**
 * Run enrichment for a single guide
 */
export async function enrichGuide(guide: {
  _id: string;
  content: string;
  title?: string;
  destinations: string[];
}): Promise<{ success: boolean; error?: string }> {
  const graph = buildContentEnricherGraph();

  try {
    const result = await graph.invoke({
      guideId: guide._id,
      content: guide.content,
      title: guide.title,
      destinations: guide.destinations,
    });

    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true };
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enrichment failed',
    };
  }
}
