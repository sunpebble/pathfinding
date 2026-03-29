/**
 * Content Cleaner Module
 * Cleans crawled travel guide content by removing ads, promotions,
 * personal info (WeChat IDs, phone numbers), and platform noise.
 *
 * All regex patterns are optimized for Chinese social media platforms
 * (Xiaohongshu, Weibo, Douyin, Mafengwo, etc.).
 */

// ============================================================================
// Types
// ============================================================================

/** Result of a content cleaning operation */
export interface CleaningResult {
  /** Cleaned text content */
  content: string;
  /** Cleaned HTML content (if HTML cleaning was requested) */
  contentHtml?: string;
  /** Number of distinct pattern matches removed */
  removedCount: number;
  /** Categories of content that were removed */
  removedTypes: CleaningCategory[];
  /** Character length of the original content */
  originalLength: number;
  /** Character length after cleaning */
  cleanedLength: number;
}

/**
 * Category of unwanted content to be cleaned.
 * Each category maps to a set of regex patterns.
 */
export type CleaningCategory
  = | 'ad' // 广告
    | 'promotion' // 推广/软广
    | 'personal' // 个人信息（微信号、手机号等）
    | 'platform' // 平台噪音（关注、点赞提示等）
    | 'copyright' // 版权声明
    | 'boilerplate' // 模板文字
    | 'whitespace'; // 多余空白

