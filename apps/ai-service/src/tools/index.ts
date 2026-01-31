/**
 * LangChain Tools Registry
 * Central export for all available tools
 */

import { guideDetailTool, searchGuidesTool } from './guide.js';
import { poiExtractTool, poiSearchTool } from './poi.js';
import { translateTool } from './translate.js';
import { routePlannerTool } from './transport.js';
import { weatherQueryTool } from './weather.js';

// Export individual tools
export {
  guideDetailTool,
  poiExtractTool,
  poiSearchTool,
  routePlannerTool,
  searchGuidesTool,
  translateTool,
  weatherQueryTool,
};

/**
 * All available tools for agents
 */
export const allTools = [
  weatherQueryTool,
  poiExtractTool,
  poiSearchTool,
  translateTool,
  routePlannerTool,
  guideDetailTool,
  searchGuidesTool,
];

/**
 * Tool collections by use case
 */
export const toolsByUseCase = {
  // Tools for travel planning
  travelPlanning: [
    weatherQueryTool,
    poiSearchTool,
    routePlannerTool,
    searchGuidesTool,
    guideDetailTool,
  ],

  // Tools for content enrichment
  contentEnrichment: [poiExtractTool, poiSearchTool, translateTool],

  // Tools for general chat
  chat: [
    weatherQueryTool,
    poiSearchTool,
    translateTool,
    searchGuidesTool,
    guideDetailTool,
  ],
};

/**
 * Get tools by name
 */
export function getToolsByName(names: string[]) {
  const toolMap: Record<string, any> = {
    weather_query: weatherQueryTool,
    poi_extract: poiExtractTool,
    poi_search: poiSearchTool,
    translate_text: translateTool,
    route_planner: routePlannerTool,
    get_guide_detail: guideDetailTool,
    search_guides: searchGuidesTool,
  };

  return names.map(name => toolMap[name]).filter(Boolean);
}
