/**
 * Training Datasets API Routes
 * Endpoints for generating and managing ML training datasets
 * Migrated to Convex
 */

import type { Context } from 'hono';
import type { DatasetGenerationParams } from '../services/training-dataset.service.js';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { api, convex } from '../lib/convex.js';
import { Errors } from '../middleware/error-handler.js';
import { generateTrainingDataset } from '../services/training-dataset.service.js';

export const trainingDatasetsRouter = new Hono();

// Validation schemas
const createDatasetSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(50),
  description: z.string().optional(),
  generation_params: z.object({
    time_range: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional(),
    geographic_scope: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    min_quality_score: z.number().min(0).max(1).optional(),
    min_reviews: z.number().nonnegative().optional(),
    sampling: z
      .object({
        method: z.enum(['random', 'stratified']),
        train_ratio: z.number().min(0).max(1),
        val_ratio: z.number().min(0).max(1),
        test_ratio: z.number().min(0).max(1),
      })
      .optional(),
  }),
  output_format: z.enum(['json', 'csv', 'parquet']).optional().default('json'),
});

const listDatasetsSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['pending', 'generating', 'completed', 'failed']).optional(),
  output_format: z.enum(['json', 'csv', 'parquet']).optional(),
  limit: z.coerce.number().positive().max(100).optional().default(20),
  offset: z.coerce.number().nonnegative().optional().default(0),
});

// Helper to map Convex dataset to API response format
function mapDataset(dataset: any) {
  if (!dataset) return null;
  return {
    id: dataset._id,
    name: dataset.name,
    version: dataset.version,
    description: dataset.description,
    generation_params: dataset.generationParams,
    output_format: dataset.outputFormats?.[0] || 'json',
    output_formats: dataset.outputFormats,
    status: dataset.status,
    statistics: dataset.statistics,
    storage_paths: dataset.storagePaths,
    created_at: dataset._creationTime
      ? new Date(dataset._creationTime).toISOString()
      : null,
    generated_at: dataset.generatedAt
      ? new Date(dataset.generatedAt).toISOString()
      : null,
  };
}

// GET /api/training-datasets - List all training datasets
trainingDatasetsRouter.get(
  '/',
  zValidator('query', listDatasetsSchema as any),
  async (c: Context) => {
    const query = c.req.query();
    const limit = Number.parseInt(query.limit || '20');
    const offset = Number.parseInt(query.offset || '0');

    try {
      const result = await convex.query(api.trainingDatasets.list, {
        name: query.name,
        status: query.status as any,
        limit,
        offset,
      });

      return c.json({
        data: result.data.map(mapDataset),
        pagination: result.pagination,
      });
    } catch (error: any) {
      throw Errors.internal(error.message);
    }
  }
);

// POST /api/training-datasets - Create a new training dataset
trainingDatasetsRouter.post(
  '/',
  zValidator('json', createDatasetSchema as any),
  async (c: Context) => {
    const body = await c.req.json();

    // Generate the dataset using the service
    try {
      const generationParams: DatasetGenerationParams = {
        name: body.name,
        description: body.description,
        format: (body.output_format || 'json') as 'json' | 'jsonl' | 'csv',
        filters: {
          categories: body.generation_params?.categories,
          cities: body.generation_params?.geographic_scope,
          minQuality: body.generation_params?.min_quality_score,
          startDate: body.generation_params?.time_range?.start
            ? String(body.generation_params.time_range.start)
            : undefined,
          endDate: body.generation_params?.time_range?.end
            ? String(body.generation_params.time_range.end)
            : undefined,
        },
        sampling: body.generation_params?.sampling
          ? {
              method: body.generation_params.sampling.method,
              stratifyBy: 'category',
            }
          : undefined,
        split: body.generation_params?.sampling
          ? {
              enabled: true,
              trainRatio: body.generation_params.sampling.train_ratio,
              valRatio: body.generation_params.sampling.val_ratio,
              testRatio: body.generation_params.sampling.test_ratio,
            }
          : undefined,
      };

      const result = await generateTrainingDataset(generationParams);

      // Save to Convex
      const dataset = await convex.mutation(api.trainingDatasets.create, {
        name: body.name,
        version: body.version,
        generationParams: body.generation_params,
        outputFormats: [body.output_format || 'json'],
        status: 'completed',
        statistics: result.dataset.statistics,
      });

      return c.json({ data: mapDataset(dataset) }, 201);
    } catch (genError: any) {
      // If generation fails, still create a record with failed status
      try {
        const dataset = await convex.mutation(api.trainingDatasets.create, {
          name: body.name,
          version: body.version,
          generationParams: body.generation_params,
          outputFormats: [body.output_format || 'json'],
          status: 'failed',
          statistics: {
            total_records: 0,
            train_size: 0,
            val_size: 0,
            test_size: 0,
            categories_distribution: {},
            cities_distribution: {},
            error_message:
              genError.message || 'Unknown error during generation',
          },
        });

        return c.json({ data: mapDataset(dataset) }, 201);
      } catch (error: any) {
        throw Errors.internal(error.message);
      }
    }
  }
);

