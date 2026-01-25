/**
 * Accessibility Tree Parser
 *
 * Chrome DevTools MCP returns snapshots in accessibility tree format, not HTML.
 * This module provides utilities to parse and extract content from this format.
 *
 * Example accessibility tree format:
 * ```
 * uid=5_0 RootWebArea "Page Title Here" url="https://..."
 *   uid=5_1 navigation
 *     uid=5_2 link "Home"
 *   uid=5_3 main
 *     uid=5_4 heading "Article Title"
 *     uid=5_5 StaticText "Author: 用户名"
 *     uid=5_6 StaticText "正文第一段..."
 *     uid=5_7 img alt="图片描述"
 * ```
 */

export interface ParsedNode {
  uid: string;
  role: string;
  name?: string;
  url?: string;
  alt?: string;
  raw: string;
}

export interface ExtractedContent {
  pageTitle: string;
  headings: string[];
  textContent: string[];
  links: Array<{ text: string; url: string }>;
  images: Array<{ alt: string; url?: string }>;
  author?: string;
  stats?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
}

/**
 * Parse a single line from accessibility tree into a structured node
 */
export function parseNode(line: string): ParsedNode | null {
  // Match pattern: uid=X_Y role "name" [additional attrs]
  // Examples:
  //   uid=5_0 RootWebArea "Page Title" url="https://..."
  //   uid=5_1 heading "Section Title"
  //   uid=5_2 StaticText "Some text content"
  //   uid=5_3 link "Click me" url="https://..."
  //   uid=5_4 img alt="Image description"

  const uidMatch = line.match(/uid=(\S+)/);
  if (!uidMatch) return null;

  const uid = uidMatch[1];

  // Extract role (word after uid)
  const afterUid = line.substring(line.indexOf(uid) + uid.length).trim();
  const roleMatch = afterUid.match(/^(\w+)/);
  if (!roleMatch) return null;

  const role = roleMatch[1];

  // Extract quoted name
  const nameMatch = afterUid.match(/^[\w\s]+"([^"]*)"/);
  const name = nameMatch?.[1];

  // Extract url if present
  const urlMatch = line.match(/url="([^"]+)"/);
  const url = urlMatch?.[1];

  // Extract alt if present (for images)
  const altMatch = line.match(/alt="([^"]+)"/);
  const alt = altMatch?.[1];

  return {
    uid,
    role,
    name,
    url,
    alt,
    raw: line,
  };
}

/**
 * Extract page title from RootWebArea
 */
export function extractPageTitle(content: string): string {
  const match = content.match(/RootWebArea\s+"([^"]+)"/);
  if (match) {
    // Clean up common suffixes
    return match[1]
      .replace(/\s*[-|_–]\s*(携程|去哪儿|马蜂窝|同程|途牛|驴妈妈).*$/, '')
      .replace(/\s*[-|_–]\s*游记.*$/, '')
      .replace(/\s*[-|_–]\s*旅游.*$/, '')
      .trim();
  }
  return '';
}

/**
 * Extract all headings from the accessibility tree
 */
export function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match heading nodes: heading "Title Text"
    const headingMatch = line.match(/heading\s+"([^"]+)"/);
    if (headingMatch) {
      const text = headingMatch[1].trim();
      if (text.length >= 3 && text.length <= 200) {
        headings.push(text);
      }
    }
  }

  return headings;
}

/**
 * Extract static text content from accessibility tree
 */
export function extractStaticText(content: string): string[] {
  const texts: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match StaticText nodes: StaticText "Content here"
    const textMatch = line.match(/StaticText\s+"([^"]+)"/);
    if (textMatch) {
      const text = textMatch[1].trim();
      // Filter out very short or navigation-like text
      if (
        text.length >= 10 &&
        !/^(?:首页|登录|注册|返回|分享|收藏|评论|点赞)$/.test(text)
      ) {
        texts.push(text);
      }
    }
  }

  return texts;
}

/**
 * Extract links from accessibility tree
 */
export function extractLinks(
  content: string
): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match link nodes: link "Link Text" url="https://..."
    const linkMatch = line.match(/link\s+"([^"]+)"\s+url="([^"]+)"/);
    if (linkMatch) {
      links.push({
        text: linkMatch[1].trim(),
        url: linkMatch[2],
      });
    }
  }

  return links;
}

/**
 * Extract image URLs from accessibility tree and raw content
 */
