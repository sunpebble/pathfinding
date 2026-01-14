/**
 * PDF Export API Routes
 * Endpoints for generating PDF itinerary documents
 */

import type { Context } from 'hono';
import type { Id } from '../lib/convex.js';
import { Hono } from 'hono';
import { api, convex } from '../lib/convex.js';
import { createLogger } from '../lib/logger.js';
import { Errors } from '../middleware/error-handler.js';
import {
  getPdfExportService,
  type PdfExportConfig,
  type PdfItineraryData,
  type PdfLanguage,
  type PdfPageSize,
  type PdfTemplate,
} from '../services/pdf-export.service.js';

const logger = createLogger('PdfExportRoute');

export const pdfExportRouter = new Hono();

/**
 * POST /api/pdf/guide/:id
 * Generate PDF for a travel guide
 */
pdfExportRouter.post('/guide/:id', async (c: Context) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  logger.info('PDF export requested', { guideId: id });

  // Fetch guide from database
  const guide = await convex.query(api.travelGuides.getById, {
    id: id as Id<'travelGuides'>,
  });

  if (!guide) {
    throw Errors.notFound('Guide');
  }

  // Check if guide has AI-processed data
  if (!guide.aiDays || guide.aiDays.length === 0) {
    throw Errors.badRequest(
      'Guide has not been AI-processed. Please enrich the guide first.'
    );
  }

  // Parse configuration from request body
  const config: Partial<PdfExportConfig> = {
    template: validateTemplate(body.template),
    language: validateLanguage(body.language),
    pageSize: validatePageSize(body.page_size),
    includeMap: body.include_map !== false,
    includeCover: body.include_cover !== false,
    includeToc: body.include_toc !== false,
    includePhotos: body.include_photos !== false,
    includeTransport: body.include_transport !== false,
    primaryColor: body.primary_color || '#6366F1',
    authorName: body.author_name || guide.authorName,
  };

  // Transform guide data to PDF format
  const pdfData = transformGuideToPdfData(guide);

  // Generate PDF
  const pdfService = getPdfExportService();
  const result = await pdfService.generatePdf(pdfData, config);

  logger.info('PDF generated successfully', {
    guideId: id,
    fileSize: result.fileSize,
    pageCount: result.pageCount,
  });

  // Return PDF as binary response
  return new Response(result.data, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
      'Content-Length': result.fileSize.toString(),
      'X-Page-Count': result.pageCount.toString(),
    },
  });
});

/**
 * POST /api/pdf/guide/:id/preview
 * Generate PDF preview (returns metadata only, no binary)
 */
pdfExportRouter.post('/guide/:id/preview', async (c: Context) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));

  // Fetch guide from database
  const guide = await convex.query(api.travelGuides.getById, {
    id: id as Id<'travelGuides'>,
  });

  if (!guide) {
    throw Errors.notFound('Guide');
  }

  if (!guide.aiDays || guide.aiDays.length === 0) {
    throw Errors.badRequest(
      'Guide has not been AI-processed. Please enrich the guide first.'
    );
  }

  // Calculate preview info
  const totalPois = guide.aiDays.reduce(
    (sum: number, day: any) => sum + (day.pois?.length || 0),
    0
  );

  return c.json({
    data: {
      guide_id: id,
      title: guide.title,
      days_count: guide.aiDays.length,
      pois_count: totalPois,
      has_cover_image: !!guide.coverImageUrl,
      has_summary: !!guide.aiSummary,
      has_tips: !!(guide.aiTips && guide.aiTips.length > 0),
      available_templates: ['classic', 'modern', 'minimal', 'colorful'],
      available_languages: ['zh', 'en', 'bilingual'],
      available_page_sizes: ['A4', 'Letter', 'A5'],
      estimated_pages: Math.max(
        2,
        guide.aiDays.length + Math.ceil(totalPois / 4)
      ),
    },
  });
});

/**
 * GET /api/pdf/templates
 * Get available PDF templates and their descriptions
 */
pdfExportRouter.get('/templates', async (c: Context) => {
  const lang = c.req.query('lang') || 'zh';

  const templates = {
    classic: {
      id: 'classic',
      name: lang === 'en' ? 'Classic' : '经典',
      description:
        lang === 'en'
          ? 'Traditional serif fonts with elegant borders'
          : '传统衬线字体，优雅边框设计',
      preview_color: '#8B4513',
    },
    modern: {
      id: 'modern',
      name: lang === 'en' ? 'Modern' : '现代',
      description:
        lang === 'en'
          ? 'Clean sans-serif design with subtle shadows'
          : '简洁无衬线设计，柔和阴影效果',
      preview_color: '#6366F1',
    },
    minimal: {
      id: 'minimal',
      name: lang === 'en' ? 'Minimal' : '极简',
      description:
        lang === 'en'
          ? 'Ultra-clean design with minimal decorations'
          : '超简洁设计，极少装饰元素',
      preview_color: '#374151',
    },
    colorful: {
      id: 'colorful',
      name: lang === 'en' ? 'Colorful' : '多彩',
      description:
        lang === 'en'
          ? 'Vibrant gradients and colorful accents'
          : '鲜艳渐变色，活力四射',
      preview_color: '#EC4899',
    },
  };

  return c.json({ data: templates });
});

/**
 * POST /api/pdf/itinerary
 * Generate PDF from custom itinerary data (not from database)
 */