/** Options for controlling the cleaning pipeline */
export interface CleaningOptions {
  /** Categories to clean (defaults to all) */
  categories?: CleaningCategory[];
  /** Whether to also clean HTML content */
  cleanHtml?: boolean;
  /** Whether to preserve paragraph structure (double newlines) */
  preserveParagraphs?: boolean;
  /** Additional custom regex patterns to remove */
  customPatterns?: RegExp[];
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Patterns matching advertisement content (e-commerce links, coupons, ad markers).
 */
export const AD_PATTERNS: RegExp[] = [
  // 淘宝/天猫/京东链接
  /(?:复制|点击)?(?:这|这个)?(?:链接|口令|淘口令).*?(?:淘宝|天猫|京东|拼多多|闲鱼).*(?:\n|$)/g,
  /[¥$€]\w{6,}[¥$€]/g, // 淘口令 ¥xxx¥
  /https?:\/\/(?:s\.click\.taobao|item\.taobao|detail\.tmall|item\.jd)\.com\S*/gi,
  // 优惠券/折扣
  /(?:领取|使用)?(?:优惠券|折扣码|优惠码|返利|红包)[：:].*/g,
  /(?:下单|购买|入手)(?:链接|方式|渠道)[：:].*(?:\n|$)/g,
  // 广告标记
  /\[?(?:广告|推广|赞助|合作推广|商业合作)\]?/g,
  /(?:#?ad\b|#?sponsored|#?广告)/gi,
];

/**
 * Patterns matching soft promotions and product placements.
 */
export const PROMOTION_PATTERNS: RegExp[] = [
  // 产品推荐夹带
  /(?:安利|种草|推荐大家|必买|必入|回购|无限回购)(?:这|这个|这款)?(?:产品|东西|好物|神器).*(?:\n|$)/g,
  // 带货相关
  /(?:直播间|我的橱窗|小黄车|商品橱窗).*(?:\n|$)/g,
  // 品牌软广
  /(?:感谢|鸣谢).*(?:品牌|赞助|提供).*(?:\n|$)/g,
];

/**
 * Patterns matching personal contact information (WeChat, phone, email, etc.).
 */
export const PERSONAL_INFO_PATTERNS: RegExp[] = [
  // 微信号
  /(?:微信|wx|WeChat|加我|私信|vx|v信)[号：:\s]*[\w-]{4,20}/gi,
  /(?:微信|wx)[：:]\s*\S+/gi,
  // 公众号
  /(?:公众号|订阅号|服务号)[：:\s]*[^\n]{2,20}/g,
  /(?:关注|搜索)(?:我的)?公众号.*/g,
  // 手机号
  /(?:手机|电话|Tel|联系方式)[：:\s]*1[3-9]\d{9}/gi,
  /(?<!\d)1[3-9]\d{9}(?!\d)/g, // 独立手机号
  // 小红书号
  /(?:小红书号?|红薯号)[：:\s]*\d{5,}/g,
  // 微博号
  /(?:微博|weibo)[：:\s]*\S+/gi,
  // QQ号
  /(?:QQ|qq)[号：:\s]*\d{5,12}/g,
  // 邮箱
  /(?:邮箱|email|E-mail)[：:\s]*[\w.+-]+@[\w-]+\.[\w.]+/gi,
  // 抖音号
  /(?:抖音号?|douyin)[：:\s]*\S+/gi,
  // 个人简介块
  /(?:个人简介|关于我|自我介绍)[：:].{0,200}(?:\n\n|\n$|$)/gs,
];

/**
 * Patterns matching platform UI noise (like/follow prompts, image placeholders, etc.).
 */
export const PLATFORM_NOISE_PATTERNS: RegExp[] = [
  // 关注/点赞/收藏提示
  /(?:喜欢|觉得有用|有帮助)?(?:就|请)?(?:点赞|收藏|关注|转发|分享|评论|留言)(?:一下|[吧哦呀]|鼓励一下)?[！!]*/g,
  /(?:记得|别忘了?)(?:点赞|收藏|关注|转发).*/g,
  /(?:双击|三连|一键三连|长按).*/g,
  // 免责声明
  /(?:以上|本文)(?:仅代表|内容)(?:个人|作者)(?:观点|意见).*/g,
  // 评论引导
  /(?:你们|大家)?(?:觉得|认为)(?:呢|怎么样)[？?].*/g,
  /(?:欢迎|期待)(?:大家)?在?评论区.*/g,
  // 更新提示
  /(?:持续更新|不定期更新|关注获取最新).*/g,
  // 导航提示
  /(?:点击)?(?:查看|阅读)(?:更多|全文|原文|详情).*/g,
  /(?:上滑|下滑|左滑|右滑)(?:查看|了解)(?:更多|详情).*/g,
  // 图片占位符
  /\[?图片\]?/g,
  /\[?(?:图片占位符|图片加载中|图片未加载)\]?/g,
  /加载更多(?:内容|图片)?/g,
];

/**
 * Patterns matching copyright notices and reprint restrictions.
 */
export const COPYRIGHT_PATTERNS: RegExp[] = [
  /(?:版权|著作权)(?:所有|归|属于).*/g,
  /(?:未经|禁止)(?:授权|许可|允许)?(?:转载|复制|引用|使用).*/g,
  /(?:原创|原文)(?:内容|文章)?(?:，|,)?(?:转载|引用)(?:请|需).*/g,
  /©\s*.*/g,
  /All\s+Rights?\s+Reserved\.?/gi,
  /本文(?:由|系).*?(?:原创|首发).*/g,
];

/**
 * Patterns matching boilerplate / filler text (greetings, sign-offs, related links).
 */
export const BOILERPLATE_PATTERNS: RegExp[] = [
  // 开头套话
  /^大家好[，,]?(?:我是|这里是).*?[。.！!\n]/gm,
  // 结尾套话
  /(?:以上就是|好啦|好了|就这样|先写到这)(?:今天的|本次的|这次的)?(?:分享|攻略|游记|内容)?[啦了吧]?[，,。.！!]*/g,
  /(?:希望|祝)(?:大家|各位|你们?)?(?:旅途愉快|玩得开心|一路顺风).*/g,
  // 推荐其他文章
  /(?:推荐|相关)(?:阅读|文章|攻略)[：:].*/g,
  /(?:往期|历史|更多)(?:精彩|推荐|相关)(?:文章|内容|攻略).*/g,
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Clean text content by removing unwanted patterns category-by-category.
 * Whitespace normalization is always performed last.
 *
 * @param content - Raw text content to clean
 * @param options - Cleaning configuration
 * @returns Cleaning result with cleaned content and statistics
 *
 * @example
 * const result = cleanContent('Travel guide body... Follow my WeChat abc123 for more tips');
 * // result.content => 'Travel guide body...'
 * // result.removedTypes => ['personal', 'platform']
 */
export function cleanContent(
  content: string,
  options: CleaningOptions = {},
): CleaningResult {
  const {
    categories = ['ad', 'promotion', 'personal', 'platform', 'copyright', 'boilerplate', 'whitespace'],
    preserveParagraphs = true,
    customPatterns = [],
  } = options;

  const originalLength = content.length;
  let cleaned = content;
  let removedCount = 0;
  const removedTypes = new Set<CleaningCategory>();

  // Apply patterns for each requested category
  const categoryPatterns: Record<CleaningCategory, RegExp[]> = {
    ad: AD_PATTERNS,
    promotion: PROMOTION_PATTERNS,
    personal: PERSONAL_INFO_PATTERNS,
    platform: PLATFORM_NOISE_PATTERNS,
    copyright: COPYRIGHT_PATTERNS,
    boilerplate: BOILERPLATE_PATTERNS,
    whitespace: [], // Handled separately below
  };

  for (const category of categories) {
    if (category === 'whitespace')
      continue; // Whitespace is processed last

    const patterns = categoryPatterns[category] || [];
    for (const pattern of patterns) {
      // Create a fresh RegExp instance to avoid stale lastIndex
      const regex = new RegExp(pattern.source, pattern.flags);
      const before = cleaned;
      cleaned = cleaned.replace(regex, '');
      if (cleaned !== before) {
        removedCount++;
        removedTypes.add(category);
      }
    }
  }

  // Apply custom patterns
  for (const pattern of customPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const before = cleaned;
    cleaned = cleaned.replace(regex, '');
    if (cleaned !== before) {
      removedCount++;
    }
  }

  // Whitespace normalization (always last)
  if (categories.includes('whitespace')) {
    const before = cleaned;
    cleaned = normalizeWhitespace(cleaned, preserveParagraphs);
    if (cleaned !== before) {
      removedTypes.add('whitespace');
    }
  }

  return {
    content: cleaned,
    removedCount,
    removedTypes: Array.from(removedTypes),
    originalLength,
    cleanedLength: cleaned.length,
  };
}

/**
 * Clean HTML content by removing unsafe elements and ad-related DOM nodes.
 * Strips script/style/iframe tags, inline event handlers (XSS prevention),
 * tracking attributes, hidden elements, and empty tags.
 *
 * @param html - Raw HTML string to clean
 * @returns Sanitized HTML string
 */
export function cleanHtmlContent(html: string): string {
  let cleaned = html;

  // Remove script/style/iframe tags
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^>]*>.*?<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^>]*>/gi, '');

