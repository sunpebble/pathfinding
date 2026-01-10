/**
 * Training Datasets API Routes
 * Endpoints for generating and managing ML training datasets
 */

import type {
  CreateTrainingDatasetRequest,
  TrainingDataset,
  TrainingDatasetListParams,
  TrainingDatasetStatus,
} from '@pathfinding/crawler-types';
import type { Context } from 'hono';
import type { DatasetGenerationParams } from '../services/training-dataset.service.js';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { supabase, TABLES } from '../lib/supabase.js';
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

// GET /api/training-datasets - List all training datasets
trainingDatasetsRouter.get(
  '/',
  zValidator('query', listDatasetsSchema as any),
  async (c: Context) => {
    const params = c.req.query() as unknown as TrainingDatasetListParams;

    let query = supabase
      .from(TABLES.TRAINING_DATASETS)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(
        params.offset || 0,
        (params.offset || 0) + (params.limit || 20) - 1
      );

    if (params.name) {
      query = query.ilike('name', `%${params.name}%`);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.output_format) {
      query = query.eq('output_format', params.output_format);
    }

    const { data, error, count } = await query;

    if (error) {
      throw Errors.internal(error.message);
    }

    return c.json({
      data: data as TrainingDataset[],
      pagination: {
        total: count || 0,
        limit: params.limit || 20,
        offset: params.offset || 0,
      },
    });
  }
);

// POST /api/training-datasets - Create a new training dataset
trainingDatasetsRouter.post(
  '/',
  zValidator('json', createDatasetSchema as any),
  async (c: Context) => {
    const body = (await c.req.json()) as CreateTrainingDatasetRequest;

    // Check for duplicate name+version
    const { data: existing } = await supabase
      .from(TABLES.TRAINING_DATASETS)
      .select('id')
      .eq('name', body.name)
      .eq('version', body.version)
      .single();

    if (existing) {
      throw Errors.conflict(
        `Dataset ${body.name} version ${body.version} already exists`
      );
    }

    // Generate the dataset using the service
    try {
      const generationParams: DatasetGenerationParams = {
        name: body.name,
        description: body.description,
        format: (body.output_format || 'json') as 'json' | 'jsonl' | 'csv',
        filters: {
          categories: body.generation_params.categories,
          cities: body.generation_params.geographic_scope,
          minQuality: body.generation_params.min_quality_score,
          startDate: body.generation_params.time_range?.start
            ? String(body.generation_params.time_range.start)
            : undefined,
          endDate: body.generation_params.time_range?.end
            ? String(body.generation_params.time_range.end)
            : undefined,
        },
        sampling: body.generation_params.sampling
          ? {
              method: body.generation_params.sampling.method,
              stratifyBy: 'category',
            }
          : undefined,
        split: body.generation_params.sampling
          ? {
              enabled: true,
              trainRatio: body.generation_params.sampling.train_ratio,
              valRatio: body.generation_params.sampling.val_ratio,
              testRatio: body.generation_params.sampling.test_ratio,
            }
          : undefined,
      };

      const result = await generateTrainingDataset(generationParams);

      return c.json({ data: result.dataset as TrainingDataset }, 201);
    } catch (genError) {
      // If generation fails, still create a record with failed status
      const { data, error } = await supabase
        .from(TABLES.TRAINING_DATASETS)
        .insert({
          name: body.name,
          version: body.version,
          description: body.description,
          generation_params: body.generation_params,
          output_format: body.output_format || 'json',
          status: 'failed' as TrainingDatasetStatus,
          source_data_cutoff: new Date().toISOString(),
          error_message:
            genError instanceof Error
              ? genError.message
              : 'Unknown error during generation',
          statistics: {
            total_records: 0,
            train_size: 0,
            val_size: 0,
            test_size: 0,
            categories_distribution: {},
            cities_distribution: {},
          },
        })
        .select()
        .single();

      if (error) {
        throw Errors.internal(error.message);
      }

      return c.json({ data: data as TrainingDataset }, 201);
    }
  }
);

// GET /api/training-datasets/:id - Get a specific training dataset
trainingDatasetsRouter.get('/:id', async (c: Context) => {
  const id = c.req.param('id');

  const { data, error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(error.message);
  }

  return c.json({ data: data as TrainingDataset });
});