export function extractImageUrls(content: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Method 1: Look for image URLs in the content
  const urlMatches = content.matchAll(
    /https?:\/\/[^\s"'\\)\]]+\.(jpg|jpeg|png|webp|gif)/gi
  );

  for (const match of urlMatches) {
    const url = match[0];
    // Filter out avatars, icons, logos
    if (
      !url.includes('avatar') &&
      !url.includes('icon') &&
      !url.includes('logo') &&
      !url.includes('emoji') &&
      !url.includes('badge') &&
      !seen.has(url)
    ) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Extract author name from accessibility tree
 */
export function extractAuthor(content: string): string | undefined {
  // Common author patterns in accessibility tree
  const patterns = [
    // Direct author label
    /(?:作者|author|用户|发布者)[：:\s]+"?([^"\n\]]{2,30})"?/i,
    // StaticText with author-like content
    /StaticText\s+"(?:作者|author)[：:\s]*([^"]{2,30})"/i,
    // After "by" or Chinese equivalent
    /(?:by|发布)\s+"?([^"\n\]]{2,30})"?/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const author = match[1].trim();
      // Filter out common false positives
      if (
        !author.includes('http') &&
        !author.includes('感谢') &&
        author.length >= 2 &&
        author.length <= 30
      ) {
        return author;
      }
    }
  }

  return undefined;
}

/**
 * Extract view/like counts from accessibility tree
 */
export function extractStats(content: string): {
  views?: number;
  likes?: number;
  comments?: number;
} {
  const stats: { views?: number; likes?: number; comments?: number } = {};

  // Views patterns
  const viewsPatterns = [
    /(?:浏览|阅读|views?|观看)[：:\s]*(\d+)/i,
    /(\d+)\s*(?:次浏览|次阅读|views)/i,
  ];

  for (const pattern of viewsPatterns) {
    const match = content.match(pattern);
    if (match) {
      stats.views = Number.parseInt(match[1], 10);
      break;
    }
  }

  // Likes patterns
  const likesPatterns = [
    /(?:点赞|喜欢|likes?|赞)[：:\s]*(\d+)/i,
    /(\d+)\s*(?:个赞|人赞|likes)/i,
  ];

  for (const pattern of likesPatterns) {
    const match = content.match(pattern);
    if (match) {
      stats.likes = Number.parseInt(match[1], 10);
      break;
    }
  }

  // Comments patterns
  const commentsPatterns = [
    /(?:评论|comments?)[：:\s]*(\d+)/i,
    /(\d+)\s*(?:条评论|评论)/,
  ];

  for (const pattern of commentsPatterns) {
    const match = content.match(pattern);
    if (match) {
      stats.comments = Number.parseInt(match[1], 10);
      break;
    }
  }

  return stats;
}

/**
 * Get the best title from multiple sources
 */
export function getBestTitle(content: string, fallback: string = ''): string {
  // Priority 1: First meaningful heading
  const headings = extractHeadings(content);
  const meaningfulHeading = headings.find(
    (h) =>
      h.length >= 5 &&
      h.length <= 100 &&
      /[\u4E00-\u9FFF]/.test(h) && // Contains Chinese
      !/^(?:首页|登录|注册|返回|分享|收藏|评论|点赞|导航|菜单)/.test(h)
  );

  if (meaningfulHeading) {
    return meaningfulHeading;
  }

  // Priority 2: Page title from RootWebArea
  const pageTitle = extractPageTitle(content);
  if (pageTitle && pageTitle.length >= 3) {
    return pageTitle;
  }

  return fallback;
}

/**
 * Get combined text content suitable for article body
 */
export function getArticleContent(content: string): string {
  const staticTexts = extractStaticText(content);

  // Filter and deduplicate
  const seen = new Set<string>();
  const filtered: string[] = [];

  for (const text of staticTexts) {
    // Skip if too short or duplicate
    if (text.length < 15) continue;
    if (seen.has(text)) continue;

    // Skip navigation/UI text
    if (/^(?:首页|登录|注册|返回|分享|收藏|评论|点赞|上一|下一)/.test(text)) {
      continue;
    }

    // Skip if it looks like a URL or technical content
    if (text.includes('http') || text.includes('uid=')) continue;

    seen.add(text);
    filtered.push(text);
  }

  return filtered.join('\n\n');
}

