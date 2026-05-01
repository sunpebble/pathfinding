interface StructuredGuideContentInput {
  title?: string;
  content?: string;
  contentHtml?: string;
  contentMarkdown?: string;
  imageUrls?: string[];
}

interface StructuredGuideContent extends Record<string, unknown> {
  contentFormatVersion: number;
  contentHtml?: string;
  contentMarkdown?: string;
}

const CONTENT_FORMAT_VERSION = 1;

function compactString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function safeDecodeUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  }
  catch {
    return url;
  }
}

function isMafengwoChromeImage(decodedUrl: string): boolean {
  return /CoND2mSdRkpRszmFAAAOxGNzvzM\.png/i.test(decodedUrl);
}

function validImageUrls(imageUrls?: string[]): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  for (const rawUrl of imageUrls ?? []) {
    const url = rawUrl.trim();
    const decodedUrl = safeDecodeUrl(url);
    const key = url.split('?')[0] ?? url;

    if (
      /^https?:\/\//i.test(url)
      && !/avatar|icon|logo|emoji/i.test(decodedUrl)
      && !isMafengwoChromeImage(decodedUrl)
      && !/(?:^|[!/])(?:[1-9]\d|1[0-5]\d)x(?:[1-9]\d|1[0-5]\d)(?:\D|$)/i.test(decodedUrl)
      && !seen.has(key)
    ) {
      seen.add(key);
      images.push(url);
    }
  }

  return images;
}

function removeLeadingTitle(content: string, title?: string): string {
  const escapedTitle = title
    ?.trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (!escapedTitle)
    return content;

  return content.replace(new RegExp(`^${escapedTitle}\\s*`, 'u'), '');
}

function truncateBeforeBoilerplate(content: string): string {
  const stopPatterns = [
    /本游记著作权归@/u,
    /著作权归@/u,
    /©\s*\d{4}\s*mafengwo\.cn/iu,
    /APP内查看更多游记/u,
    /APP查看/u,
    /温馨提示\s*APP阅读体验更佳/u,
  ];

  let endIndex = content.length;
  for (const pattern of stopPatterns) {
    const match = pattern.exec(content);
    if (match?.index !== undefined && match.index < endIndex)
      endIndex = match.index;
  }

  return content.slice(0, endIndex);
}

function removeLeadingNoiseBeforeTitle(content: string, title?: string): string {
  const cleanTitle = title?.trim();
  if (!cleanTitle)
    return content;

  const titleIndex = content.indexOf(cleanTitle);
  if (titleIndex > 0 && titleIndex <= 600)
    return content.slice(titleIndex).trim();

  return content;
}

function removeLeadingMafengwoBadges(content: string): string {
  const badges = ['星级游记', '蜂首游记', '宝藏游记'];
  let badgeIndex = -1;
  let badgeLength = 0;

  for (const badge of badges) {
    const index = content.indexOf(badge);
    if (index >= 0 && index <= 600 && (badgeIndex < 0 || index < badgeIndex)) {
      badgeIndex = index;
      badgeLength = badge.length;
    }
  }

  if (badgeIndex >= 0)
    return content.slice(badgeIndex + badgeLength).trim();

  return content;
}

function removeMafengwoTripMeta(content: string): string {
  const followIndex = content.indexOf('关注 ');
  if (followIndex < 0 || followIndex > 360)
    return content;

  const metaLead = content.slice(followIndex, followIndex + 80);
  if (!/关注\s+(?:目的地|出行时间|DAY\d)/u.test(metaLead))
    return content;

  const markerCandidates = ['查看全部天行程', '查看全部行程'];
  let markerIndex = -1;
  let markerLength = 0;

  for (const marker of markerCandidates) {
    const index = content.indexOf(marker, followIndex);
    if (index >= 0 && (markerIndex < 0 || index < markerIndex)) {
      markerIndex = index;
      markerLength = marker.length;
    }
  }

  if (markerIndex >= 0 && markerIndex - followIndex <= 1200)
    return `${content.slice(0, followIndex)} ${content.slice(markerIndex + markerLength)}`;

  return content.slice(0, followIndex);
}

function removeHeadMetadata(content: string): string {
  const head = content.slice(0, 800)
    .replace(/\d{4}\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*/gu, ' ')
    .replace(/(?:^|\s)\S{1,40}\s+\d+国\d+城\s*/gu, ' ');

  return `${head}${content.slice(800)}`;
}

