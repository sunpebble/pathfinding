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
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { supabase, TABLES } from '../lib/supabase.js';
import { Errors } from '../middleware/error-handler.js';

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
  zValidator('query', listDatasetsSchema),
  async (c: Context) => {
    const params = c.req.valid('query') as TrainingDatasetListParams;

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
  zValidator('json', createDatasetSchema),
  async (c: Context) => {
    const body = c.req.valid('json') as CreateTrainingDatasetRequest;

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

    const { data, error } = await supabase
      .from(TABLES.TRAINING_DATASETS)
      .insert({
        name: body.name,
        version: body.version,
        description: body.description,
        generation_params: body.generation_params,
        output_format: body.output_format || 'json',
        status: 'pending' as TrainingDatasetStatus,
        source_data_cutoff: new Date().toISOString(),
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

    // TODO: Trigger dataset generation job
    // This will be implemented in Phase 5

    return c.json({ data: data as TrainingDataset }, 201);
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

  if (dataset.status !== 'completed') {
    throw Errors.badRequest('Dataset is not yet ready for download');
  }

  if (!dataset.output_path) {
    throw Errors.notFound('Dataset file not found');
  }

  // TODO: Implement actual file download
  // This will involve reading from storage and streaming the file
  // For now, return a placeholder response

  return c.json({
    message: 'Download endpoint not yet implemented',
    dataset_id: id,
    output_path: dataset.output_path,
    output_format: dataset.output_format,
    output_size_bytes: dataset.output_size_bytes,
  });
});

// DELETE /api/training-datasets/:id - Delete a training dataset
trainingDatasetsRouter.delete('/:id', async (c: Context) => {
  const id = c.req.param('id');

  // Get dataset to find output path
  const { data: _dataset, error: fetchError } = await supabase
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

  // TODO: Delete output file if exists

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

  // Reset status to pending
  const { data, error } = await supabase
    .from(TABLES.TRAINING_DATASETS)
    .update({
      status: 'pending' as TrainingDatasetStatus,
      source_data_cutoff: new Date().toISOString(),
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw Errors.internal(error.message);
  }

  // TODO: Trigger dataset generation job

  return c.json({
    data: data as TrainingDataset,
    message: 'Dataset regeneration queued',
  });
});
