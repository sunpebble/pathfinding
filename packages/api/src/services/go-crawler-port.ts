import { z } from 'zod';

/** D4: counts arrive as number|null from current Go, string from legacy responses. */
const countField = z.union([z.number(), z.string()]).nullable().optional();

/** POST /api/crawler/mafengwo/detail success payload (WS-B1 contract). */
export const RawCrawlDetailSchema = z.object({
  url: z.string(),
  externalId: z.string(),
  title: z.string(),
  content: z.string(),
  contentHtml: z.string().optional(),
  contentMarkdown: z.string().optional(),
  contentTruncated: z.boolean().optional(),
  author: z.string(),
  views: countField,
  likes: countField,
  viewsRaw: z.string().optional(),
  likesRaw: z.string().optional(),
  coverImage: z.string(),
  images: z.array(z.string()),
  publishedAt: z.string().optional(),
  qualityScore: z.number().optional(),
  saved: z.boolean().optional(),
  saveError: z.string().optional(),
});

export type RawCrawlDetail = z.infer<typeof RawCrawlDetailSchema>;

export const RawCrawlDetailResponseSchema = z.object({
  success: z.boolean(),
  data: RawCrawlDetailSchema.optional(),
  error: z.string().optional(),
});

export type RawCrawlDetailResponse = z.infer<typeof RawCrawlDetailResponseSchema>;

export type DecodeResult
  = | { ok: true; data: RawCrawlDetail }
    | { ok: false; error: string };

/** Anti-corruption decode: turns an untrusted Go response into a validated RawCrawlDetail. */
export function decodeDetailResponse(json: unknown): DecodeResult {
  const envelope = RawCrawlDetailResponseSchema.safeParse(json);
  if (!envelope.success) {
    return { ok: false, error: `Go /detail 响应结构非法：${envelope.error.message}` };
  }
  if (!envelope.data.success || !envelope.data.data) {
    return { ok: false, error: envelope.data.error || '解析游记详情失败' };
  }
  return { ok: true, data: envelope.data.data };
}

export interface GoCrawlerPort {
  fetchDetail: (url: string) => Promise<DecodeResult>;
}

export interface GoCrawlerPortConfig {
  goServerUrl: string;
  fetchImpl: typeof fetch;
}

export class HttpGoCrawlerPort implements GoCrawlerPort {
  constructor(private readonly cfg: GoCrawlerPortConfig) {}

  async fetchDetail(url: string): Promise<DecodeResult> {
    const response = await this.cfg.fetchImpl(
      `${this.cfg.goServerUrl}/api/crawler/mafengwo/detail`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) },
    );
    if (!response.ok) {
      return { ok: false, error: `获取游记详情失败：${response.status}` };
    }
    return decodeDetailResponse(await response.json());
  }
}

export function createGoCrawlerPort(overrides: Partial<GoCrawlerPortConfig> = {}): GoCrawlerPort {
  return new HttpGoCrawlerPort({
    goServerUrl: overrides.goServerUrl ?? process.env.GO_SERVER_URL ?? 'http://localhost:3001',
    fetchImpl: overrides.fetchImpl ?? globalThis.fetch,
  });
}