/**
 * Parse Chinese formatted numbers with unit suffixes
 * Examples: "2.7千" (2700), "11.5万" (115000), "1234" (1234)
 */
export function parseChineseNumber(text: string): number {
  const match = text.match(/([\d.]+)\s*([千万kw])?/i);
  if (!match) return 0;

  const num = Number.parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();

  if (unit === '千' || unit === 'k') {
    return Math.round(num * 1000);
  }
  if (unit === '万' || unit === 'w') {
    return Math.round(num * 10000);
  }

  return Math.round(num);
}

/**
 * Transform Ctrip CDN URLs to high-resolution versions
 * Replaces _W_640_0_Q90 pattern with _W_0_0_Q100 for max quality
 */
export function transformToHighRes(url: string): string {
  if (!url.includes('c-ctrip.com')) {
    return url;
  }

  // Replace _W_XXX_XXX_QXX pattern with _W_0_0_Q100
  // Keep query parameters intact
  return url.replace(/_W_\d+_\d+_Q\d+/, '_W_0_0_Q100');
}

/**
 * Extract publish date from content
 * Supports ISO format (2023-05-09), Chinese format (2023年5月9日), and labeled format
 * Returns date in YYYY-MM-DD format
 */
export function extractPublishDate(content: string): string | undefined {
  // Priority 1: Labeled date (发布时间：2023-05-09)
  const labeledMatch = content.match(
    /发布(?:时间)?[：:]\s*(\d{4}-\d{2}-\d{2})/
  );
  if (labeledMatch) {
    return labeledMatch[1];
  }

  // Priority 2: ISO-like format (2023-05-09)
  const isoMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Priority 3: Chinese format (2023年5月9日)
  const chineseMatch = content.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (chineseMatch) {
    const year = chineseMatch[1];
    const month = chineseMatch[2].padStart(2, '0');
    const day = chineseMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

/**
 * Extract Ctrip engagement stats from content
 * Uses parseChineseNumber internally for all numeric parsing
 *
 * Handles two formats:
 * 1. Inline: "阅读量2.7千" (label and number in same string)
 * 2. Accessibility tree: StaticText "阅读量" followed by StaticText "5.7万" (separate nodes)
 */
export function extractCtripStats(content: string): {
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
} {
  const stats: {
    views?: number;
    likes?: number;
    saves?: number;
    comments?: number;
  } = {};

  // === Views ===
  // Format 1: Inline - 阅读量2.7千 or 浏览量1234
  const viewsMatch = content.match(/(?:阅读|浏览)量\s*([\d.]+[千万kw]?)/i);
  if (viewsMatch) {
    const num = parseChineseNumber(viewsMatch[1]);
    if (num > 0) stats.views = num;
  }

  // Format 2: Accessibility tree - "阅读量" followed by number on next StaticText
  if (!stats.views) {
    const accessibilityViewsMatch = content.match(
      /StaticText\s+"(?:阅读量|浏览量)"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilityViewsMatch) {
      const num = parseChineseNumber(accessibilityViewsMatch[1]);
      if (num > 0) stats.views = num;
    }
  }

  // === Likes ===
  // Format 1: Inline - 点赞120 or 120个赞 or 赞 85 or 有用123
  const likesMatch =
    content.match(/(?:点赞|有用)\s*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*(?:点赞|个赞)/i);
  if (likesMatch) {
    const num = parseChineseNumber(likesMatch[1]);
    if (num > 0) stats.likes = num;
  }

  // Format 2: Accessibility tree
  if (!stats.likes) {
    const accessibilityLikesMatch = content.match(
      /StaticText\s+"(?:点赞|有用|赞)"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilityLikesMatch) {
      const num = parseChineseNumber(accessibilityLikesMatch[1]);
      if (num > 0) stats.likes = num;
    }
  }

  // === Saves ===
  // Format 1: Inline - 收藏85 or 85收藏
  const savesMatch =
    content.match(/收藏\s*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*收藏/i);
  if (savesMatch) {
    const num = parseChineseNumber(savesMatch[1]);
    if (num > 0) stats.saves = num;
  }

  // Format 2: Accessibility tree
  if (!stats.saves) {
    const accessibilitySavesMatch = content.match(
      /StaticText\s+"收藏"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilitySavesMatch) {
      const num = parseChineseNumber(accessibilitySavesMatch[1]);
      if (num > 0) stats.saves = num;
    }
  }

  // === Comments ===
  // Format 1: Inline - 评论30 or 30条评论
  const commentsMatch =
    content.match(/(?:评论|条评论)\s*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*(?:条评论|评论)/i);
  if (commentsMatch) {
    const num = parseChineseNumber(commentsMatch[1]);
    if (num > 0) stats.comments = num;
  }

  // Format 2: Accessibility tree
  if (!stats.comments) {
    const accessibilityCommentsMatch = content.match(
      /StaticText\s+"(?:评论|条评论)"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilityCommentsMatch) {
      const num = parseChineseNumber(accessibilityCommentsMatch[1]);
      if (num > 0) stats.comments = num;
    }
  }

  return stats;
}

/**
 * Extract author name and avatar URL with Ctrip-specific patterns
 *
 * Attempts multiple extraction patterns with Ctrip-specific patterns first:
 * 1. Ctrip author pattern: 作者：name
 * 2. Name before profile link
 * 3. Fallback to generic extractAuthor()
 *
 * Avatar extraction is best-effort (often not available)
 */
export function extractAuthorWithAvatar(content: string): {
  name?: string;
  avatar?: string;
} {
  let name: string | undefined;
  let avatar: string | undefined;

  // Pattern 1: Ctrip-specific author label - 作者：name or 作者:name
  const ctripAuthorMatch = content.match(/作者[：:]\s*"?([^"\n\]]{2,30})"?/);
  if (ctripAuthorMatch) {
    const candidate = ctripAuthorMatch[1].trim();
    if (isValidAuthorName(candidate)) {
      name = candidate;
    }
  }

  // Pattern 2: Name before profile link (common in accessibility trees)
  if (!name) {
    const profileLinkMatch = content.match(
      /StaticText\s+"([\u4E00-\u9FFF\w]{2,20})"\s+link.*profile/i
    );
    if (profileLinkMatch) {
      const candidate = profileLinkMatch[1].trim();
      if (isValidAuthorName(candidate)) {
        name = candidate;
      }
    }
  }

  // Pattern 3: Fallback to generic extractAuthor
  if (!name) {
    name = extractAuthor(content);
  }

  // Extract avatar (best effort)
  // Pattern: avatar/头像 followed by image URL
  const avatarMatch =
    content.match(
      /(?:avatar|头像).*?(https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp))/i
    ) || content.match(/img.*?(?:avatar|author).*?url="([^"]+)"/i);
  if (avatarMatch) {
    const candidateUrl = avatarMatch[1];
    // Filter out generic icons
    if (
      candidateUrl &&
      !candidateUrl.includes('icon') &&
      !candidateUrl.includes('default') &&
      !candidateUrl.includes('placeholder')
    ) {
      avatar = candidateUrl;
    }
  }

  return { name, avatar };
}

