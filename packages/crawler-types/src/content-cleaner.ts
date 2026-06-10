/**
 * Content Cleaner Module
 * Cleans crawled travel guide content by removing ads, promotions,
 * personal contact IDs (WeChat, QQ, ...), and platform noise.
 *
 * Deletion policy (D5 — precision first):
 * - A whole line may only be deleted when the pattern is anchored at the
 *   start of the line (`^...$` with the `m` flag) or requires explicit
 *   funneling context (e.g. 「加微信」「关注公众号」).
 * - Bare keywords (推荐 / 微信 / 分享 / 图片 / 电话 ...) must NEVER trigger
 *   sentence or line deletion — they are everyday words in travel content.
 * - Mainland mobile numbers are MASKED (`138****1234`), never deleted:
 *   a hotel front-desk number is data, not noise.
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
    | 'personal' // 个人信息（微信号等；手机号脱敏而非删除）
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
 * Line deletions require funneling context (复制链接→电商平台) or a line-start
 * anchor; inline deletions only match unambiguous tokens (淘口令, URLs, [广告]).
 */
export const AD_PATTERNS: RegExp[] = [
  // 引流上下文：复制/点击 + 链接/口令 + 电商平台 → 删整行
  /^.*(?:复制|点击)(?:这|这个|此)?(?:链接|口令|淘口令).*(?:淘宝|天猫|京东|拼多多|闲鱼).*$/gm,
  /[¥$€]\w{6,}[¥$€]/g, // 淘口令 ¥xxx¥（token 本身无歧义，可行内删除）
  /https?:\/\/(?:s\.click\.taobao|item\.taobao|detail\.tmall|item\.jd)\.com\S*/gi,
  // 优惠券/下单引导：行首锚点 + 冒号
  /^(?:领取|使用)?(?:优惠券|折扣码|优惠码|返利|红包)[：:].*$/gm,
  /^(?:下单|购买|入手)(?:链接|方式|渠道)[：:].*$/gm,
  // 广告标记：必须带方括号，裸词「广告/推广」不删
  /\[(?:广告|推广|赞助|合作推广|商业合作)\]/g,
  // 话题标签必须带 #，裸词 ad 不删
  /#(?:ad|sponsored)\b/gi,
  /#广告/g,
];

/**
 * Patterns matching soft promotions and product placements.
 * All line deletions are line-start anchored or require commerce context.
 */
export const PROMOTION_PATTERNS: RegExp[] = [
  // 行首种草句（必须紧跟产品词，「推荐大家去看日出」不受影响）
  /^(?:安利|种草|无限回购)(?:这|这个|这款)?(?:产品|东西|好物|神器).*$/gm,
  // 带货入口：行首锚点
  /^(?:直播间|我的橱窗|商品橱窗|小黄车).*$/gm,
  // 带货入口：引流动词上下文
  /(?:点击|进入|来我|去我)的?(?:直播间|橱窗|小黄车).*$/gm,
  // 品牌软广鸣谢：行首锚点
  /^(?:感谢|鸣谢).*(?:品牌|赞助|提供).*$/gm,
];

/**
 * Patterns matching personal contact information (WeChat, QQ, email, etc.).
 * Each pattern requires an explicit account-label + separator/ID context,
 * so bare platform words (微信支付 / 看微博) survive. Mainland mobile numbers
 * are handled separately via {@link maskPhoneNumbers} — masked, not deleted.
 */
export const PERSONAL_INFO_PATTERNS: RegExp[] = [
  // 微信号（需要平台词 + 紧跟的账号 ID；分隔符不允许跨行）
  /(?:加我?|私信我?)?(?:微信号?|WeChat号?|\bwx|\bvx|v信号?)[：: \t]*[\w-]{4,20}/gi,
  // 公众号：带冒号的账号声明（行内删除声明本身）
  /公众号[：:][^\n]{2,20}/g,
  // 公众号：引流上下文（关注/搜索 + 公众号）→ 删整行
  /^.*(?:关注|搜索)(?:一下)?(?:我的)?(?:微信)?公众号.*$/gm,
  // 小红书号
  /(?:小红书号|红薯号)[：: \t]*\d{5,}/g,
  // 微博（必须带冒号，裸词「微博」不删）
  /(?:微博|weibo)号?[：:][ \t]*\S+/gi,
  // QQ号
  /\bQQ号?[：: \t]*\d{5,12}/gi,
  // 邮箱
  /(?:邮箱|email|E-mail)[：: \t]*[\w.+-]+@[\w-]+\.[\w.]+/gi,
  // 抖音号
  /(?:抖音号|douyin号?)[：: \t]*[\w.-]{2,}/gi,
  // 个人简介块（行首锚点）
  /^(?:个人简介|关于我|自我介绍)[：:].{0,200}$/gm,
];

/**
 * Mainland China mobile number, capturing prefix (3 digits) and suffix
 * (4 digits) so the middle four digits can be masked: `138****1234`.
 */
export const MAINLAND_MOBILE_PATTERN = /(?<!\d)(1[3-9]\d)\d{4}(\d{4})(?!\d)/g;

/**
 * Patterns matching platform UI noise (like/follow prompts, image placeholders, etc.).
 * Engagement prompts are only deleted when they make up the entire line.
 */