export function cleanGuidePlainText(content: string, title?: string): string {
  let cleaned = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  cleaned = truncateBeforeBoilerplate(cleaned);
  cleaned = removeLeadingNoiseBeforeTitle(cleaned, title);
  cleaned = removeLeadingMafengwoBadges(cleaned);
  cleaned = cleaned
    .replace(/^\d+张照片\s*/u, '')
    .replace(/^\d+篇游记\s*/u, '');
  cleaned = removeLeadingTitle(cleaned, title);

  cleaned = removeHeadMetadata(cleaned);
  cleaned = removeMafengwoTripMeta(cleaned);

  cleaned = cleaned
    .replace(/图片加载失败/gu, ' ')
    .replace(/(?:^|\s)\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*/gu, ' ')
    .replace(/\d{4}\.\d{1,2}\.\d{1,2}发布·[\d.万wWkK]+阅读\s*/gu, ' ')
    .replace(/目的地\s*-\s*出行时间·天数\s*-\s*人均费用\(人民币\)\s*-/gu, ' ')
    .replace(/出行人物\s*-/gu, ' ')
    .replace(/\bDAY\d+\s+NaN(?:\.NaN)?[^。！？\n]{0,120}/gu, ' ')
    .replace(/\bNaN(?:\.NaN)?\b/gu, ' ')
    .replace(/QQ\s*\d{5,12}/giu, ' ')
    .replace(/APP查看\s+[^。！？\n]{0,80}/gu, ' ')
    .replace(/(?:本游记)?著作权归@\S{0,40}/gu, ' ')
    .replace(/任何形式?转载[^。！？\n]{0,80}/gu, ' ')
    .replace(/任何转载请联系作者[^。！？\n]{0,40}/gu, ' ')
    .replace(/查看全部天?行程/gu, ' ')
    .replace(/举报/gu, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitContentIntoParagraphs(content: string): string[] {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

  if (!normalized)
    return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length > 1 || normalized.length <= 120)
    return paragraphs;

  const sentences = normalized.match(/[^。！？.!?]+[。！？.!?]?/g) ?? [normalized];
  const grouped: string[] = [];
  for (let index = 0; index < sentences.length; index += 3) {
    const paragraph = sentences
      .slice(index, index + 3)
      .join('')
      .trim();
    if (paragraph)
      grouped.push(paragraph);
  }

  return grouped.length > 0 ? grouped : paragraphs;
}

function escapeMarkdownTitle(title: string): string {
  return title.replace(/^[#>\-\s]+/, '').trim();
}

export function generateGuideMarkdownContent(input: StructuredGuideContentInput): string {
  const content = compactString(cleanGuidePlainText(input.content ?? '', input.title));
  if (!content)
    return '';

  const parts: string[] = [];
  const title = compactString(input.title);
  if (title)
    parts.push(`# ${escapeMarkdownTitle(title)}`);

  const paragraphs = splitContentIntoParagraphs(content);
  const images = validImageUrls(input.imageUrls);
  const imageInterval = images.length > 0
    ? Math.max(1, Math.floor(paragraphs.length / (images.length + 1)))
    : Number.POSITIVE_INFINITY;

  let imageIndex = 0;
  for (let index = 0; index < paragraphs.length; index++) {
    parts.push(paragraphs[index]!);

    if (imageIndex < images.length && (index + 1) % imageInterval === 0) {
      parts.push(`![游记图片 ${imageIndex + 1}](${images[imageIndex]})`);
      imageIndex++;
    }
  }

  while (imageIndex < images.length) {
    parts.push(`![游记图片 ${imageIndex + 1}](${images[imageIndex]})`);
    imageIndex++;
  }

  return parts.join('\n\n');
}

export function buildStructuredGuideContent(input: StructuredGuideContentInput): StructuredGuideContent {
  const contentHtml = compactString(input.contentHtml);
  const contentMarkdown
    = compactString(input.contentMarkdown)
      ?? compactString(generateGuideMarkdownContent(input));

  return {
    contentFormatVersion: CONTENT_FORMAT_VERSION,
    ...(contentHtml ? { contentHtml } : {}),
    ...(contentMarkdown ? { contentMarkdown } : {}),
  };
}