/**
 * Validate author name - filter out false positives
 */
function isValidAuthorName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 30) {
    return false;
  }
  // Skip if contains http (probably a URL)
  if (name.includes('http')) {
    return false;
  }
  // Skip common button/action text
  if (/^(?:分享|收藏|关注|点赞|评论|返回|首页|登录|注册)$/.test(name)) {
    return false;
  }
  return true;
}

/**
 * Extract engagement stats from Qunar content
 * Uses parseChineseNumber internally for all numeric parsing
 *
 * Handles patterns:
 * 1. Inline: "阅读 5.7万", "5.7万阅读", "浏览量：1234"
 * 2. Accessibility tree: StaticText "浏览量" followed by StaticText "5.7万"
 * 3. Likes: "点赞 123", "123 赞", "有用 45"
 * 4. Comments: "评论 30", "30条评论"
 * 5. Saves/Favorites: "收藏 85", "85人收藏"
 */
export function extractQunarStats(content: string): {
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
} {
  const stats: {
    views?: number;
    likes?: number;
    saves?: number;
    comments?: number;
  } = {};

  // === Views ===
  // Pattern 1: Inline - 阅读5.7万, 浏览量1234, 5.7万阅读
  const viewsMatch =
    content.match(/(?:阅读|浏览量?)[：:\s]*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*(?:阅读|次浏览)/i);
  if (viewsMatch) {
    const num = parseChineseNumber(viewsMatch[1]);
    if (num > 0) stats.views = num;
  }

  // Pattern 2: Accessibility tree - "浏览量" followed by number on next StaticText
  if (!stats.views) {
    const accessibilityViewsMatch = content.match(
      /StaticText\s+"(?:阅读|浏览量?)"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilityViewsMatch) {
      const num = parseChineseNumber(accessibilityViewsMatch[1]);
      if (num > 0) stats.views = num;
    }
  }

  // === Likes ===
  // Pattern 1: Inline - 点赞123, 有用45, 123赞
  const likesMatch =
    content.match(/(?:点赞|有用|赞)[：:\s]*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*(?:点赞|个赞|赞)/i);
  if (likesMatch) {
    const num = parseChineseNumber(likesMatch[1]);
    if (num > 0) stats.likes = num;
  }

  // Pattern 2: Accessibility tree
  if (!stats.likes) {
    const accessibilityLikesMatch = content.match(
      /StaticText\s+"(?:点赞|有用|赞)"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilityLikesMatch) {
      const num = parseChineseNumber(accessibilityLikesMatch[1]);
      if (num > 0) stats.likes = num;
    }
  }

  // === Saves ===
  // Pattern 1: Inline - 收藏85, 85人收藏
  const savesMatch =
    content.match(/收藏[：:\s]*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*(?:人收藏|收藏)/i);
  if (savesMatch) {
    const num = parseChineseNumber(savesMatch[1]);
    if (num > 0) stats.saves = num;
  }

  // Pattern 2: Accessibility tree
  if (!stats.saves) {
    const accessibilitySavesMatch = content.match(
      /StaticText\s+"收藏"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilitySavesMatch) {
      const num = parseChineseNumber(accessibilitySavesMatch[1]);
      if (num > 0) stats.saves = num;
    }
  }

  // === Comments ===
  // Pattern 1: Inline - 评论30, 30条评论
  const commentsMatch =
    content.match(/评论[：:\s]*([\d.]+[千万kw]?)/i) ||
    content.match(/([\d.]+[千万kw]?)\s*(?:条评论|评论)/i);
  if (commentsMatch) {
    const num = parseChineseNumber(commentsMatch[1]);
    if (num > 0) stats.comments = num;
  }

  // Pattern 2: Accessibility tree
  if (!stats.comments) {
    const accessibilityCommentsMatch = content.match(
      /StaticText\s+"(?:评论|条评论)"[\s\S]{0,100}?StaticText\s+"([\d.]+[千万kw]?)"/i
    );
    if (accessibilityCommentsMatch) {
      const num = parseChineseNumber(accessibilityCommentsMatch[1]);
      if (num > 0) stats.comments = num;
    }
  }

  return stats;
}

