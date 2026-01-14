/**
 * PDF Export Service
 * Generates beautiful PDF itinerary documents with map screenshots
 * Supports multiple templates and bilingual content (Chinese/English)
 */

import { Buffer } from 'node:buffer';
import { chromium, type Browser, type Page } from 'playwright';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('PdfExport');

/**
 * Supported PDF template styles
 */
export type PdfTemplate = 'classic' | 'modern' | 'minimal' | 'colorful';

/**
 * Supported languages for PDF content
 */
export type PdfLanguage = 'zh' | 'en' | 'bilingual';

/**
 * PDF page size options
 */
export type PdfPageSize = 'A4' | 'Letter' | 'A5';

/**
 * PDF export configuration
 */
export interface PdfExportConfig {
  /** Template style */
  template: PdfTemplate;
  /** Content language */
  language: PdfLanguage;
  /** Page size */
  pageSize: PdfPageSize;
  /** Include map screenshots */
  includeMap: boolean;
  /** Include cover page */
  includeCover: boolean;
  /** Include table of contents */
  includeToc: boolean;
  /** Show POI photos */
  includePhotos: boolean;
  /** Show transport details between POIs */
  includeTransport: boolean;
  /** Primary theme color (hex) */
  primaryColor: string;
  /** Author/user name for footer */
  authorName?: string;
}

/**
 * Transport information between POIs
 */
export interface TransportInfo {
  mode: string;
  duration?: string;
  distance?: string;
  details?: string;
}

/**
 * POI (Point of Interest) data for PDF
 */
export interface PdfPoi {
  name: string;
  nameEn?: string;
  type: string;
  description?: string;
  descriptionEn?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  duration?: string;
  priceInfo?: string;
  openingHours?: string;
  tips?: string;
  tipsEn?: string;
  imageUrl?: string;
  transportToNext?: TransportInfo;
}

/**
 * Day itinerary data for PDF
 */
export interface PdfDay {
  dayNumber: number;
  date?: string;
  theme?: string;
  themeEn?: string;
  pois: PdfPoi[];
}

/**
 * Complete itinerary data for PDF generation
 */
export interface PdfItineraryData {
  /** Itinerary ID */
  id: string;
  /** Title */
  title: string;
  titleEn?: string;
  /** Cover image URL */
  coverImageUrl?: string;
  /** Destinations */
  destinations: string[];
  destinationsEn?: string[];
  /** Duration description */
  duration?: string;
  /** AI-generated summary */
  summary?: string;
  summaryEn?: string;
  /** Best time to visit */
  bestTime?: string;
  /** Budget information */
  budget?: string;
  /** Travel tips */
  tips?: string[];
  tipsEn?: string[];
  /** Daily itineraries */
  days: PdfDay[];
  /** Author name */
  authorName?: string;
  /** Creation date */
  createdAt?: string;
}

/**
 * PDF generation result
 */
export interface PdfExportResult {
  /** PDF data as Buffer */
  data: Buffer;
  /** File size in bytes */
  fileSize: number;
  /** Number of pages */
  pageCount: number;
  /** Generated filename */
  filename: string;
}

/**
 * Map screenshot result
 */
export interface MapScreenshotResult {
  /** Image data as base64 */
  imageData: string;
  /** Image format */
  format: 'png' | 'jpeg';
  /** Width */
  width: number;
  /** Height */
  height: number;
}

/**
 * Default configuration for PDF export
 */
const DEFAULT_CONFIG: PdfExportConfig = {
  template: 'modern',
  language: 'zh',
  pageSize: 'A4',
  includeMap: true,
  includeCover: true,
  includeToc: true,
  includePhotos: true,
  includeTransport: true,
  primaryColor: '#6366F1',
  authorName: undefined,
};

/**
 * Page dimensions in mm
 */
const PAGE_SIZES: Record<PdfPageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 },
  A5: { width: 148, height: 210 },
};

/**
 * PDF Export Service
 */
export class PdfExportService {
  private browser: Browser | null = null;