// GET /api/training-datasets/:id/download - Download training dataset file
trainingDatasetsRouter.get('/:id/download', async (c: Context) => {
  const id = c.req.param('id');

  const { data: dataset, error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(error.message);
  }

  // For datasets that were generated but don't have a stored file,
  // regenerate on-the-fly
  const format = (dataset.output_format || 'json') as 'json' | 'jsonl' | 'csv';
  const filters = (dataset.generation_params as Record<string, unknown>) || {};

  try {
    const generationParams: DatasetGenerationParams = {
      name: dataset.name,
      description: dataset.description,
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

    // Return the full dataset export
    const exportData = result.exports.full || result.exports.train;
    if (!exportData) {
      throw Errors.notFound('No export data generated');
    }

    // Set appropriate headers for file download
    const filename = `${dataset.name}_v${dataset.version}.${format === 'jsonl' ? 'jsonl' : format}`;
    c.header('Content-Type', exportData.mimeType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Length', String(exportData.sizeBytes));

    return c.body(
      typeof exportData.content === 'string'
        ? exportData.content
        : exportData.content.toString()
    );
  } catch (genError) {
    throw Errors.internal(
      genError instanceof Error
        ? genError.message
        : 'Failed to generate dataset for download'
    );
  }
});

// DELETE /api/training-datasets/:id - Delete a training dataset
trainingDatasetsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  // Get dataset to find output path
  const { data: dataset, error: fetchError } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('output_path')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(fetchError.message);
  }

  // Delete output file from storage if exists
  if (dataset.output_path) {
    try {
      // Extract bucket and path from output_path
      // Format: storage://bucket_name/path/to/file
      const pathMatch = dataset.output_path.match(
        /^storage:\/\/([^/]+)\/(.+)$/
      );
      if (pathMatch) {
        const [, bucket, filePath] = pathMatch;
        await supabase.storage.from(bucket).remove([filePath]);
      }
    } catch {
      // Log but don't fail if file deletion fails
      console.warn(`Failed to delete output file: ${dataset.output_path}`);
    }
  }

  // Delete database record
  const { error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .delete()
    .eq('id', id);

  if (error) {
    throw Errors.internal(error.message);
  }

  return c.json({ message: 'Training dataset deleted' });
});

// POST /api/training-datasets/:id/regenerate - Regenerate a training dataset
trainingDatasetsRouter.post('/:id/regenerate', async (c: Context) => {
  const id = c.req.param('id');

  // Get current dataset
  const { data: dataset, error: fetchError } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      throw Errors.notFound('Training dataset');
    }
    throw Errors.internal(fetchError.message);
  }

  if (dataset.status === 'generating') {
    throw Errors.conflict('Dataset is already being generated');
  }

  // Update status to generating
  await supabase
    .from(TABLES.TRAINING_DATASETS)
    .update({
      status: 'generating' as TrainingDatasetStatus,
      source_data_cutoff: new Date().toISOString(),
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    })
    .eq('id', id);

  // Regenerate the dataset using the service
  try {
    const filters =
      (dataset.generation_params as Record<string, unknown>) || {};
    const format = (dataset.output_format || 'json') as
      | 'json'
      | 'jsonl'
      | 'csv';

    const generationParams: DatasetGenerationParams = {
      name: dataset.name,
      description: dataset.description,
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
    const { data: updatedData, error: updateError } = await supabase
      .from(TABLES.TRAINING_DATASETS)
      .update({
        status: 'completed' as TrainingDatasetStatus,
        statistics: result.dataset.statistics,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw Errors.internal(updateError.message);
    }

    return c.json({
      data: updatedData as TrainingDataset,
      message: 'Dataset regeneration completed',
    });
  } catch (genError) {
    // Update record with failed status
    await supabase
      .from(TABLES.TRAINING_DATASETS)
      .update({
        status: 'failed' as TrainingDatasetStatus,
        error_message:
          genError instanceof Error
            ? genError.message
            : 'Unknown error during regeneration',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);

    throw Errors.internal(
      genError instanceof Error
        ? genError.message
        : 'Dataset regeneration failed'
    );
  }
});
