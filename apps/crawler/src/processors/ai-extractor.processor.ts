/**
 * AI Extractor Processor
 * Orchestrates AI-powered content extraction, summarization, and image generation
 *
 * NOTE: The guide enrichment has been moved to guide-enrichment.ts routes.
 * This file provides backward-compatible stubs for the old API.
 */

import type { TravelGuide } from '@pathfinding/crawler-types';
import type {
  ContentSummary,
  GuideExtraction,
} from '../services/ollama.service.js';

import { createLogger } from '../lib/logger.js';
import { getOllamaService } from '../services/ollama.service.js';

const log = createLogger('AIExtractor');

export interface AIProcessingResult {
  guideId: string;
  extraction: GuideExtraction;
  summary: ContentSummary;
  quality: {
    overallScore: number;
    relevance: number;
    informativeness: number;
  };
  images?: Array<{
    filename: string;
    url: string;
    type: 'hero' | 'thumbnail';
  }>;
  processingTime: number;
}

export interface AIProcessorOptions {
  extractContent?: boolean;
  generateSummary?: boolean;
  analyzeQuality?: boolean;
  generateImages?: boolean;
  notifyOnComplete?: boolean;
}

/**
 * Process a travel guide with AI
 * Uses the new day-based extraction via guide-enrichment routes
 */
export async function processGuideWithAI(
  guide: TravelGuide,
  options: AIProcessorOptions = {}
): Promise<AIProcessingResult> {
  const startTime = Date.now();
  log.info(`Processing guide: ${guide.title}`);

  const ollamaService = getOllamaService();

  // Default extraction
  let extraction: GuideExtraction = {
    destinations: [],
    highlights: [],
    schedule: [],
    budget: { estimated: 0, breakdown: {} },
    transportation: { methods: [], routes: [] },
    accommodation: [],
    tips: [],
  };

  let summary: ContentSummary = {
    brief: '',
    keywords: [],
    sentiment: 'neutral' as const,
  };

  // Extract content if enabled
  if (options.extractContent !== false) {
    try {
      extraction = await ollamaService.extractGuideContent(
        guide.content ?? '',
        guide.title ?? ''
      );
    } catch (error) {
      log.error('Content extraction failed:', error);
    }
  }

  // Generate summary if enabled
  if (options.generateSummary !== false) {
    try {
      summary = await ollamaService.summarizeContent(guide.content ?? '');
    } catch (error) {
      log.error('Summary generation failed:', error);
    }
  }

  // Analyze quality if enabled
  let quality = { overallScore: 0, relevance: 0, informativeness: 0 };
  if (options.analyzeQuality !== false) {
    try {
      const qualityResult = await ollamaService.analyzeContentQuality(
        guide.content ?? ''
      );
      quality = {
        overallScore: qualityResult.overallScore,
        relevance: qualityResult.relevance,
        informativeness: qualityResult.informativeness,
      };
    } catch (error) {
      log.error('Quality analysis failed:', error);
    }
  }

  return {
    guideId: guide.id,
    extraction,
    summary,
    quality,
    processingTime: Date.now() - startTime,
  };
}

/**
 * Batch process multiple guides with AI
 */
export async function batchProcessGuidesWithAI(
  guides: TravelGuide[],
  options: AIProcessorOptions = {}
): Promise<AIProcessingResult[]> {
  const results: AIProcessingResult[] = [];

  for (const guide of guides) {
    try {
      const result = await processGuideWithAI(guide, options);
      results.push(result);
    } catch (error) {
      log.error(`Failed to process guide ${guide.id}:`, error);
    }
  }

  return results;
}

/**
 * Generate images for guides (stubbed - requires ComfyUI)
 */
export async function generateMissingImages(
  _limit: number = 10
): Promise<number> {
  log.info('Image generation stubbed (requires ComfyUI)');
  return 0;
}

/**
 * Reprocess guides with low quality scores (stubbed)
 */
export async function reprocessLowQualityGuides(
  _minScore: number = 30,
  _limit: number = 20
): Promise<number> {
  log.info('Low quality reprocessing stubbed');
  return 0;
}

export default {
  processGuideWithAI,
  batchProcessGuidesWithAI,
  generateMissingImages,
  reprocessLowQualityGuides,
};
