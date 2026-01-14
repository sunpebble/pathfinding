/**
 * Share Card Service
 * Generates beautiful share cards for itineraries with customizable templates
 */

import { Buffer } from 'node:buffer';
import type { ComfyUIService } from './comfyui.service.js';
import { getComfyUIService } from './comfyui.service.js';

/**
 * Share platform types supported
 */
export type SharePlatform = 'wechat' | 'weibo' | 'xiaohongshu' | 'generic';

/**
 * Share card configuration
 */
export interface ShareCardConfig {
  /** Card style/template */
  template: 'simple' | 'elegant' | 'vibrant' | 'minimal';
  /** Card dimensions */
  width: number;
  height: number;
  /** Background style */
  background: 'gradient' | 'solid' | 'image';
  /** Primary color (hex) */
  primaryColor: string;
  /** Secondary color (hex) */
  secondaryColor: string;
  /** Show QR code */
  showQrCode: boolean;
  /** Show author info */
  showAuthor: boolean;
  /** Show stats (likes, views) */
  showStats: boolean;
}

/**
 * Itinerary data for share card generation
 */
export interface ShareCardData {
  /** Itinerary or guide ID */
  id: string;
  /** Title of the itinerary */
  title: string;
  /** Duration (e.g., "3天2夜") */
  duration?: string;
  /** Destination names */
  destinations: string[];
  /** Cover image URL */
  coverImageUrl?: string;
  /** Author name */
  authorName?: string;
  /** Author avatar URL */
  authorAvatarUrl?: string;
  /** AI summary */
  summary?: string;
  /** Number of POIs */
  poiCount?: number;
  /** Number of days */
  dayCount?: number;
  /** View count */
  viewsCount?: number;
  /** Like count */
  likesCount?: number;
  /** Best time to visit */
  bestTime?: string;
  /** Budget info */
  budget?: string;
  /** Share URL */
  shareUrl: string;
}

/**
 * Generated share card result
 */
export interface ShareCardResult {
  /** Base64 encoded image data */
  imageData: string;
  /** Image format */
  format: 'png' | 'jpeg';
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** File size in bytes */
  fileSize: number;
  /** Download URL (if stored) */
  downloadUrl?: string;
}

/**
 * Platform-specific share text templates
 */
export interface ShareTextConfig {
  platform: SharePlatform;
  title: string;
  destinations: string[];
  duration?: string;
  summary?: string;
  shareUrl: string;
  hashtags?: string[];
}

/**
 * Default configurations for different platforms
 */
const PLATFORM_CONFIGS: Record<SharePlatform, ShareCardConfig> = {
  wechat: {
    template: 'simple',
    width: 750,
    height: 1334,
    background: 'gradient',
    primaryColor: '#07C160',
    secondaryColor: '#F5F5F5',
    showQrCode: true,
    showAuthor: true,
    showStats: false,
  },
  weibo: {
    template: 'vibrant',
    width: 1080,
    height: 1920,
    background: 'gradient',
    primaryColor: '#E6162D',
    secondaryColor: '#FFE4E1',
    showQrCode: true,
    showAuthor: true,
    showStats: true,
  },
  xiaohongshu: {
    template: 'elegant',
    width: 1080,
    height: 1440,
    background: 'gradient',
    primaryColor: '#FF2442',
    secondaryColor: '#FFF0F0',
    showQrCode: true,
    showAuthor: true,
    showStats: true,
  },
  generic: {
    template: 'minimal',
    width: 1200,
    height: 630,
    background: 'gradient',
    primaryColor: '#6366F1',
    secondaryColor: '#EEF2FF',
    showQrCode: false,
    showAuthor: false,
    showStats: false,
  },
};

/**
 * Share Card Service
 * Generates shareable cards for itineraries
 */
export class ShareCardService {
  private comfyUI: ComfyUIService;

  constructor() {
    this.comfyUI = getComfyUIService();
  }

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig(platform: SharePlatform): ShareCardConfig {
    return { ...PLATFORM_CONFIGS[platform] };
  }

