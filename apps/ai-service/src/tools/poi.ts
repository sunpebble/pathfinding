/**
 * POI Search/Extract Tool
 * LangChain tool for extracting and searching Points of Interest
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createLLM } from '../lib/llm/index.js';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

/**
 * POI extraction tool - extracts POIs from travel content
 */
export const poiExtractTool = tool(
  async ({ content }) => {
    try {
      const llm = createLLM({ temperature: 0.3 });

      const prompt = `从以下旅行内容中提取所有景点、餐厅、住宿等地点信息，返回JSON数组格式：

${content}

请返回JSON数组，每个元素包含：
- name: 名称
- type: 类型 (attraction/restaurant/hotel/transportation/shopping)
- description: 简短描述
- address: 地址（如果提到）

JSON:`;

      const response = await llm.invoke(prompt);
      const responseText
        = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // Try to parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const pois = JSON.parse(jsonMatch[0]);
        return JSON.stringify({ success: true, pois, count: pois.length });
      }

      return JSON.stringify({ success: false, pois: [], count: 0 });
    }
    catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'POI extraction failed',
        pois: [],
        count: 0,
      });
    }
  },
  {
    name: 'poi_extract',
    description: '从旅行内容文本中提取景点、餐厅、酒店等地点信息',
    schema: z.object({
      content: z.string().describe('要提取POI的旅行内容文本'),
    }),
  },
);

/**
 * POI search tool - searches for POIs by query
 * This uses Nominatim (OpenStreetMap) for geocoding
 */
export const poiSearchTool = tool(
  async ({ query, city }) => {
    try {
      const searchQuery = city ? `${query}, ${city}, China` : `${query}, China`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=cn`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Pathfinding/1.0 (Travel Planning App)',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results: NominatimResult[] = await response.json();

      const pois = results.map((r: NominatimResult) => ({
        name: r.display_name.split(',')[0],
        fullName: r.display_name,
        latitude: Number.parseFloat(r.lat),
        longitude: Number.parseFloat(r.lon),
        type: r.type,
        category: r.class,
      }));

      return JSON.stringify({ success: true, pois, count: pois.length });
    }
    catch (error) {
      return JSON.stringify({
        error: error instanceof Error ? error.message : 'POI search failed',
        pois: [],
        count: 0,
      });
    }
  },
  {
    name: 'poi_search',
    description: '搜索地点信息，返回地点名称、坐标等信息',
    schema: z.object({
      query: z.string().describe('搜索关键词，如景点名称、餐厅名称等'),
      city: z.string().optional().describe('城市名称，用于缩小搜索范围'),
    }),
  },
);
