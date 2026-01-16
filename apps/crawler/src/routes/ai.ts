/**
 * AI Processing Routes
 * API endpoints for AI-powered content extraction, summarization, and image generation
 */

import type { Context } from 'hono';

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { api, convex } from '../lib/convex.js';
import {
  batchProcessGuidesWithAI,
  generateMissingImages,
  processGuideWithAI,
  reprocessLowQualityGuides,
} from '../processors/ai-extractor.processor.js';
import { getComfyUIService } from '../services/comfyui.service.js';
import { getN8nService } from '../services/n8n.service.js';
import { getOllamaService } from '../services/ollama.service.js';

export const aiRouter = new Hono();

// Request schemas
const processGuideSchema = z.object({
  guideId: z.string().uuid(),
  options: z
    .object({
      extractContent: z.boolean().optional(),
      generateSummary: z.boolean().optional(),
      analyzeQuality: z.boolean().optional(),
      generateImages: z.boolean().optional(),
      notifyOnComplete: z.boolean().optional(),
    })
    .optional(),
});

const batchProcessSchema = z.object({
  guideIds: z.array(z.string().uuid()).min(1).max(50),
  options: z
    .object({
      extractContent: z.boolean().optional(),
      generateSummary: z.boolean().optional(),
      analyzeQuality: z.boolean().optional(),
      generateImages: z.boolean().optional(),
    })
    .optional(),
});

const generateImageSchema = z.object({
  prompt: z.string().min(1).max(1000),
  destination: z.string().optional(),
  width: z.number().min(256).max(2048).optional(),
  height: z.number().min(256).max(2048).optional(),
  style: z
    .enum(['photorealistic', 'artistic', 'cinematic', 'vintage'])
    .optional(),
});

const summarizeSchema = z.object({
  content: z.string().min(1).max(50000),
  maxLength: z.number().min(100).max(2000).optional(),
});

const extractPOIsSchema = z.object({
  content: z.string().min(1).max(50000),
});

const translateSchema = z.object({
  content: z.string().min(1).max(10000),
  targetLang: z.enum(['zh', 'en', 'ja', 'ko']).optional(),
});

// Health check for AI services
aiRouter.get('/health', async (c: Context) => {
  const ollamaService = getOllamaService();
  const n8nService = getN8nService();
  const comfyUIService = getComfyUIService();

  const [ollamaHealth, n8nHealth, comfyUIHealth] = await Promise.all([
    ollamaService.healthCheck(),
    n8nService.healthCheck(),
    comfyUIService.healthCheck(),
  ]);

  const allHealthy = ollamaHealth && n8nHealth && comfyUIHealth;

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      services: {
        ollama: {
          status: ollamaHealth ? 'healthy' : 'unhealthy',
          description: 'AI content extraction and summarization (Gemma3)',
        },
        n8n: {
          status: n8nHealth ? 'healthy' : 'unhealthy',
          description: 'Workflow automation and notifications',
        },
        comfyui: {
          status: comfyUIHealth ? 'healthy' : 'unhealthy',
          description: 'AI image generation',
        },
      },
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503
  );
});

// Get Ollama model info
aiRouter.get('/ollama/models', async (c: Context) => {
  const ollamaService = getOllamaService();

  const isAvailable = await ollamaService.healthCheck();
  if (!isAvailable) {
    return c.json({ error: 'Ollama service unavailable' }, 503);
  }

  const modelAvailable = await ollamaService.isModelAvailable();

  return c.json({
    configured_model: process.env.OLLAMA_MODEL || 'gemma3:12b',
    model_available: modelAvailable,
  });
});

