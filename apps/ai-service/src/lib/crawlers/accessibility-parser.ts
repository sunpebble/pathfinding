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