/**
 * Transform Qunar CDN URLs to high-resolution versions
 *
 * Qunar uses different CDN patterns:
 * - qnimg.qunar.com - Qunar's image CDN
 * - p0.meituan.net, p1.meituan.net - Sometimes uses Meituan CDN
 * - dimg.qunarzz.com - Another Qunar CDN domain
 *
 * Transformation rules:
 * 1. Remove size constraints like _r_ or _w_ parameters
 * 2. Remove thumbnail suffixes: _small, _thumb, _s
 * 3. Remove or modify w=, h=, q= query params limiting size
 *
 * If URL doesn't match Qunar CDN patterns, returns unchanged.
 */
export function transformToHighResQunar(url: string): string {
  // Check if URL is from Qunar CDN domains
  const isQunarCdn =
    url.includes('qunar.com') ||
    url.includes('qunarzz.com') ||
    url.includes('p0.meituan.net') ||
    url.includes('p1.meituan.net');

  if (!isQunarCdn) {
    return url;
  }

  let transformedUrl = url;

  // Remove size constraint patterns like _r_200_200 or _w_640
  transformedUrl = transformedUrl.replace(/_[rw]_\d+(?:_\d+)?/gi, '');

  // Remove thumbnail suffixes: _small, _thumb, _s (before file extension)
  transformedUrl = transformedUrl.replace(
    /(_small|_thumb|_s)(\.(?:jpg|jpeg|png|webp|gif))/gi,
    '$2'
  );

  // Handle query parameters
  try {
    const urlObj = new URL(transformedUrl);

    // Remove or maximize size-limiting query params
    if (urlObj.searchParams.has('w')) {
      urlObj.searchParams.delete('w');
    }
    if (urlObj.searchParams.has('h')) {
      urlObj.searchParams.delete('h');
    }
    // Set quality to max if present
    if (urlObj.searchParams.has('q')) {
      urlObj.searchParams.set('q', '100');
    }

    transformedUrl = urlObj.toString();
  } catch {
    // If URL parsing fails, return what we have so far
  }

  return transformedUrl;
}

