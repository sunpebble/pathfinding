/**
 * PDF Export API Routes
 * Endpoints for generating PDF itinerary documents
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { PdfExportService } from '../services/pdfExportService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const PdfOptionsSchema = z.object({
  template: z.enum(['classic', 'modern', 'minimal', 'colorful']).optional(),
  language: z.enum(['zh', 'en', 'bilingual']).optional(),
  page_size: z.enum(['A4', 'Letter', 'A5']).optional(),
  include_map: z.boolean().optional(),
  include_cover: z.boolean().optional(),
  include_toc: z.boolean().optional(),
  include_photos: z.boolean().optional(),
  include_transport: z.boolean().optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  author_name: z.string().max(100).optional(),
});

// Public routes (no auth required)
export const publicPdfExportRoutes = new Hono();

/**
 * GET /pdf/templates - Get available PDF templates
 * No authentication required
 */
publicPdfExportRoutes.get(
  '/templates',
  zValidator(
    'query',
    z.object({
      lang: z.enum(['zh', 'en']).optional().default('zh'),
    })
  ),
  async (c) => {
    const { lang } = c.req.valid('query');

    const templates = await PdfExportService.getTemplates(lang);

    return c.json({
      success: true,
      data: templates,
    });
  }
);

// Protected routes (auth required)
export const pdfExportRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /pdf/itineraries/:id/preview - Get PDF preview info for an itinerary
 */
pdfExportRoutes.get('/itineraries/:id/preview', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itineraryId = c.req.param('id');

  const preview = await PdfExportService.getPreview(
    itineraryId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: preview,
  });
});

/**
 * POST /pdf/itineraries/:id - Generate PDF for an itinerary
 * Returns the PDF file as binary response
 */
pdfExportRoutes.post(
  '/itineraries/:id',
  zValidator('json', PdfOptionsSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('id');
    const options = c.req.valid('json');

    const result = await PdfExportService.generatePdf(
      itineraryId,
      userId,
      {
        template: options.template,
        language: options.language,
        pageSize: options.page_size,
        includeMap: options.include_map,
        includeCover: options.include_cover,
        includeToc: options.include_toc,
        includePhotos: options.include_photos,
        includeTransport: options.include_transport,
        primaryColor: options.primary_color,
        authorName: options.author_name,
      },
      accessToken
    );

    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Content-Length': result.data.byteLength.toString(),
        'X-Page-Count': result.pageCount.toString(),
      },
    });
  }
);

/**
 * POST /pdf/guides/:id - Generate PDF for a travel guide
 * Proxies to crawler service's guide PDF endpoint
 */
pdfExportRoutes.post(
  '/guides/:id',
  zValidator('json', PdfOptionsSchema),
  async (c) => {
    const guideId = c.req.param('id');
    const options = c.req.valid('json');

    const result = await PdfExportService.generateGuidePdf(guideId, {
      template: options.template,
      language: options.language,
      pageSize: options.page_size,
      includeMap: options.include_map,
      includeCover: options.include_cover,
      includeToc: options.include_toc,
      includePhotos: options.include_photos,
      includeTransport: options.include_transport,
      primaryColor: options.primary_color,
      authorName: options.author_name,
    });

    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Content-Length': result.data.byteLength.toString(),
        'X-Page-Count': result.pageCount.toString(),
      },
    });
  }
);
