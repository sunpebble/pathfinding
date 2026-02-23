/**
 * Content Cleaner Module
 * 清洗爬取的游记内容：去除广告、推广、个人信息、平台噪音
 */

// ============================================================================
// Types
// ============================================================================

export interface CleaningResult {
  /** 清洗后的内容 */
  content: string;
  /** 清洗后的 HTML 内容 */
  contentHtml?: string;
  /** 移除的内容片段数 */
  removedCount: number;
  /** 移除的内容类型 */
  removedTypes: CleaningCategory[];
  /** 原始内容长度 */
  originalLength: number;
  /** 清洗后内容长度 */
  cleanedLength: number;
}

export type CleaningCategory
  = | 'ad' // 广告
    | 'promotion' // 推广/软广
    | 'personal' // 个人信息（微信号、手机号等）
    | 'platform' // 平台噪音（关注、点赞提示等）
    | 'copyright' // 版权声明
    | 'boilerplate' // 模板文字
    | 'whitespace'; // 多余空白

export interface CleaningOptions {
  /** 要执行的清洗类别，默认全部 */
  categories?: CleaningCategory[];
  /** 是否同时清洗 HTML */
  cleanHtml?: boolean;
  /** 是否保留段落结构 */
  preserveParagraphs?: boolean;
  /** 自定义过滤规则 */
  customPatterns?: RegExp[];
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * 广告相关模式
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
 * 推广/软广模式
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
 * 个人信息模式
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
 * 平台噪音模式
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
 * 版权声明模式
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
 * 模板/套话模式
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
 * 清洗文本内容
 *
 * @example
 * const result = cleanContent('游记正文...关注我的微信号abc123获取更多攻略');
 * // result.content === '游记正文...'
 * // result.removedTypes === ['personal', 'platform']
 */
export function cleanContent(
  content: string,
  options: CleaningOptions = {},
): CleaningResult {
  const {
    categories = [
      'ad',
      'promotion',
      'personal',
      'platform',
      'copyright',
      'boilerplate',
      'whitespace',
    ],
    preserveParagraphs = true,
    customPatterns = [],
  } = options;

  const originalLength = content.length;
  let cleaned = content;
  let removedCount = 0;
  const removedTypes = new Set<CleaningCategory>();

  // 按类别逐步清洗
  const categoryPatterns: Record<CleaningCategory, RegExp[]> = {
    ad: AD_PATTERNS,
    promotion: PROMOTION_PATTERNS,
    personal: PERSONAL_INFO_PATTERNS,
    platform: PLATFORM_NOISE_PATTERNS,
    copyright: COPYRIGHT_PATTERNS,
    boilerplate: BOILERPLATE_PATTERNS,
    whitespace: [], // 特殊处理
  };

  for (const category of categories) {
    if (category === 'whitespace')
      continue; // 最后处理

    const patterns = categoryPatterns[category] || [];
    for (const pattern of patterns) {
      // 确保使用新的 RegExp 实例（避免 lastIndex 问题）
      const regex = new RegExp(pattern.source, pattern.flags);
      const before = cleaned;
      cleaned = cleaned.replace(regex, '');
      if (cleaned !== before) {
        removedCount++;
        removedTypes.add(category);
      }
    }
  }

  // 自定义模式
  for (const pattern of customPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const before = cleaned;
    cleaned = cleaned.replace(regex, '');
    if (cleaned !== before) {
      removedCount++;
    }
  }

  // 空白处理（最后执行）
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
 * 清洗 HTML 内容
 * 移除广告相关的 DOM 元素和不安全内容
 */
export function cleanHtmlContent(html: string): string {
  let cleaned = html;

  // 移除 script/style/iframe 标签
  cleaned = cleaned.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    '',
  );
  cleaned = cleaned.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    '',
  );
  cleaned = cleaned.replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^>]*>.*?<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^>]*>/gi, '');

  // 移除广告相关 class/id 的元素
  const adSelectors = [
    /class\s*=\s*["'][^"']*(?:ad-container|advertisement|sponsor|promotion|banner-ad|popup|modal)[^"']*["']/gi,
    /id\s*=\s*["'][^"']*(?:ad-|ads-|advertisement|sponsor|banner)[^"']*["']/gi,
  ];
  for (const selector of adSelectors) {
    // 移除匹配的整个标签及其内容
    cleaned = cleaned.replace(
      new RegExp(`<div\\b[^>]*${selector.source}[^>]*>.*?</div>`, 'gis'),
      '',
    );
  }

  // 移除事件处理属性 (XSS prevention)
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

  // 移除 data-track 等跟踪属性
  cleaned = cleaned.replace(
    /\s+data-(?:track|ad|click|monitor)[\w-]*\s*=\s*["'][^"']*["']/gi,
    '',
  );

  // 移除 display:none 的元素
  cleaned = cleaned.replace(
    /<[^>]+style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/\w+>/gis,
    '',
  );

  // 移除空标签（递归清理）
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/<(\w+)\b[^>]*>\s*<\/\1>/g, '');
  }

  return cleaned.trim();
}

/**
 * 标准化空白字符
 */
export function normalizeWhitespace(
  content: string,
  preserveParagraphs: boolean = true,
): string {
  let cleaned = content;

  // 统一换行符
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\r/g, '\n');

  if (preserveParagraphs) {
    // 保留段落分隔（双换行），但规范化
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    // 行内多余空格
    cleaned = cleaned.replace(/[^\S\n]+/g, ' ');
    // 段落开头/结尾空格
    cleaned = cleaned.replace(/^ +| +$/gm, '');
  }
  else {
    // 所有连续空白替换为单空格
    cleaned = cleaned.replace(/\s+/g, ' ');
  }

  return cleaned.trim();
}

/**
 * 检测内容中的广告/推广密度
 * 返回 0-1 的分数，0 = 无广告，1 = 全是广告
 *
 * @example
 * const density = detectAdDensity('正常内容加上微信号abc123');
 * // density > 0 表示含有广告内容
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

  // 避免重复计算（同一文字可能被多个规则匹配）
  return Math.min(1, matchedLength / content.length);
}

/**
 * 从内容中提取纯正文（去除所有非正文内容）
 * 比 cleanContent 更激进，适合 AI 处理前的预处理
 */
export function extractPureContent(content: string): string {
  const result = cleanContent(content, {
    categories: [
      'ad',
      'promotion',
      'personal',
      'platform',
      'copyright',
      'boilerplate',
      'whitespace',
    ],
    preserveParagraphs: true,
  });

  return result.content;
}

/**
 * 判断内容是否为低质量（广告含量高或内容过短）
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
 * 批量清洗多个内容
 */
export function cleanContentBatch(
  contents: string[],
  options?: CleaningOptions,
): CleaningResult[] {
  return contents.map(content => cleanContent(content, options));
}