  // Remove elements with ad-related class/id attributes
  const adSelectors = [
    /class\s*=\s*["'][^"']*(?:ad-container|advertisement|sponsor|promotion|banner-ad|popup|modal)[^"']*["']/gi,
    /id\s*=\s*["'][^"']*(?:ad-|ads-|advertisement|sponsor|banner)[^"']*["']/gi,
  ];
  for (const selector of adSelectors) {
    // Remove the entire tag and its content
    cleaned = cleaned.replace(
      new RegExp(`<div\\b[^>]*${selector.source}[^>]*>.*?</div>`, 'gis'),
      '',
    );
  }

  // Remove inline event handler attributes (XSS prevention)
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove tracking data attributes
  cleaned = cleaned.replace(/\s+data-(?:track|ad|click|monitor)[\w-]*\s*=\s*["'][^"']*["']/gi, '');

  // Remove display:none elements
  cleaned = cleaned.replace(
    /<[^>]+style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/\w+>/gis,
    '',
  );

  // Recursively remove empty tags
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/<(\w+)\b[^>]*>\s*<\/\1>/g, '');
  }

  return cleaned.trim();
}

/**
 * Normalize whitespace characters in text content.
 *
 * @param content - Text to normalize
 * @param preserveParagraphs - If true, keeps double-newline paragraph breaks;
 *   if false, collapses all whitespace to single spaces
 * @returns Normalized text with trimmed edges
 */