/**
 * Extract author information with Qunar-specific patterns
 *
 * Pattern priority:
 * 1. Qunar-specific patterns (profile links on travel.qunar.com)
 * 2. Generic labeled patterns ("作者：", "by")
 * 3. Fallback to extractAuthor()
 *
 * Also attempts to extract avatar URL near author name.
 *
 * Returns: { name?: string; avatar?: string }
 */
export function extractQunarAuthor(content: string): {
  name?: string;
  avatar?: string;
} {
  let name: string | undefined;
  let avatar: string | undefined;

  // Pattern 1: Qunar profile section - look for author near 个人主页
  const profileMatch = content.match(
    /StaticText\s+"([\u4E00-\u9FFF\w]{2,20})"\s*[\s\S]{0,50}?(?:个人主页|travel\.qunar\.com\/user)/i
  );
  if (profileMatch) {
    const candidate = profileMatch[1].trim();
    if (isValidQunarAuthorName(candidate)) {
      name = candidate;
    }
  }

  // Pattern 2: Look for author before qunar profile link
  if (!name) {
    const profileLinkMatch = content.match(
      /StaticText\s+"([\u4E00-\u9FFF\w]{2,20})"[\s\S]{0,100}?link[^"]*"[^"]*"[\s\S]{0,50}?travel\.qunar\.com/i
    );
    if (profileLinkMatch) {
      const candidate = profileLinkMatch[1].trim();
      if (isValidQunarAuthorName(candidate)) {
        name = candidate;
      }
    }
  }

  // Pattern 3: Generic labeled patterns - 作者：name or by name
  if (!name) {
    const labeledMatch =
      content.match(/作者[：:]\s*"?([\u4E00-\u9FFF\w]{2,20})"?/) ||
      content.match(/by\s+"?([\u4E00-\u9FFF\w]{2,20})"?/i);
    if (labeledMatch) {
      const candidate = labeledMatch[1].trim();
      if (isValidQunarAuthorName(candidate)) {
        name = candidate;
      }
    }
  }

  // Pattern 4: Fallback to generic extractAuthor
  if (!name) {
    name = extractAuthor(content);
  }

  // Extract avatar (best effort)
  // Look for avatar/头像 URLs near author or profile context
  const avatarPatterns = [
    // Avatar near author name
    /(?:avatar|头像|author|用户)[^"]*?(https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp))/i,
    // Image near profile link
    /img[^>]*(?:avatar|author|user)[^"]*url="([^"]+)"/i,
    // Qunar CDN user images
    /(https?:\/\/[^\s"']*qunar[^\s"']*(?:avatar|user|head)[^\s"']*\.(?:jpg|jpeg|png|webp))/i,
  ];

  for (const pattern of avatarPatterns) {
    const avatarMatch = content.match(pattern);
    if (avatarMatch) {
      const candidateUrl = avatarMatch[1];
      // Filter out generic icons and placeholders
      if (
        candidateUrl &&
        !candidateUrl.includes('icon') &&
        !candidateUrl.includes('default') &&
        !candidateUrl.includes('placeholder') &&
        !candidateUrl.includes('emoji')
      ) {
        avatar = candidateUrl;
        break;
      }
    }
  }

  return { name, avatar };
}

/**
 * Validate Qunar author name - filter out false positives
 */
function isValidQunarAuthorName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 30) {
    return false;
  }
  // Skip if contains http (probably a URL)
  if (name.includes('http')) {
    return false;
  }
  // Skip common button/action text (more comprehensive for Qunar)
  if (
    /^(?:分享|收藏|关注|点赞|评论|返回|首页|登录|注册|查看|更多|去哪儿|旅行)$/.test(
      name
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Extract engagement stats from Mafengwo content
 * Uses parseChineseNumber internally for all numeric parsing
 *
 * Handles patterns:
 * 1. Inline: "浏览量 2.7千", "2.7千次浏览", "阅读量：1234"
 * 2. Accessibility tree: StaticText "浏览量" followed by StaticText "2.7千"
 * 3. Likes: "点赞 123", "顶 45", "123 赞"
 * 4. Comments: "评论 30", "30条评论"
 * 5. Saves/Favorites: "收藏 85", "85人收藏"
 */
export function extractMafengwoStats(content: string): {
  views?: number;
  likes?: number;
  saves?: number;
  comments?: number;
} {
  const stats: {
    views?: number;
    likes?: number;
    saves?: number;
    comments?: number;
  } = {};

  // === Views ===
  // Pattern 1: Inline - 浏览量2.7千, 阅读量1234, 2.7千次浏览
  const viewsMatch =
    content.match(/(?:浏览量?|阅读量?)[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*(?:次浏览|阅读)/i);
  if (viewsMatch) {
    const num = parseChineseNumber(viewsMatch[1]);
    if (num > 0) stats.views = num;
  }

  // Pattern 2: Accessibility tree - "浏览量" followed by number on next StaticText
  if (!stats.views) {
    const accessibilityViewsMatch = content.match(
      /StaticText\s+"(?:浏览量?|阅读量?)"[\s\S]{0,100}?StaticText\s+"([0-9.]+[千万kw]?)"/i
    );
    if (accessibilityViewsMatch) {
      const num = parseChineseNumber(accessibilityViewsMatch[1]);
      if (num > 0) stats.views = num;
    }
  }

  // === Likes ===
  // Pattern 1: Inline - 点赞123, 顶45, 123赞
  const likesMatch =
    content.match(/(?:点赞|顶)[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*(?:点赞|个赞|赞)/i);
  if (likesMatch) {
    const num = parseChineseNumber(likesMatch[1]);
    if (num > 0) stats.likes = num;
  }

  // Pattern 2: Accessibility tree
  if (!stats.likes) {
    const accessibilityLikesMatch = content.match(
      /StaticText\s+"(?:点赞|顶|赞)"[\s\S]{0,100}?StaticText\s+"([0-9.]+[千万kw]?)"/i
    );
    if (accessibilityLikesMatch) {
      const num = parseChineseNumber(accessibilityLikesMatch[1]);
      if (num > 0) stats.likes = num;
    }
  }

  // === Saves ===
  // Pattern 1: Inline - 收藏85, 85人收藏
  const savesMatch =
    content.match(/收藏[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*(?:人收藏|收藏)/i);
  if (savesMatch) {
    const num = parseChineseNumber(savesMatch[1]);
    if (num > 0) stats.saves = num;
  }

  // Pattern 2: Accessibility tree
  if (!stats.saves) {
    const accessibilitySavesMatch = content.match(
      /StaticText\s+"收藏"[\s\S]{0,100}?StaticText\s+"([0-9.]+[千万kw]?)"/i
    );
    if (accessibilitySavesMatch) {
      const num = parseChineseNumber(accessibilitySavesMatch[1]);
      if (num > 0) stats.saves = num;
    }
  }

  // === Comments ===
  // Pattern 1: Inline - 评论30, 30条评论
  const commentsMatch =
    content.match(/评论[：:\s]*([0-9.]+[千万kw]?)/i) ||
    content.match(/([0-9.]+[千万kw]?)\s*条评论/i);
  if (commentsMatch) {
    const num = parseChineseNumber(commentsMatch[1]);
    if (num > 0) stats.comments = num;
  }

  // Pattern 2: Accessibility tree
  if (!stats.comments) {
    const accessibilityCommentsMatch = content.match(
      /StaticText\s+"(?:评论|条评论)"[\s\S]{0,100}?StaticText\s+"([0-9.]+[千万kw]?)"/i
    );
    if (accessibilityCommentsMatch) {
      const num = parseChineseNumber(accessibilityCommentsMatch[1]);
      if (num > 0) stats.comments = num;
    }
  }

  return stats;
}

/**
 * Extract author information with Mafengwo-specific patterns
 *
 * Pattern priority:
 * 1. Mafengwo-specific patterns (profile links on u.mafengwo.cn)
 * 2. Generic labeled patterns ("作者：", "发布者", "by")
 * 3. Fallback to extractAuthor()
 *
 * Also attempts to extract avatar URL near author name.
 *
 * Returns: { name?: string; avatar?: string }
 */
export function extractMafengwoAuthor(content: string): {
  name?: string;
  avatar?: string;
} {
  let name: string | undefined;
  let avatar: string | undefined;

  // Pattern 1: Labeled author - 作者：name or 发布者：name
  const labeledMatch = content.match(
    /(?:作者|发布者|by)[：:\s]+"?([^"\n\]]{2,30})"?/i
  );
  if (labeledMatch) {
    const candidate = labeledMatch[1].trim();
    if (isValidMafengwoAuthorName(candidate)) {
      name = candidate;
    }
  }

  // Pattern 2: Name near Mafengwo profile link (u.mafengwo.cn/userId)
  if (!name) {
    const profileMatch = content.match(
      /StaticText\s+"([^"]{2,20})"\s*[\s\S]{0,100}?u\.mafengwo\.cn\/\d+/
    );
    if (profileMatch) {
      const candidate = profileMatch[1].trim();
      if (isValidMafengwoAuthorName(candidate)) {
        name = candidate;
      }
    }
  }

  // Pattern 3: Fallback to generic extractAuthor
  if (!name) {
    name = extractAuthor(content);
  }

  // Extract avatar (best effort)
  const avatarPatterns = [
    // Mafengwo CDN user images (avatar, head, user)
    /(https?:\/\/[^\s"']*mafengwo[^\s"']*(?:avatar|head|user)[^\s"']*\.(?:jpg|jpeg|png|webp))/i,
    // Avatar or 头像 followed by image URL
    /(?:avatar|头像|author)[^"]*?(https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp))/i,
  ];

  for (const pattern of avatarPatterns) {
    const avatarMatch = content.match(pattern);
    if (avatarMatch) {
      const candidateUrl = avatarMatch[1];
      // Filter out placeholders and icons
      if (
        candidateUrl &&
        !candidateUrl.includes('placeholder') &&
        !candidateUrl.includes('icon') &&
        !candidateUrl.includes('default')
      ) {
        avatar = candidateUrl;
        break;
      }
    }
  }

  return { name, avatar };
}

/**
 * Validate Mafengwo author name - filter out false positives
 */
function isValidMafengwoAuthorName(name: string): boolean {
  if (!name || name.length < 2 || name.length > 30) {
    return false;
  }
  // Skip if contains http (probably a URL)
  if (name.includes('http')) {
    return false;
  }
  // Skip common button/action text (more comprehensive for Mafengwo)
  if (
    /^(?:分享|收藏|关注|点赞|评论|返回|首页|登录|注册|马蜂窝|攻略)$/.test(name)
  ) {
    return false;
  }
  return true;
}

/**
 * Transform Mafengwo CDN URLs to high-resolution versions
 *
 * Mafengwo CDN domains:
 * - n1-q.mafengwo.net, p1-q.mafengwo.net, etc.
 * - *.mafengwo.cn
 *
 * Transformation rules:
 * 1. Remove thumbnail suffix (e.g., .180.w.jpg, .320.w.jpg)
 * 2. Remove size query parameters (w=, h=)
 * 3. Set quality to max if present (q=100)
 *
 * If URL doesn't match Mafengwo CDN patterns, returns unchanged.
 */
export function transformToHighResMfw(url: string): string {
  // Check if URL is from Mafengwo CDN domains
  const isMfwCdn = url.includes('mafengwo.net') || url.includes('mafengwo.cn');

  if (!isMfwCdn) {
    return url;
  }

  let transformedUrl = url;

  // Remove thumbnail suffix (e.g., .180.w.jpg, .320.h.jpg)
  transformedUrl = transformedUrl.replace(
    /\.\d+\.[wh]\.(?:jpg|jpeg|png|webp)$/i,
    '.jpg'
  );

  // Handle query parameters
  try {
    const urlObj = new URL(transformedUrl);

    // Remove size-limiting query params
    if (urlObj.searchParams.has('w')) {
      urlObj.searchParams.delete('w');
    }
    if (urlObj.searchParams.has('h')) {
      urlObj.searchParams.delete('h');
    }
    // Set quality to max if present
    if (urlObj.searchParams.has('q')) {
      urlObj.searchParams.set('q', '100');
    }

    transformedUrl = urlObj.toString();
  } catch {
    // If URL parsing fails, return what we have so far
  }

  return transformedUrl;
}

/**
 * Full content extraction - returns all parsed data
 */
export function parseAccessibilityTree(content: string): ExtractedContent {
  return {
    pageTitle: extractPageTitle(content),
    headings: extractHeadings(content),
    textContent: extractStaticText(content),
    links: extractLinks(content),
    images: [], // Accessibility tree doesn't usually contain full image data
    author: extractAuthor(content),
    stats: extractStats(content),
  };
}
