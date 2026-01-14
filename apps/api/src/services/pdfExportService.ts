/**
 * PDF Export Service
 * Proxies PDF generation requests to the crawler service
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';

// Types matching crawler service
export type PdfTemplate = 'classic' | 'modern' | 'minimal' | 'colorful';
export type PdfLanguage = 'zh' | 'en' | 'bilingual';
export type PdfPageSize = 'A4' | 'Letter' | 'A5';

export interface PdfExportOptions {
  template?: PdfTemplate;
  language?: PdfLanguage;
  pageSize?: PdfPageSize;
  includeMap?: boolean;
  includeCover?: boolean;
  includeToc?: boolean;
  includePhotos?: boolean;
  includeTransport?: boolean;
  primaryColor?: string;
  authorName?: string;
}

export interface PdfPreviewResult {
  itineraryId: string;
  title: string;
  daysCount: number;
  itemsCount: number;
  hasCoverImage: boolean;
  availableTemplates: PdfTemplate[];
  availableLanguages: PdfLanguage[];
  availablePageSizes: PdfPageSize[];
  estimatedPages: number;
}

export interface PdfTemplateInfo {
  id: PdfTemplate;
  name: string;
  description: string;
  previewColor: string;
}

const CRAWLER_BASE_URL = process.env.CRAWLER_URL || 'http://localhost:3001';

/**
 * PDF Export Service
 * Handles PDF generation for itineraries by proxying to crawler service
 */
export const PdfExportService = {
  /**
   * Get available PDF templates
   */
  async getTemplates(language: 'zh' | 'en' = 'zh'): Promise<Record<string, PdfTemplateInfo>> {
    const response = await fetch(`${CRAWLER_BASE_URL}/api/pdf/templates?lang=${language}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  },

  /**
   * Get PDF preview information for an itinerary
   */
  async getPreview(
    itineraryId: string,
    userId: string,
    _accessToken: string
  ): Promise<PdfPreviewResult> {
    // Fetch the itinerary to verify ownership and get data
    const itinerary = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!itinerary) {
      throw new NotFoundError('Itinerary not found');
    }

    // Check ownership or public visibility
    if (itinerary.userId !== userId && itinerary.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    // Calculate totals
    const daysCount = itinerary.days?.length || 0;
    const itemsCount = itinerary.days?.reduce(
      (sum: number, day: any) => sum + (day.items?.length || 0),
      0
    ) || 0;

    return {
      itineraryId,
      title: itinerary.title,
      daysCount,
      itemsCount,
      hasCoverImage: !!itinerary.coverImageUrl,
      availableTemplates: ['classic', 'modern', 'minimal', 'colorful'],
      availableLanguages: ['zh', 'en', 'bilingual'],
      availablePageSizes: ['A4', 'Letter', 'A5'],
      estimatedPages: Math.max(2, daysCount + Math.ceil(itemsCount / 4)),
    };
  },

  /**
   * Generate PDF for an itinerary
   * Returns the PDF as a Buffer
   */
  async generatePdf(
    itineraryId: string,
    userId: string,
    options: PdfExportOptions,
    _accessToken: string
  ): Promise<{
    data: ArrayBuffer;
    filename: string;
    contentType: string;
    pageCount: number;
  }> {
    // Fetch the itinerary to verify ownership and get data
    const itinerary = await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    });

    if (!itinerary) {
      throw new NotFoundError('Itinerary not found');
    }

    // Check ownership or public visibility
    if (itinerary.userId !== userId && itinerary.visibility !== 'public') {
      throw new NotFoundError('Itinerary not found');
    }

    // Check if itinerary has content
    if (!itinerary.days || itinerary.days.length === 0) {
      throw new BadRequestError('Itinerary has no days to export');
    }

    // Transform itinerary to PDF format
    const pdfData = transformItineraryToPdfFormat(itinerary);

    // Call crawler service to generate PDF
    const response = await fetch(`${CRAWLER_BASE_URL}/api/pdf/itinerary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itinerary: pdfData,
        template: options.template,
        language: options.language,
        page_size: options.pageSize,
        include_map: options.includeMap,
        include_cover: options.includeCover,
        include_toc: options.includeToc,
        include_photos: options.includePhotos,
        include_transport: options.includeTransport,
        primary_color: options.primaryColor,
        author_name: options.authorName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${errorText}`);
    }

    const pageCount = parseInt(response.headers.get('X-Page-Count') || '0', 10);
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `${itinerary.title}.pdf`;

    const data = await response.arrayBuffer();

    return {
      data,
      filename,
      contentType: 'application/pdf',
      pageCount,
    };
  },

  /**
   * Generate PDF for a travel guide (from crawler's guide database)
   * This proxies directly to the crawler's guide PDF endpoint
   */
  async generateGuidePdf(
    guideId: string,
    options: PdfExportOptions
  ): Promise<{
    data: ArrayBuffer;
    filename: string;
    contentType: string;
    pageCount: number;
  }> {
    const response = await fetch(`${CRAWLER_BASE_URL}/api/pdf/guide/${guideId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        template: options.template,
        language: options.language,
        page_size: options.pageSize,
        include_map: options.includeMap,
        include_cover: options.includeCover,
        include_toc: options.includeToc,
        include_photos: options.includePhotos,
        include_transport: options.includeTransport,
        primary_color: options.primaryColor,
        author_name: options.authorName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF generation failed: ${errorText}`);
    }

    const pageCount = parseInt(response.headers.get('X-Page-Count') || '0', 10);
    const contentDisposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : `guide-${guideId}.pdf`;

    const data = await response.arrayBuffer();

    return {
      data,
      filename,
      contentType: 'application/pdf',
      pageCount,
    };
  },
};

/**
 * Transform itinerary from Convex format to PDF format
 */
function transformItineraryToPdfFormat(itinerary: any) {
  return {
    id: itinerary._id,
    title: itinerary.title,
    cover_image_url: itinerary.coverImageUrl,
    destinations: [itinerary.city?.name || ''].filter(Boolean),
    duration: itinerary.days?.length ? `${itinerary.days.length}天行程` : undefined,
    created_at: itinerary._creationTime
      ? new Date(itinerary._creationTime).toISOString()
      : undefined,
    days: (itinerary.days || []).map((day: any, index: number) => ({
      day_number: index + 1,
      date: day.date,
      theme: day.title || `第 ${index + 1} 天`,
      pois: (day.items || []).map((item: any) => ({
        name: item.title || item.poiName,
        type: mapItemTypeToPoi(item.type),
        description: item.notes,
        latitude: item.poi?.latitude,
        longitude: item.poi?.longitude,
        address: item.poi?.address,
        duration: item.duration,
        opening_hours: item.poi?.openingHours,
        image_url: item.poi?.imageUrl,
        transport_to_next: item.transportToNext
          ? {
              mode: item.transportToNext.mode,
              duration: item.transportToNext.duration,
              distance: item.transportToNext.distance,
              details: item.transportToNext.details,
            }
          : undefined,
      })),
    })),
  };
}

/**
 * Map itinerary item type to POI type
 */
function mapItemTypeToPoi(type: string): string {
  const typeMap: Record<string, string> = {
    poi: 'attraction',
    restaurant: 'restaurant',
    hotel: 'hotel',
    transport: 'transportation',
    activity: 'activity',
    note: 'note',
  };
  return typeMap[type] || 'attraction';
}