export const PLATFORM_NOISE_PATTERNS: RegExp[] = [
  // 点赞/收藏/关注提示：整行才删（句中「分享」「评论」等裸词不触发）
  /^(?:喜欢|觉得(?:有用|不错|有帮助))?(?:的话)?(?:就|请|别忘了?|记得|一定要)?(?:点赞|收藏|关注|转发|分享|评论|留言)(?:[、，,]*(?:点赞|收藏|关注|转发|分享|评论|留言))*(?:一下|[哦吧呀啦]|鼓励一下|支持一下)?[！!。.～~\s]*$/gm,
  /^(?:双击|一键三连|三连)[\w！!～~]{0,12}$/gm,
  // 评论引导：需要 欢迎/期待 + 评论区 引流上下文
  /^.*(?:欢迎|期待)(?:大家|你们)?在?评论区.*$/gm,
  // 互动提问：整行才删（段中议论句「大家觉得怎么样？我认为…」保留）
  /^(?:你们|大家)觉得(?:呢|怎么样)[？?！!\s]*$/gm,
  // 免责声明：行首锚点
  /^(?:以上|本文)(?:内容)?仅代表(?:个人|作者)(?:观点|意见).*$/gm,
  // 更新提示：仅独立状态行（「持续更新中的小贴士：…」保留）
  /^(?:持续更新中?|不定期更新)[…⋯\s.。！!~～]*$/gm,
  /^关注我?(?:获取|查看)最新.*$/gm,
  // 导航提示：仅独立 UI 行（「查看更多景点可以去游客中心」保留）
  /^(?:点击)?(?:查看|阅读)(?:更多|全文|原文|详情)[＞>》…⋯\s.。]*$/gm,
  /^(?:上滑|下滑|左滑|右滑)(?:查看|了解)(?:更多|详情).*$/gm,
  // 图片占位符：必须带方括号或为完整占位词，裸词「图片」不删
  /\[图片\]/g,
  /图片占位符|图片加载中|图片未加载/g,
  /加载更多(?:内容|图片)?/g,
];

/**
 * Patterns matching copyright notices and reprint restrictions.
 * Whole-line deletion is allowed only with strong legal-phrase context.
 */
export const COPYRIGHT_PATTERNS: RegExp[] = [
  /^.*(?:版权|著作权)(?:所有|均?归|属于).*$/gm,
  /^.*未经(?:授权|许可|允许).{0,10}(?:转载|复制|引用|使用).*$/gm,
  /^.*禁止(?:转载|盗用|搬运).*$/gm,
  /^(?:原创|原文)(?:内容|文章)?[，,]?(?:转载|引用)[请需须].*$/gm,
  /©[^\n]*/g,
  /All\s+Rights?\s+Reserved\.?/gi,
  /^本文(?:由|系).*?(?:原创|首发).*$/gm,
];

/**
 * Patterns matching boilerplate / filler text (greetings, sign-offs, related links).
 * Sign-offs are deleted only when the boilerplate is the entire line, so
 * lines like 「好了，接下来去吃饭」 survive.
 */
export const BOILERPLATE_PATTERNS: RegExp[] = [
  // 开头套话（行首锚点）
  /^大家好[，,]?(?:我是|这里是).*?[。.！!\n]/gm,
  // 结尾套话：整行才删
  /^(?:以上就是|好啦|好了|就这样|先写到这里?)[，,]?(?:今天的|本次的|这次的)?(?:分享|攻略|游记|内容)?(?:就?到这里?)?[啦了吧]?[，,。.！!～~\s]*$/gm,
  /^(?:希望|祝)(?:大家|各位|你们?)?(?:旅途愉快|玩得开心|一路顺风)[！!。.～~\s]*$/gm,
  // 推荐其他文章：必须「推荐/相关 + 阅读/文章/攻略 + 冒号」行首锚点，裸词「推荐」不删
  /^(?:推荐|相关|延伸)(?:阅读|文章|攻略)[：:].*$/gm,
  /^(?:往期|历史|更多)(?:精彩|推荐|相关)(?:文章|内容|攻略).*$/gm,
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Mask mainland mobile numbers in place: `13912345678` → `139****5678`.
 * Keeps the surrounding sentence intact so POI contact info survives.
 *
 * @param content - Text possibly containing mobile numbers
 * @returns Text with the middle four digits of each number masked
 */
export function maskPhoneNumbers(content: string): string {
  return content.replace(MAINLAND_MOBILE_PATTERN, '$1****$2');
}

/**
 * Clean text content by removing unwanted patterns category-by-category.
 * The `personal` category additionally masks mainland mobile numbers
 * (see {@link maskPhoneNumbers}) instead of deleting them.
 * Whitespace normalization is always performed last.
 *
 * @param content - Raw text content to clean
 * @param options - Cleaning configuration
 * @returns Cleaning result with cleaned content and statistics
 *
 * @example
 * const result = cleanContent('Travel guide body... 加我微信abc123');
 * // result.content => 'Travel guide body...'
 * // result.removedTypes => ['personal']
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

    // Mobile numbers are masked, not removed (D5)
    if (category === 'personal') {
      const beforeMask = cleaned;
      cleaned = maskPhoneNumbers(cleaned);
      if (cleaned !== beforeMask) {
        removedCount++;
        removedTypes.add('personal');
      }
    }

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
 * const density = detectAdDensity('Normal content plus 微信号：abc123');
 * // density > 0 indicates ad content was detected
 */
export function detectAdDensity(content: string): number {
  if (!content || content.length === 0)
    return 0;

  const allPatterns = [
    ...AD_PATTERNS,
    ...PROMOTION_PATTERNS,
    ...PERSONAL_INFO_PATTERNS,
    MAINLAND_MOBILE_PATTERN,
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