pdfExportRouter.post('/itinerary', async (c: Context) => {
  const body = await c.req.json();

  if (!body.itinerary) {
    throw Errors.badRequest('Itinerary data is required');
  }

  const itinerary = body.itinerary;

  // Validate required fields
  if (!itinerary.title) {
    throw Errors.badRequest('Itinerary title is required');
  }
  if (!itinerary.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
    throw Errors.badRequest('Itinerary must have at least one day');
  }

  // Parse configuration
  const config: Partial<PdfExportConfig> = {
    template: validateTemplate(body.template),
    language: validateLanguage(body.language),
    pageSize: validatePageSize(body.page_size),
    includeMap: body.include_map !== false,
    includeCover: body.include_cover !== false,
    includeToc: body.include_toc !== false,
    includePhotos: body.include_photos !== false,
    includeTransport: body.include_transport !== false,
    primaryColor: body.primary_color || '#6366F1',
    authorName: body.author_name,
  };

  // Transform to PDF data format
  const pdfData: PdfItineraryData = {
    id: itinerary.id || `custom_${Date.now()}`,
    title: itinerary.title,
    titleEn: itinerary.title_en,
    coverImageUrl: itinerary.cover_image_url,
    destinations: itinerary.destinations || [],
    destinationsEn: itinerary.destinations_en,
    duration: itinerary.duration,
    summary: itinerary.summary,
    summaryEn: itinerary.summary_en,
    bestTime: itinerary.best_time,
    budget: itinerary.budget,
    tips: itinerary.tips,
    tipsEn: itinerary.tips_en,
    days: itinerary.days.map((day: any, index: number) => ({
      dayNumber: day.day_number || index + 1,
      date: day.date,
      theme: day.theme,
      themeEn: day.theme_en,
      pois: (day.pois || []).map((poi: any) => ({
        name: poi.name,
        nameEn: poi.name_en,
        type: poi.type || 'attraction',
        description: poi.description,
        descriptionEn: poi.description_en,
        latitude: poi.latitude,
        longitude: poi.longitude,
        address: poi.address,
        duration: poi.duration,
        priceInfo: poi.price_info,
        openingHours: poi.opening_hours,
        tips: poi.tips,
        tipsEn: poi.tips_en,
        imageUrl: poi.image_url,
        transportToNext: poi.transport_to_next
          ? {
              mode: poi.transport_to_next.mode,
              duration: poi.transport_to_next.duration,
              distance: poi.transport_to_next.distance,
              details: poi.transport_to_next.details,
            }
          : undefined,
      })),
    })),
    authorName: itinerary.author_name,
    createdAt: itinerary.created_at,
  };

  // Generate PDF
  const pdfService = getPdfExportService();
  const result = await pdfService.generatePdf(pdfData, config);

  logger.info('Custom PDF generated', {
    title: pdfData.title,
    fileSize: result.fileSize,
  });

  return new Response(result.data, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
      'Content-Length': result.fileSize.toString(),
      'X-Page-Count': result.pageCount.toString(),
    },
  });
});

/**
 * Transform database guide to PDF data format
 */
function transformGuideToPdfData(guide: any): PdfItineraryData {
  return {
    id: guide._id,
    title: guide.title,
    coverImageUrl: guide.coverImageUrl,
    destinations: guide.destinations || [],
    duration: guide.aiDuration,
    summary: guide.aiSummary,
    bestTime: guide.aiBestTime,
    budget: guide.aiBudget,
    tips: guide.aiTips,
    days: (guide.aiDays || []).map((day: any) => ({
      dayNumber: day.dayNumber,
      theme: day.theme,
      pois: (day.pois || []).map((poi: any) => ({
        name: poi.name,
        type: poi.type || 'attraction',
        description: poi.description,
        latitude: poi.latitude,
        longitude: poi.longitude,
        address: poi.address,
        duration: poi.duration,
        priceInfo: poi.priceInfo,
        openingHours: poi.openingHours,
        tips: poi.tips,
        imageUrl: poi.imageUrl,
        transportToNext: poi.transportToNext
          ? {
              mode: poi.transportToNext.mode,
              duration: poi.transportToNext.duration,
              distance: poi.transportToNext.distance,
              details: poi.transportToNext.details,
            }
          : undefined,
      })),
    })),
    authorName: guide.authorName,
    createdAt: guide._creationTime
      ? new Date(guide._creationTime).toISOString()
      : undefined,
  };
}

/**
 * Validate and return template value
 */
function validateTemplate(value: unknown): PdfTemplate | undefined {
  const valid: PdfTemplate[] = ['classic', 'modern', 'minimal', 'colorful'];
  if (typeof value === 'string' && valid.includes(value as PdfTemplate)) {
    return value as PdfTemplate;
  }
  return undefined;
}

/**
 * Validate and return language value
 */
function validateLanguage(value: unknown): PdfLanguage | undefined {
  const valid: PdfLanguage[] = ['zh', 'en', 'bilingual'];
  if (typeof value === 'string' && valid.includes(value as PdfLanguage)) {
    return value as PdfLanguage;
  }
  return undefined;
}

/**
 * Validate and return page size value
 */
function validatePageSize(value: unknown): PdfPageSize | undefined {
  const valid: PdfPageSize[] = ['A4', 'Letter', 'A5'];
  if (typeof value === 'string' && valid.includes(value as PdfPageSize)) {
    return value as PdfPageSize;
  }
  return undefined;
}