// Process a single guide with AI
aiRouter.post(
  '/process/guide',
  zValidator('json', processGuideSchema),
  async (c: Context) => {
    const { guideId, options } = await c.req.json();

    // Fetch guide from database using Convex
    let guide;
    try {
      guide = await convex.query(api.travelGuides.getById, {
        id: guideId as any,
      });
      if (!guide) {
        return c.json({ error: 'Guide not found' }, 404);
      }
    } catch {
      return c.json({ error: 'Guide not found' }, 404);
    }

    try {
      const result = await processGuideWithAI(guide, options);
      return c.json({
        success: true,
        result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      return c.json({ error: message }, 500);
    }
  }
);

// Batch process multiple guides
aiRouter.post(
  '/process/batch',
  zValidator('json', batchProcessSchema),
  async (c: Context) => {
    const { guideIds, options } = await c.req.json();

    // Fetch guides from database using Convex
    let guides: any[] = [];
    try {
      const allGuides = await convex.query(api.travelGuides.list, {
        limit: 100,
      });
      guides = allGuides.filter((g: any) => guideIds.includes(g._id));
      if (guides.length === 0) {
        return c.json({ error: 'No guides found' }, 404);
      }
    } catch {
      return c.json({ error: 'No guides found' }, 404);
    }

    try {
      const results = await batchProcessGuidesWithAI(guides, options);
      return c.json({
        success: true,
        processed: results.length,
        total: guideIds.length,
        results,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Batch processing failed';
      return c.json({ error: message }, 500);
    }
  }
);

// Summarize content
aiRouter.post(
  '/summarize',
  zValidator('json', summarizeSchema),
  async (c: Context) => {
    const { content, maxLength } = await c.req.json();
    const ollamaService = getOllamaService();

    try {
      const summary = await ollamaService.summarizeContent(content, maxLength);
      return c.json({ success: true, summary });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Summarization failed';
      return c.json({ error: message }, 500);
    }
  }
);

// Extract POIs from content
aiRouter.post(
  '/extract-pois',
  zValidator('json', extractPOIsSchema),
  async (c: Context) => {
    const { content } = await c.req.json();
    const ollamaService = getOllamaService();

    try {
      const pois = await ollamaService.extractPOIs(content);
      return c.json({ success: true, pois, count: pois.length });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'POI extraction failed';
      return c.json({ error: message }, 500);
    }
  }
);

// Translate content
aiRouter.post(
  '/translate',
  zValidator('json', translateSchema),
  async (c: Context) => {
    const { content, targetLang } = await c.req.json();
    const ollamaService = getOllamaService();

    try {
      const translation = await ollamaService.translateContent(
        content,
        targetLang
      );
      return c.json({
        success: true,
        translation,
        targetLang: targetLang || 'zh',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      return c.json({ error: message }, 500);
    }
  }
);

// Generate image
aiRouter.post(
  '/generate-image',
  zValidator('json', generateImageSchema),
  async (c: Context) => {
    const { prompt, destination, width, height } = await c.req.json();
    const comfyUIService = getComfyUIService();

    const isAvailable = await comfyUIService.healthCheck();
    if (!isAvailable) {
      return c.json({ error: 'ComfyUI service unavailable' }, 503);
    }

    try {
      let finalPrompt = prompt;

      // If destination provided, enhance prompt with AI
      if (destination) {
        const ollamaService = getOllamaService();
        finalPrompt = await ollamaService.generateImagePrompt(
          destination,
          prompt
        );
      }

      const images = await comfyUIService.generateTravelImage({
        prompt: finalPrompt,
        width: width || 1024,
        height: height || 768,
      });

      return c.json({
        success: true,
        images,
        prompt: finalPrompt,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Image generation failed';
      return c.json({ error: message }, 500);
    }
  }
);

// Generate missing images for guides
aiRouter.post('/generate-missing-images', async (c: Context) => {
  const limit = Number.parseInt(c.req.query('limit') || '10');

  try {
    const count = await generateMissingImages(limit);
    return c.json({
      success: true,
      generated: count,
      message: `Generated images for ${count} guides`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Image generation failed';
    return c.json({ error: message }, 500);
  }
});

// Reprocess low quality guides
aiRouter.post('/reprocess-low-quality', async (c: Context) => {
  const minScore = Number.parseInt(c.req.query('minScore') || '30');
  const limit = Number.parseInt(c.req.query('limit') || '20');

  try {
    const count = await reprocessLowQualityGuides(minScore, limit);
    return c.json({
      success: true,
      reprocessed: count,
      message: `Reprocessed ${count} low-quality guides`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reprocessing failed';
    return c.json({ error: message }, 500);
  }
});

// Get ComfyUI available models
aiRouter.get('/comfyui/models', async (c: Context) => {
  const comfyUIService = getComfyUIService();

  const isAvailable = await comfyUIService.healthCheck();
  if (!isAvailable) {
    return c.json({ error: 'ComfyUI service unavailable' }, 503);
  }

  try {
    const models = await comfyUIService.getAvailableModels();
    const stats = await comfyUIService.getSystemStats();

    return c.json({
      models,
      system: stats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get models';
    return c.json({ error: message }, 500);
  }
});

// Get n8n workflows
aiRouter.get('/n8n/workflows', async (c: Context) => {
  const n8nService = getN8nService();

  const isAvailable = await n8nService.healthCheck();
  if (!isAvailable) {
    return c.json({ error: 'n8n service unavailable' }, 503);
  }

  try {
    const workflows = await n8nService.listWorkflows();
    return c.json({ workflows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to list workflows';
    return c.json({ error: message }, 500);
  }
});

// Trigger n8n notification manually
aiRouter.post('/n8n/notify', async (c: Context) => {
  const n8nService = getN8nService();

  const isAvailable = await n8nService.healthCheck();
  if (!isAvailable) {
    return c.json({ error: 'n8n service unavailable' }, 503);
  }

  const body = await c.req.json();

  try {
    const success = await n8nService.sendCrawlNotification({
      type: body.type || 'crawl_completed',
      jobId: body.jobId || 'manual',
      jobName: body.jobName || 'Manual Notification',
      platform: body.platform || 'api',
      status: body.status || 'completed',
      message: body.message || 'Manual notification from API',
      timestamp: new Date().toISOString(),
    });

    return c.json({ success, message: 'Notification sent' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Notification failed';
    return c.json({ error: message }, 500);
  }
});

export default aiRouter;