  /**
   * Initialize browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      logger.info('Launching browser for PDF generation');
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }

  /**
   * Generate PDF from itinerary data
   */
  async generatePdf(
    data: PdfItineraryData,
    customConfig?: Partial<PdfExportConfig>
  ): Promise<PdfExportResult> {
    const config = { ...DEFAULT_CONFIG, ...customConfig };
    logger.info('Generating PDF', {
      id: data.id,
      template: config.template,
      language: config.language,
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Generate map screenshots if enabled
      let mapScreenshots: Map<number, string> = new Map();
      if (config.includeMap) {
        mapScreenshots = await this.generateMapScreenshots(page, data);
      }

      // Generate HTML content
      const html = this.generateHtml(data, config, mapScreenshots);

      // Set page content
      await page.setContent(html, { waitUntil: 'networkidle' });

      // Generate PDF
      const pageSize = PAGE_SIZES[config.pageSize];
      const pdfBuffer = await page.pdf({
        format: config.pageSize,
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        displayHeaderFooter: true,
        headerTemplate: this.generateHeaderTemplate(data, config),
        footerTemplate: this.generateFooterTemplate(config),
      });

      // Count pages (approximate based on content length)
      const pageCount = Math.max(
        1,
        Math.ceil(html.length / 5000) // Rough estimate
      );

      const filename = this.generateFilename(data, config);

      logger.info('PDF generated successfully', {
        id: data.id,
        fileSize: pdfBuffer.length,
        pageCount,
      });

      return {
        data: pdfBuffer,
        fileSize: pdfBuffer.length,
        pageCount,
        filename,
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Generate map screenshots for each day
   */
  private async generateMapScreenshots(
    page: Page,
    data: PdfItineraryData
  ): Promise<Map<number, string>> {
    const screenshots = new Map<number, string>();

    for (const day of data.days) {
      const pois = day.pois.filter((p) => p.latitude && p.longitude);
      if (pois.length === 0) continue;

      try {
        // Calculate bounding box
        const lats = pois.map((p) => p.latitude!);
        const lngs = pois.map((p) => p.longitude!);
        const bounds = {
          minLat: Math.min(...lats),
          maxLat: Math.max(...lats),
          minLng: Math.min(...lngs),
          maxLng: Math.max(...lngs),
        };

        // Center and zoom
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;

        // Generate static map using OpenStreetMap tiles
        const mapHtml = this.generateMapHtml(centerLat, centerLng, pois, day.dayNumber);
        await page.setContent(mapHtml, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000); // Wait for tiles to load

        const screenshot = await page.screenshot({
          type: 'png',
          clip: { x: 0, y: 0, width: 800, height: 400 },
        });

        screenshots.set(day.dayNumber, screenshot.toString('base64'));
        logger.debug('Map screenshot generated', { dayNumber: day.dayNumber });
      } catch (error) {
        logger.warn('Failed to generate map screenshot', {
          dayNumber: day.dayNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return screenshots;
  }

  /**
   * Generate HTML for map display
   */
  private generateMapHtml(
    centerLat: number,
    centerLng: number,
    pois: PdfPoi[],
    dayNumber: number
  ): string {
    const markers = pois
      .map(
        (poi, index) => `
        L.marker([${poi.latitude}, ${poi.longitude}])
          .addTo(map)
          .bindPopup('${index + 1}. ${this.escapeJs(poi.name)}');
      `
      )
      .join('\n');

    // Create polyline connecting POIs
    const polylinePoints = pois
      .filter((p) => p.latitude && p.longitude)
      .map((p) => `[${p.latitude}, ${p.longitude}]`)
      .join(', ');

    return `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 800px; height: 400px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    ${markers}

    const polyline = L.polyline([${polylinePoints}], {
      color: '#6366F1',
      weight: 3,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(map);

    map.fitBounds(polyline.getBounds().pad(0.1));
  </script>
</body>
</html>`;
  }

  /**
   * Generate complete HTML for PDF
   */
  private generateHtml(
    data: PdfItineraryData,
    config: PdfExportConfig,
    mapScreenshots: Map<number, string>
  ): string {
    const styles = this.getTemplateStyles(config);
    const lang = config.language;

    const sections: string[] = [];

    // Cover page
    if (config.includeCover) {
      sections.push(this.generateCoverPage(data, config));
    }

    // Table of contents
    if (config.includeToc && data.days.length > 1) {
      sections.push(this.generateTocPage(data, config));
    }

    // Overview section
    sections.push(this.generateOverviewSection(data, config));

    // Daily itineraries
    for (const day of data.days) {
      sections.push(
        this.generateDaySection(day, config, mapScreenshots.get(day.dayNumber))
      );
    }

    // Tips section
    if (data.tips && data.tips.length > 0) {
      sections.push(this.generateTipsSection(data, config));
    }

    return `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh-CN'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${sections.join('\n')}
</body>
</html>`;
  }

  /**
   * Generate cover page HTML
   */
  private generateCoverPage(data: PdfItineraryData, config: PdfExportConfig): string {
    const lang = config.language;
    const title = lang === 'en' && data.titleEn ? data.titleEn : data.title;
    const destinations =
      lang === 'en' && data.destinationsEn
        ? data.destinationsEn.join(' | ')
        : data.destinations.join(' | ');

    return `
    <div class="cover-page">
      ${
        data.coverImageUrl
          ? `<div class="cover-image" style="background-image: url('${data.coverImageUrl}')"></div>`
          : `<div class="cover-gradient"></div>`
      }
      <div class="cover-content">
        <h1 class="cover-title">${this.escapeHtml(title)}</h1>
        <p class="cover-destinations">${this.escapeHtml(destinations)}</p>
        ${data.duration ? `<p class="cover-duration">${this.escapeHtml(data.duration)}</p>` : ''}
        <div class="cover-meta">
          ${data.authorName ? `<span>${lang === 'en' ? 'By' : '作者'}: ${this.escapeHtml(data.authorName)}</span>` : ''}
          ${data.createdAt ? `<span>${new Date(data.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}</span>` : ''}
        </div>
      </div>
      <div class="cover-brand">
        <span>Pathfinding 探路</span>
      </div>
    </div>`;
  }

  /**
   * Generate table of contents
   */
  private generateTocPage(data: PdfItineraryData, config: PdfExportConfig): string {
    const lang = config.language;
    const tocTitle = lang === 'en' ? 'Table of Contents' : '目录';

    const dayItems = data.days
      .map((day) => {
        const theme = lang === 'en' && day.themeEn ? day.themeEn : day.theme;
        const dayLabel = lang === 'en' ? `Day ${day.dayNumber}` : `第${day.dayNumber}天`;
        return `
        <li class="toc-item">
          <span class="toc-day">${dayLabel}</span>
          ${theme ? `<span class="toc-theme">${this.escapeHtml(theme)}</span>` : ''}
          <span class="toc-dots"></span>
        </li>`;
      })
      .join('');

    return `
    <div class="toc-page page-break">
      <h2 class="toc-title">${tocTitle}</h2>
      <ul class="toc-list">
        ${dayItems}
      </ul>
    </div>`;
  }

  /**
   * Generate overview section
   */
  private generateOverviewSection(data: PdfItineraryData, config: PdfExportConfig): string {
    const lang = config.language;
    const sectionTitle = lang === 'en' ? 'Trip Overview' : '行程概览';
    const summary =
      lang === 'en' && data.summaryEn ? data.summaryEn : data.summary;

    const infoItems: string[] = [];
    if (data.bestTime) {
      infoItems.push(`
        <div class="info-item">
          <span class="info-label">${lang === 'en' ? 'Best Time' : '最佳时间'}</span>
          <span class="info-value">${this.escapeHtml(data.bestTime)}</span>
        </div>`);
    }
    if (data.budget) {
      infoItems.push(`
        <div class="info-item">
          <span class="info-label">${lang === 'en' ? 'Budget' : '预算参考'}</span>
          <span class="info-value">${this.escapeHtml(data.budget)}</span>
        </div>`);
    }
    if (data.duration) {
      infoItems.push(`
        <div class="info-item">
          <span class="info-label">${lang === 'en' ? 'Duration' : '行程时长'}</span>
          <span class="info-value">${this.escapeHtml(data.duration)}</span>
        </div>`);
    }

    return `
    <div class="overview-section page-break">
      <h2 class="section-title">${sectionTitle}</h2>
      ${summary ? `<p class="overview-summary">${this.escapeHtml(summary)}</p>` : ''}
      ${infoItems.length > 0 ? `<div class="info-grid">${infoItems.join('')}</div>` : ''}
    </div>`;
  }

  /**
   * Generate day section
   */
  private generateDaySection(
    day: PdfDay,
    config: PdfExportConfig,
    mapScreenshot?: string
  ): string {
    const lang = config.language;
    const dayLabel = lang === 'en' ? `Day ${day.dayNumber}` : `第${day.dayNumber}天`;
    const theme = lang === 'en' && day.themeEn ? day.themeEn : day.theme;

    const poiItems = day.pois
      .map((poi, index) => this.generatePoiItem(poi, index + 1, config))
      .join('');

    return `
    <div class="day-section page-break">
      <div class="day-header">
        <span class="day-number">${dayLabel}</span>
        ${theme ? `<span class="day-theme">${this.escapeHtml(theme)}</span>` : ''}
        ${day.date ? `<span class="day-date">${this.escapeHtml(day.date)}</span>` : ''}
      </div>
      ${
        mapScreenshot
          ? `<div class="day-map">
              <img src="data:image/png;base64,${mapScreenshot}" alt="Day ${day.dayNumber} Route Map" />
            </div>`
          : ''
      }
      <div class="poi-list">
        ${poiItems}
      </div>
    </div>`;
  }

  /**
   * Generate POI item HTML
   */
  private generatePoiItem(poi: PdfPoi, index: number, config: PdfExportConfig): string {
    const lang = config.language;
    const name = lang === 'en' && poi.nameEn ? poi.nameEn : poi.name;
    const description =
      lang === 'en' && poi.descriptionEn ? poi.descriptionEn : poi.description;
    const tips = lang === 'en' && poi.tipsEn ? poi.tipsEn : poi.tips;

    const typeLabels: Record<string, { zh: string; en: string }> = {
      attraction: { zh: '景点', en: 'Attraction' },
      restaurant: { zh: '餐厅', en: 'Restaurant' },
      hotel: { zh: '住宿', en: 'Hotel' },
      transportation: { zh: '交通', en: 'Transport' },
      shopping: { zh: '购物', en: 'Shopping' },
      entertainment: { zh: '娱乐', en: 'Entertainment' },
    };
    const typeLabel = typeLabels[poi.type]?.[lang === 'en' ? 'en' : 'zh'] || poi.type;

    const details: string[] = [];
    if (poi.duration) {
      details.push(`<span class="poi-detail"><strong>${lang === 'en' ? 'Duration' : '游玩时长'}:</strong> ${this.escapeHtml(poi.duration)}</span>`);
    }
    if (poi.priceInfo) {
      details.push(`<span class="poi-detail"><strong>${lang === 'en' ? 'Price' : '价格'}:</strong> ${this.escapeHtml(poi.priceInfo)}</span>`);
    }
    if (poi.openingHours) {
      details.push(`<span class="poi-detail"><strong>${lang === 'en' ? 'Hours' : '营业时间'}:</strong> ${this.escapeHtml(poi.openingHours)}</span>`);
    }
    if (poi.address) {
      details.push(`<span class="poi-detail"><strong>${lang === 'en' ? 'Address' : '地址'}:</strong> ${this.escapeHtml(poi.address)}</span>`);
    }

    let transportHtml = '';
    if (config.includeTransport && poi.transportToNext) {
      const t = poi.transportToNext;
      transportHtml = `
        <div class="transport-info">
          <span class="transport-icon">→</span>
          <span class="transport-mode">${this.escapeHtml(t.mode)}</span>
          ${t.duration ? `<span class="transport-duration">${this.escapeHtml(t.duration)}</span>` : ''}
          ${t.distance ? `<span class="transport-distance">${this.escapeHtml(t.distance)}</span>` : ''}
        </div>`;
    }

    return `
    <div class="poi-item">
      <div class="poi-index">${index}</div>
      <div class="poi-content">
        <div class="poi-header">
          <h3 class="poi-name">${this.escapeHtml(name)}</h3>
          <span class="poi-type">${typeLabel}</span>
        </div>
        ${
          config.includePhotos && poi.imageUrl
            ? `<div class="poi-image"><img src="${poi.imageUrl}" alt="${this.escapeHtml(name)}" /></div>`
            : ''
        }
        ${description ? `<p class="poi-description">${this.escapeHtml(description)}</p>` : ''}
        ${details.length > 0 ? `<div class="poi-details">${details.join('')}</div>` : ''}
        ${tips ? `<div class="poi-tips"><strong>${lang === 'en' ? 'Tips' : '小贴士'}:</strong> ${this.escapeHtml(tips)}</div>` : ''}
      </div>
    </div>
    ${transportHtml}`;
  }

  /**
   * Generate tips section
   */
  private generateTipsSection(data: PdfItineraryData, config: PdfExportConfig): string {
    const lang = config.language;
    const sectionTitle = lang === 'en' ? 'Travel Tips' : '旅行贴士';
    const tips = lang === 'en' && data.tipsEn ? data.tipsEn : data.tips;

    if (!tips || tips.length === 0) return '';

    const tipItems = tips
      .map((tip) => `<li class="tip-item">${this.escapeHtml(tip)}</li>`)
      .join('');

    return `
    <div class="tips-section page-break">
      <h2 class="section-title">${sectionTitle}</h2>
      <ul class="tips-list">
        ${tipItems}
      </ul>
    </div>`;
  }

  /**
   * Get CSS styles for template
   */
  private getTemplateStyles(config: PdfExportConfig): string {
    const { template, primaryColor } = config;

    // Base styles
    const baseStyles = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #333;
        background: #fff;
      }

      .page-break {
        page-break-before: always;
      }

      .page-break:first-child {
        page-break-before: avoid;
      }

      /* Cover Page */
      .cover-page {
        position: relative;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        overflow: hidden;
      }

      .cover-image, .cover-gradient {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
      }

      .cover-image {
        background-size: cover;
        background-position: center;
        filter: brightness(0.7);
      }

      .cover-gradient {
        background: linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}40 100%);
      }

      .cover-content {
        padding: 40px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        max-width: 80%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      }

      .cover-title {
        font-size: 28pt;
        font-weight: 700;
        color: ${primaryColor};
        margin-bottom: 16px;
      }

      .cover-destinations {
        font-size: 14pt;
        color: #666;
        margin-bottom: 12px;
      }

      .cover-duration {
        font-size: 12pt;
        color: #888;
        margin-bottom: 24px;
      }

      .cover-meta {
        font-size: 10pt;
        color: #999;
      }

      .cover-meta span {
        margin: 0 12px;
      }

      .cover-brand {
        position: absolute;
        bottom: 40px;
        font-size: 10pt;
        color: #ccc;
      }

      /* TOC */
      .toc-page {
        padding: 40px 0;
      }

      .toc-title {
        font-size: 20pt;
        color: ${primaryColor};
        margin-bottom: 30px;
        padding-bottom: 10px;
        border-bottom: 2px solid ${primaryColor};
      }

      .toc-list {
        list-style: none;
      }

      .toc-item {
        display: flex;
        align-items: baseline;
        padding: 12px 0;
        border-bottom: 1px dotted #ddd;
      }

      .toc-day {
        font-weight: 600;
        color: ${primaryColor};
        min-width: 80px;
      }

      .toc-theme {
        color: #666;
        flex: 1;
      }

      /* Section Title */
      .section-title {
        font-size: 18pt;
        color: ${primaryColor};
        margin-bottom: 24px;
        padding-bottom: 8px;
        border-bottom: 2px solid ${primaryColor};
      }

      /* Overview */
      .overview-section {
        padding: 20px 0;
      }

      .overview-summary {
        font-size: 11pt;
        color: #555;
        margin-bottom: 24px;
        line-height: 1.8;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
      }

      .info-label {
        font-size: 10pt;
        color: #888;
        margin-bottom: 4px;
      }

      .info-value {
        font-size: 12pt;
        font-weight: 500;
        color: #333;
      }

      /* Day Section */
      .day-section {
        padding: 20px 0;
      }

      .day-header {
        display: flex;
        align-items: baseline;
        gap: 16px;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 3px solid ${primaryColor};
      }

      .day-number {
        font-size: 16pt;
        font-weight: 700;
        color: ${primaryColor};
      }

      .day-theme {
        font-size: 14pt;
        color: #555;
      }

      .day-date {
        font-size: 11pt;
        color: #888;
        margin-left: auto;
      }

      .day-map {
        margin-bottom: 24px;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .day-map img {
        width: 100%;
        height: auto;
        display: block;
      }

      /* POI List */
      .poi-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .poi-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        background: #fafafa;
        border-radius: 8px;
        border-left: 4px solid ${primaryColor};
      }

      .poi-index {
        width: 32px;
        height: 32px;
        background: ${primaryColor};
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14pt;
        flex-shrink: 0;
      }

      .poi-content {
        flex: 1;
      }

      .poi-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .poi-name {
        font-size: 13pt;
        font-weight: 600;
        color: #333;
      }

      .poi-type {
        font-size: 9pt;
        color: ${primaryColor};
        background: ${primaryColor}15;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .poi-image {
        margin: 12px 0;
        border-radius: 6px;
        overflow: hidden;
      }

      .poi-image img {
        width: 100%;
        max-height: 200px;
        object-fit: cover;
      }

      .poi-description {
        font-size: 11pt;
        color: #555;
        margin-bottom: 12px;
        line-height: 1.7;
      }

      .poi-details {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
      }

      .poi-detail {
        font-size: 10pt;
        color: #666;
      }

      .poi-tips {
        font-size: 10pt;
        color: #888;
        background: #fff3cd;
        padding: 8px 12px;
        border-radius: 4px;
        border-left: 3px solid #ffc107;
      }

      /* Transport */
      .transport-info {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px 8px 48px;
        color: #888;
        font-size: 10pt;
      }

      .transport-icon {
        color: ${primaryColor};
        font-weight: bold;
      }

      .transport-mode {
        font-weight: 500;
      }

      /* Tips Section */
      .tips-section {
        padding: 20px 0;
      }

      .tips-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .tip-item {
        padding: 12px 16px;
        background: #f0f9ff;
        border-radius: 6px;
        border-left: 3px solid ${primaryColor};
        font-size: 11pt;
        color: #444;
      }
    `;

    // Template-specific overrides
    const templateStyles: Record<PdfTemplate, string> = {
      classic: `
        body { font-family: Georgia, 'Times New Roman', serif; }
        .cover-content { border-radius: 0; border: 2px solid ${primaryColor}; }
        .poi-item { border-radius: 0; }
      `,
      modern: '', // Base styles are modern
      minimal: `
        .cover-content { box-shadow: none; border: 1px solid #eee; }
        .poi-item { background: transparent; border-left: none; border-bottom: 1px solid #eee; border-radius: 0; }
        .section-title { border-bottom: 1px solid #ddd; }
      `,
      colorful: `
        .cover-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .poi-item { background: linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 100%); }
        .day-header { background: ${primaryColor}10; padding: 16px; border-radius: 8px; border-bottom: none; }
      `,
    };

    return baseStyles + templateStyles[template];
  }

  /**
   * Generate header template for PDF
   */
  private generateHeaderTemplate(
    data: PdfItineraryData,
    _config: PdfExportConfig
  ): string {
    return `
      <div style="width: 100%; font-size: 9px; color: #999; padding: 0 40px;">
        <span style="float: left;">${this.escapeHtml(data.title)}</span>
        <span style="float: right;">Pathfinding 探路</span>
      </div>
    `;
  }

  /**
   * Generate footer template for PDF
   */
  private generateFooterTemplate(config: PdfExportConfig): string {
    const authorText = config.authorName
      ? `${config.language === 'en' ? 'By' : '作者'}: ${config.authorName} | `
      : '';

    return `
      <div style="width: 100%; font-size: 9px; color: #999; padding: 0 40px; text-align: center;">
        ${authorText}<span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `;
  }

  /**
   * Generate filename for PDF
   */
  private generateFilename(data: PdfItineraryData, config: PdfExportConfig): string {
    const sanitizedTitle = data.title
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      .substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizedTitle}_${config.language}_${timestamp}.pdf`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Escape JavaScript string
   */
  private escapeJs(text: string): string {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

// Singleton instance
let pdfExportServiceInstance: PdfExportService | null = null;

/**
 * Get PDF export service instance
 */
export function getPdfExportService(): PdfExportService {
  if (!pdfExportServiceInstance) {
    pdfExportServiceInstance = new PdfExportService();
  }
  return pdfExportServiceInstance;
}

export default PdfExportService;