  /**
   * Generate share card using SVG template (primary method)
   * This generates a beautiful card without requiring external AI services
   */
  async generateShareCard(
    data: ShareCardData,
    platform: SharePlatform = 'generic',
    customConfig?: Partial<ShareCardConfig>
  ): Promise<ShareCardResult> {
    const config = { ...this.getPlatformConfig(platform), ...customConfig };

    // Generate SVG-based card
    const svg = this.generateSvgCard(data, config);

    // Convert SVG to PNG using sharp (if available) or return SVG as base64
    const imageData = Buffer.from(svg).toString('base64');

    return {
      imageData,
      format: 'png', // SVG can be converted to PNG on client
      width: config.width,
      height: config.height,
      fileSize: Buffer.byteLength(svg, 'utf8'),
    };
  }

  /**
   * Generate SVG card template
   */
  private generateSvgCard(data: ShareCardData, config: ShareCardConfig): string {
    const { width, height, primaryColor, secondaryColor, template } = config;

    // Choose gradient based on template
    const gradients = this.getGradientForTemplate(template, primaryColor, secondaryColor);

    // Format destinations
    const destinationsText = data.destinations.slice(0, 3).join(' | ') || '探索未知';

    // Format duration text
    const durationText = data.duration || (data.dayCount ? `${data.dayCount}天行程` : '');

    // Truncate summary
    const summaryText = data.summary
      ? data.summary.length > 100
        ? data.summary.substring(0, 100) + '...'
        : data.summary
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradients}
    <!-- Rounded corners clip -->
    <clipPath id="cardClip">
      <rect width="${width}" height="${height}" rx="24" ry="24"/>
    </clipPath>
    <!-- Image clip for cover -->
    <clipPath id="coverClip">
      <rect x="40" y="40" width="${width - 80}" height="${Math.floor(height * 0.4)}" rx="16" ry="16"/>
    </clipPath>
    <!-- Shadow filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.15)"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" clip-path="url(#cardClip)"/>

  <!-- Decorative circles -->
  <circle cx="${width * 0.9}" cy="${height * 0.1}" r="120" fill="${primaryColor}" opacity="0.1"/>
  <circle cx="${width * 0.1}" cy="${height * 0.9}" r="80" fill="${primaryColor}" opacity="0.15"/>

  <!-- Cover image placeholder or gradient -->
  <rect x="40" y="40" width="${width - 80}" height="${Math.floor(height * 0.35)}"
        rx="16" ry="16" fill="url(#coverGradient)" filter="url(#shadow)"/>

  <!-- Cover overlay for text visibility -->
  <rect x="40" y="${Math.floor(height * 0.35) - 80}" width="${width - 80}" height="120"
        fill="url(#overlayGradient)" clip-path="url(#coverClip)"/>

  <!-- Destinations badge on cover -->
  <g transform="translate(60, ${Math.floor(height * 0.35) - 50})">
    <rect width="${Math.min(destinationsText.length * 16 + 40, width - 120)}" height="36" rx="18"
          fill="white" opacity="0.95"/>
    <text x="20" y="24" font-family="system-ui, -apple-system, sans-serif"
          font-size="14" font-weight="600" fill="${primaryColor}">
      ${this.escapeXml(destinationsText)}
    </text>
  </g>

  <!-- Content section -->
  <g transform="translate(40, ${Math.floor(height * 0.4) + 20})">
    <!-- Title -->
    <text y="40" font-family="system-ui, -apple-system, sans-serif"
          font-size="28" font-weight="700" fill="#1A1A1A">
      ${this.wrapText(this.escapeXml(data.title), 24, width - 80)}
    </text>

    <!-- Duration and POI count -->
    <g transform="translate(0, 80)">
      ${durationText ? `
      <rect width="${durationText.length * 14 + 24}" height="28" rx="14" fill="${primaryColor}" opacity="0.1"/>
      <text x="12" y="19" font-family="system-ui, -apple-system, sans-serif"
            font-size="13" font-weight="500" fill="${primaryColor}">
        ${this.escapeXml(durationText)}
      </text>
      ` : ''}
      ${data.poiCount ? `
      <g transform="translate(${(durationText?.length || 0) * 14 + 40}, 0)">
        <rect width="${String(data.poiCount).length * 14 + 60}" height="28" rx="14" fill="${primaryColor}" opacity="0.1"/>
        <text x="12" y="19" font-family="system-ui, -apple-system, sans-serif"
              font-size="13" font-weight="500" fill="${primaryColor}">
          ${data.poiCount} 个景点
        </text>
      </g>
      ` : ''}
    </g>

    <!-- Summary -->
    ${summaryText ? `
    <text y="140" font-family="system-ui, -apple-system, sans-serif"
          font-size="15" fill="#666666" opacity="0.9">
      ${this.wrapText(this.escapeXml(summaryText), 50, width - 80)}
    </text>
    ` : ''}

    <!-- Best time and budget -->
    <g transform="translate(0, ${summaryText ? 200 : 130})">
      ${data.bestTime ? `
      <g>
        <text font-family="system-ui, -apple-system, sans-serif"
              font-size="13" fill="#999999">最佳时间</text>
        <text y="22" font-family="system-ui, -apple-system, sans-serif"
              font-size="15" font-weight="500" fill="#333333">${this.escapeXml(data.bestTime)}</text>
      </g>
      ` : ''}
      ${data.budget ? `
      <g transform="translate(${width / 2 - 40}, 0)">
        <text font-family="system-ui, -apple-system, sans-serif"
              font-size="13" fill="#999999">预算参考</text>
        <text y="22" font-family="system-ui, -apple-system, sans-serif"
              font-size="15" font-weight="500" fill="#333333">${this.escapeXml(data.budget)}</text>
      </g>
      ` : ''}
    </g>
  </g>

  <!-- Footer -->
  <g transform="translate(40, ${height - 100})">
    <!-- Divider -->
    <line x1="0" y1="0" x2="${width - 80}" y2="0" stroke="#E5E5E5" stroke-width="1"/>

    <!-- Author info (if enabled) -->
    ${config.showAuthor && data.authorName ? `
    <g transform="translate(0, 24)">
      <circle cx="16" cy="16" r="16" fill="${primaryColor}" opacity="0.2"/>
      <text x="44" y="22" font-family="system-ui, -apple-system, sans-serif"
            font-size="14" fill="#666666">${this.escapeXml(data.authorName)}</text>
    </g>
    ` : ''}

    <!-- Stats (if enabled) -->
    ${config.showStats && (data.viewsCount || data.likesCount) ? `
    <g transform="translate(${width - 200}, 24)">
      ${data.viewsCount ? `
      <text font-family="system-ui, -apple-system, sans-serif"
            font-size="13" fill="#999999">${this.formatNumber(data.viewsCount)} 浏览</text>
      ` : ''}
      ${data.likesCount ? `
      <text x="80" font-family="system-ui, -apple-system, sans-serif"
            font-size="13" fill="#999999">${this.formatNumber(data.likesCount)} 喜欢</text>
      ` : ''}
    </g>
    ` : ''}

    <!-- App branding -->
    <g transform="translate(${width / 2 - 80}, 50)">
      <text font-family="system-ui, -apple-system, sans-serif"
            font-size="12" fill="#CCCCCC" text-anchor="middle" x="40">
        探路 Pathfinding
      </text>
    </g>
  </g>
