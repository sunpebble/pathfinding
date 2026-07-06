import type { ImportContext } from './guide-normalize.js';

export const MAFENGWO_CRAWLER_DISABLED_MESSAGE = '马蜂窝攻略来源已禁用：来源解析尚未迁移到 Sunpebble TS/Flue 后端';

export interface ExecutorConfig {
  fetchImpl: typeof fetch;
}

interface GuideUrlItem {
  url: string;
  title?: string;
}

export interface PlatformDiscoveryResult {
  platform: string;
  city: string;
  totalFound: number;
  newGuides: GuideUrlItem[];
  existingCount: number;
  cityScoped: boolean;
}

export type ImportAction = 'inserted' | 'updated' | 'rejected' | 'failed';

export interface ImportGuideResult {
  success: boolean;
  guideId?: number;
  action: ImportAction;
  message: string;
  warnings: string[];
}

export async function discoverNewGuides(
  platform: string,
  city: string,
  _overrideConfig?: Partial<ExecutorConfig>,
): Promise<PlatformDiscoveryResult> {
  if (platform === 'mafengwo') {
    throw new Error(MAFENGWO_CRAWLER_DISABLED_MESSAGE);
  }

  throw new Error(`不支持的平台：${platform}（city=${city}）`);
}

export async function importGuide(
  platform: string,
  _url: string,
  _overrideConfig?: Partial<ExecutorConfig>,
  _context?: ImportContext,
): Promise<ImportGuideResult> {
  if (platform === 'mafengwo') {
    return {
      success: false,
      action: 'failed',
      message: MAFENGWO_CRAWLER_DISABLED_MESSAGE,
      warnings: [],
    };
  }

  return {
    success: false,
    action: 'failed',
    message: `不支持的平台：${platform}`,
    warnings: [],
  };
}

export interface BatchImportResult {
  imported: number;
  updated: number;
  rejected: number;
  failed: number;
  skipped: number;
  results: Array<{
    url: string;
    success: boolean;
    action: ImportAction;
    message: string;
    guideId?: number;
  }>;
}

export async function batchImportGuides(
  platform: string,
  urls: string[],
  overrideConfig?: Partial<ExecutorConfig>,
  context?: ImportContext,
): Promise<BatchImportResult> {
  const results: BatchImportResult['results'] = [];
  let imported = 0;
  let updated = 0;
  let rejected = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const result = await importGuide(platform, url, overrideConfig, context);
      results.push({
        url,
        success: result.success,
        action: result.action,
        message: result.message,
        guideId: result.guideId,
      });

      switch (result.action) {
        case 'inserted':
          imported++;
          break;
        case 'updated':
          updated++;
          break;
        case 'rejected':
          rejected++;
          break;
        case 'failed':
          failed++;
          break;
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ url, success: false, action: 'failed', message });
      failed++;
    }
  }

  return { imported, updated, rejected, failed, skipped: 0, results };
}