export function normalizeWhitespace(
  content: string,
  preserveParagraphs: boolean = true,
): string {
  let cleaned = content;

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  if (preserveParagraphs) {
    // Collapse 3+ newlines into paragraph separator (double newline)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // Collapse inline whitespace
    cleaned = cleaned.replace(/[^\S\n]+/g, ' ');
    // Trim leading/trailing spaces per line
    cleaned = cleaned.replace(/^ +| +$/gm, '');
  }
  else {
    // Collapse all whitespace into single space
    cleaned = cleaned.replace(/\s+/g, ' ');
  }

  return cleaned.trim();
}

/**
 * Detect the ratio of ad/promotion/personal-info content in a text.
 *
 * @param content - Text content to analyze
 * @returns Ad density score (0 = no ads, 1 = entirely ads).
 *   Note: overlapping pattern matches may cause slight over-counting,
 *   but the result is clamped to [0, 1].
 *
 * @example
 * const density = detectAdDensity('Normal content plus WeChat ID abc123');
 * // density > 0 indicates ad content was detected
 */
export function detectAdDensity(content: string): number {
  if (!content || content.length === 0)
    return 0;

  const allPatterns = [
    ...AD_PATTERNS,
    ...PROMOTION_PATTERNS,
    ...PERSONAL_INFO_PATTERNS,
  ];

  let matchedLength = 0;

  for (const pattern of allPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches = content.match(regex);
    if (matches) {
      matchedLength += matches.reduce((sum, m) => sum + m.length, 0);
    }
  }

  // Clamp to [0, 1] — overlapping matches may exceed actual length
  return Math.min(1, matchedLength / content.length);
}

/**
 * Extract pure article body by aggressively removing all non-content material.
 * More aggressive than {@link cleanContent} — suitable for AI pre-processing.
 *
 * @param content - Raw text content
 * @returns Cleaned text with only article body remaining
 */
export function extractPureContent(content: string): string {
  const result = cleanContent(content, {
    categories: ['ad', 'promotion', 'personal', 'platform', 'copyright', 'boilerplate', 'whitespace'],
    preserveParagraphs: true,
  });

  return result.content;
}

/**
 * Check whether content is low quality (too short or ad-heavy).
 *
 * @param content - Text content to evaluate
 * @param options - Evaluation options
 * @param options.minLength - Minimum acceptable length after cleaning (default: 100)
 * @param options.maxAdDensity - Maximum acceptable ad density ratio (default: 0.3)
 * @returns `true` if the content is considered low quality
 */
export function isLowQualityContent(
  content: string,
  options: { minLength?: number; maxAdDensity?: number } = {},
): boolean {
  const { minLength = 100, maxAdDensity = 0.3 } = options;

  if (!content || content.length < minLength) {
    return true;
  }

  const cleaned = cleanContent(content);
  if (cleaned.cleanedLength < minLength) {
    return true;
  }

  const adDensity = detectAdDensity(content);
  if (adDensity > maxAdDensity) {
    return true;
  }

  return false;
}

/**
 * Clean multiple content strings in a single call.
 *
 * @param contents - Array of raw text strings
 * @param options - Shared cleaning configuration
 * @returns Array of cleaning results (same order as input)
 */
export function cleanContentBatch(
  contents: string[],
  options?: CleaningOptions,
): CleaningResult[] {
  return contents.map(content => cleanContent(content, options));
}