</svg>`;
  }

  /**
   * Get gradient definitions for different templates
   */
  private getGradientForTemplate(
    template: string,
    primaryColor: string,
    secondaryColor: string
  ): string {
    const gradients: Record<string, string> = {
      simple: `
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFFFFF"/>
          <stop offset="100%" style="stop-color:${secondaryColor}"/>
        </linearGradient>
        <linearGradient id="coverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor}"/>
          <stop offset="100%" style="stop-color:${this.adjustColor(primaryColor, -20)}"/>
        </linearGradient>
        <linearGradient id="overlayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.4)"/>
        </linearGradient>`,
      elegant: `
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FAFAFA"/>
          <stop offset="50%" style="stop-color:#FFFFFF"/>
          <stop offset="100%" style="stop-color:${secondaryColor}"/>
        </linearGradient>
        <linearGradient id="coverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor}"/>
          <stop offset="50%" style="stop-color:${this.adjustColor(primaryColor, 10)}"/>
          <stop offset="100%" style="stop-color:${this.adjustColor(primaryColor, -30)}"/>
        </linearGradient>
        <linearGradient id="overlayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.5)"/>
        </linearGradient>`,
      vibrant: `
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${secondaryColor}"/>
          <stop offset="100%" style="stop-color:#FFFFFF"/>
        </linearGradient>
        <linearGradient id="coverGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${primaryColor}"/>
          <stop offset="50%" style="stop-color:${this.adjustColor(primaryColor, 20)}"/>
          <stop offset="100%" style="stop-color:#FF6B6B"/>
        </linearGradient>
        <linearGradient id="overlayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.6)"/>
        </linearGradient>`,
      minimal: `
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#FFFFFF"/>
          <stop offset="100%" style="stop-color:#F9FAFB"/>
        </linearGradient>
        <linearGradient id="coverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${primaryColor}"/>
          <stop offset="100%" style="stop-color:${this.adjustColor(primaryColor, -10)}"/>
        </linearGradient>
        <linearGradient id="overlayGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:rgba(0,0,0,0)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0.3)"/>
        </linearGradient>`,
    };

    return gradients[template] || gradients.minimal;
  }

  /**
   * Generate platform-specific share text
   */
  generateShareText(config: ShareTextConfig): string {
    const { platform, title, destinations, duration, summary, shareUrl, hashtags } = config;

    const destinationsText = destinations.join('、');
    const hashtagsText = hashtags?.map((h) => `#${h}`).join(' ') || '';

    const templates: Record<SharePlatform, string> = {
      wechat: `${title}

${destinationsText}${duration ? ` | ${duration}` : ''}

${summary || '快来看看这个精彩的旅行攻略吧!'}

点击链接查看完整行程:
${shareUrl}`,

      weibo: `${title} ${hashtagsText || '#旅行攻略'}

${summary ? `${summary.substring(0, 100)}...` : '发现了一个超棒的旅行行程!'}

${destinationsText}${duration ? ` | ${duration}` : ''}
${shareUrl}`,

      xiaohongshu: `${title}

${summary || '分享一个超实用的旅行攻略'}

${destinationsText}${duration ? `\n${duration}` : ''}

${hashtagsText || '#旅行 #攻略 #行程规划'}

${shareUrl}`,

      generic: `${title}

${summary || `探索${destinationsText}的精彩行程`}

${shareUrl}`,
    };

    return templates[platform];
  }

  /**
   * Generate share link with tracking parameters
   */
  generateShareLink(
    baseUrl: string,
    guideId: string,
    platform: SharePlatform,
    userId?: string
  ): string {
    const params = new URLSearchParams({
      source: 'share',
      platform,
      ref: guideId,
      ...(userId && { sharer: userId }),
    });

    return `${baseUrl}/guide/${guideId}?${params.toString()}`;
  }

  /**
   * Generate AI-enhanced cover image (using ComfyUI if available)
   */
  async generateAiCoverImage(
    destination: string,
    theme?: string
  ): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      const isHealthy = await this.comfyUI.healthCheck();
      if (!isHealthy) {
        return {
          success: false,
          error: 'ComfyUI service is not available',
        };
      }

      const images = await this.comfyUI.generateGuideHeroImage(destination, theme);
      if (images.length === 0) {
        return {
          success: false,
          error: 'No images generated',
        };
      }

      return {
        success: true,
        imageUrl: images[0].url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Wrap text to multiple tspan elements
   */
  private wrapText(text: string, maxChars: number, _maxWidth: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    const lines: string[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      if (remaining.length <= maxChars) {
        lines.push(remaining);
        break;
      }

      let breakPoint = maxChars;
      // Try to break at a space or punctuation
      for (let i = maxChars; i > maxChars - 10 && i > 0; i--) {
        if (' ,.!?，。！？、'.includes(remaining[i])) {
          breakPoint = i + 1;
          break;
        }
      }

      lines.push(remaining.substring(0, breakPoint).trim());
      remaining = remaining.substring(breakPoint).trim();
    }

    return lines
      .slice(0, 3) // Max 3 lines
      .map((line, i) => (i === 0 ? line : `<tspan x="0" dy="1.4em">${line}</tspan>`))
      .join('');
  }

  /**
   * Adjust hex color brightness
   */
  private adjustColor(hex: string, amount: number): string {
    const color = hex.replace('#', '');
    const num = parseInt(color, 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  /**
   * Format number with K/M suffixes
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

// Singleton instance
let shareCardServiceInstance: ShareCardService | null = null;

export function getShareCardService(): ShareCardService {
  if (!shareCardServiceInstance) {
    shareCardServiceInstance = new ShareCardService();
  }
  return shareCardServiceInstance;
}

export default ShareCardService;
