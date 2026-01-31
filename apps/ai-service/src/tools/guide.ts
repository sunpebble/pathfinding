/**
 * Guide Detail Tool
 * LangChain tool for fetching travel guide details from Convex
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const CONVEX_URL = process.env.CONVEX_URL || 'https://convex.kunish.org';

interface GuideDay {
  pois?: unknown[];
}

interface Guide {
  _id: string;
  title?: string;
  destinations?: string[];
  content?: string;
  aiSummary?: string;
  aiTips?: string;
  aiBestTime?: string;
  aiDuration?: string;
  aiBudget?: string;
  aiDays?: GuideDay[];
}

interface GuideSearchResult {
  _id: string;
  title?: string;
  destinations?: string[];
  aiSummary?: string;
  qualityScore?: number;
}

/**
 * Fetch guide detail from Convex HTTP API
 */
async function fetchGuide(guideId: string): Promise<Guide> {
  const url = `${CONVEX_URL}/api/guides/${guideId}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Guide not found');
    }
    throw new Error(`Convex API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Guide detail tool for LangChain agents
 */
export const guideDetailTool = tool(
  async ({ guideId }) => {
    try {
      const guide = await fetchGuide(guideId);

      // Return a summarized version for the agent
      return JSON.stringify({
        success: true,
        guide: {
          id: guide._id,
          title: guide.title,
          destinations: guide.destinations,
          content: `${guide.content?.substring(0, 1000)}...`, // Truncate for context
          aiSummary: guide.aiSummary,
          aiTips: guide.aiTips,
          aiBestTime: guide.aiBestTime,
          aiDuration: guide.aiDuration,
          aiBudget: guide.aiBudget,
          daysCount: guide.aiDays?.length || 0,
          poisCount:
            guide.aiDays?.reduce(
              (acc: number, day: GuideDay) => acc + (day.pois?.length || 0),
              0,
            ) || 0,
        },
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guide',
      });
    }
  },
  {
    name: 'get_guide_detail',
    description: '获取旅行攻略的详细信息，包括目的地、内容摘要、AI生成的建议等',
    schema: z.object({
      guideId: z.string().describe('旅行攻略的ID'),
    }),
  },
);

/**
 * Search guides tool
 */
export const searchGuidesTool = tool(
  async ({ destination, limit }) => {
    try {
      const url = `${CONVEX_URL}/api/guides?destination=${encodeURIComponent(destination)}&limit=${limit}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Convex API error: ${response.status}`);
      }

      const data = await response.json();
      const guides = data.guides || data || [];

      return JSON.stringify({
        success: true,
        count: guides.length,
        guides: guides.map((g: GuideSearchResult) => ({
          id: g._id,
          title: g.title,
          destinations: g.destinations,
          aiSummary: g.aiSummary,
          qualityScore: g.qualityScore,
        })),
      });
    }
    catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        guides: [],
      });
    }
  },
  {
    name: 'search_guides',
    description: '按目的地搜索相关的旅行攻略',
    schema: z.object({
      destination: z.string().describe('目的地名称，如"杭州"、"西湖"'),
      limit: z.number().min(1).max(20).default(5).describe('返回结果数量限制'),
    }),
  },
);