// GET /api/training-datasets/:id - Get a specific training dataset
trainingDatasetsRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const dataset = await convex.query(api.trainingDatasets.getById, {
      id: id as any,
    });

    if (!dataset) {
      throw Errors.notFound('Training dataset');
    }

    return c.json({ data: mapDataset(dataset) });
  } catch (error: any) {
    if (error.message?.includes('not found') || error.code === 'PGRST116') {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(error.message);
  }
});

// GET /api/training-datasets/:id/download - Download training dataset file
trainingDatasetsRouter.get('/:id/download', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const dataset = await convex.query(api.trainingDatasets.getById, {
      id: id as any,
    });

    if (!dataset) {
      throw Errors.notFound('Training dataset');
    }

    // Regenerate on-the-fly
    const format = (dataset.outputFormats?.[0] || 'json') as
      | 'json'
      | 'jsonl'
      | 'csv';
    const filters = (dataset.generationParams as Record<string, unknown>) || {};

    const generationParams: DatasetGenerationParams = {
      name: dataset.name,
      description: undefined,
      format,
      filters: {
        categories: filters.categories as string[] | undefined,
        cities: filters.geographic_scope as string[] | undefined,
        minQuality: filters.min_quality_score as number | undefined,
        startDate: (filters.time_range as Record<string, string>)?.start,
        endDate: (filters.time_range as Record<string, string>)?.end,
      },
    };

    const result = await generateTrainingDataset(generationParams);

    const exportData = result.exports.full || result.exports.train;
    if (!exportData) {
      throw Errors.notFound('No export data generated');
    }

    const filename = `${dataset.name}_v${dataset.version}.${format === 'jsonl' ? 'jsonl' : format}`;
    c.header('Content-Type', exportData.mimeType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Length', String(exportData.sizeBytes));

    return c.body(
      typeof exportData.content === 'string'
        ? exportData.content
        : exportData.content.toString()
    );
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(error.message);
  }
});

// DELETE /api/training-datasets/:id - Delete a training dataset
trainingDatasetsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const dataset = await convex.query(api.trainingDatasets.getById, {
      id: id as any,
    });

    if (!dataset) {
      throw Errors.notFound('Training dataset');
    }

    await convex.mutation(api.trainingDatasets.remove, { id: id as any });

    return c.json({ message: 'Training dataset deleted' });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(error.message);
  }
});

// POST /api/training-datasets/:id/regenerate - Regenerate a training dataset
trainingDatasetsRouter.post('/:id/regenerate', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const dataset = await convex.query(api.trainingDatasets.getById, {
      id: id as any,
    });

    if (!dataset) {
      throw Errors.notFound('Training dataset');
    }

    if (dataset.status === 'generating') {
      throw Errors.conflict('Dataset is already being generated');
    }

    // Update status to generating
    await convex.mutation(api.trainingDatasets.update, {
      id: id as any,
      status: 'generating',
    });

    // Regenerate the dataset
    const filters = (dataset.generationParams as Record<string, unknown>) || {};
    const format = (dataset.outputFormats?.[0] || 'json') as
      | 'json'
      | 'jsonl'
      | 'csv';

    const generationParams: DatasetGenerationParams = {
      name: dataset.name,
      description: undefined,
      format,
      filters: {
        categories: filters.categories as string[] | undefined,
        cities: filters.geographic_scope as string[] | undefined,
        minQuality: filters.min_quality_score as number | undefined,
        startDate: (filters.time_range as Record<string, string>)?.start,
        endDate: (filters.time_range as Record<string, string>)?.end,
      },
    };

    const result = await generateTrainingDataset(generationParams);

    // Update the existing record with new statistics
    const updatedDataset = await convex.mutation(api.trainingDatasets.update, {
      id: id as any,
      status: 'completed',
      statistics: result.dataset.statistics,
      generatedAt: Date.now(),
    });

    return c.json({
      data: mapDataset(updatedDataset),
      message: 'Dataset regeneration completed',
    });
  } catch (error: any) {
    // Update record with failed status
    try {
      await convex.mutation(api.trainingDatasets.update, {
        id: id as any,
        status: 'failed',
      });
    } catch {
      // Ignore update failure
    }

    if (error.message?.includes('not found')) {
      throw Errors.notFound('Training dataset');
    }
    if (error.message?.includes('already being generated')) {
      throw Errors.conflict('Dataset is already being generated');
    }
    throw Errors.internal(error.message);
  }
});
