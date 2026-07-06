export interface CrawlerFetchData {
  url: string;
  title: string;
  content: string;
  contentTruncated: boolean;
}

export interface CrawlerFetchResult {
  success: boolean;
  platform: string;
  data?: CrawlerFetchData;
  error?: string;
}

const sentenceEnd = new Set(['。', '！', '？', '；', '…', '.', '!', '?', ';']);

export function validFetchUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  }
  catch {
    return null;
  }
}

function fail(error: string): CrawlerFetchResult {
  return { success: false, platform: 'unknown', error };
}

function truncateAtSentenceBoundary(chars: string[]) {
  for (let i = chars.length - 1; i >= 0 && i + 1 >= chars.length / 2; i--) {
    if (sentenceEnd.has(chars[i]!))
      return chars.slice(0, i + 1);
  }
  return chars;
}

export function cleanCrawlerContent(html: string, maxLen = 10_000) {
  const cleaned = html
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const chars = Array.from(cleaned);
  if (chars.length <= maxLen) {
    return { content: cleaned, contentTruncated: false };
  }

  return {
    content: truncateAtSentenceBoundary(chars.slice(0, maxLen)).join('').trim(),
    contentTruncated: true,
  };
}

export function extractCrawlerTitle(html: string) {
  return /<title[^>]*>([^<]+)<\/title>/iu.exec(html)?.[1]?.trim() || 'Untitled';
}

export function detectCrawlerPlatform(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('mafengwo'))
    return 'mafengwo';
  if (lower.includes('xiaohongshu') || lower.includes('xhs'))
    return 'xiaohongshu';
  return 'unknown';
}

export async function fetchCrawlerContent(
  rawUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<CrawlerFetchResult> {
  const targetUrl = validFetchUrl(rawUrl);
  if (!targetUrl)
    return fail('Valid URL required');

  let response: Response;
  try {
    response = await fetchImpl(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TravelBot/1.0)' },
      signal: AbortSignal.timeout(30_000),
    });
  }
  catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  if (response.status !== 200) {
    return fail(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  let html: string;
  try {
    html = await response.text();
  }
  catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  const { content, contentTruncated } = cleanCrawlerContent(html);
  return {
    success: true,
    platform: detectCrawlerPlatform(targetUrl.toString()),
    data: {
      url: targetUrl.toString(),
      title: extractCrawlerTitle(html),
      content,
      contentTruncated,
    },
  };
}
