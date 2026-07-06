import { describe, expect, it, vi } from 'vitest';
import {
  batchImportGuides,
  discoverNewGuides,
  importGuide,
  MAFENGWO_CRAWLER_DISABLED_MESSAGE,
} from './guide-import.service.js';

describe('guide-import.service', () => {
  it('disables mafengwo discovery until the source is migrated to TS/Flue', async () => {
    const fetchImpl = vi.fn();

    await expect(
      discoverNewGuides('mafengwo', 'Beijing', { fetchImpl }),
    ).rejects.toThrow(MAFENGWO_CRAWLER_DISABLED_MESSAGE);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails mafengwo imports without touching the removed crawler', async () => {
    const fetchImpl = vi.fn();

    const result = await importGuide('mafengwo', 'https://example.com/1', { fetchImpl });

    expect(result).toEqual({
      success: false,
      action: 'failed',
      message: MAFENGWO_CRAWLER_DISABLED_MESSAGE,
      warnings: [],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('counts disabled mafengwo batch imports as failed', async () => {
    const result = await batchImportGuides('mafengwo', [
      'https://example.com/1',
      'https://example.com/2',
    ]);

    expect(result.imported).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.rejected).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.results.every(item => item.message === MAFENGWO_CRAWLER_DISABLED_MESSAGE)).toBe(true);
  });

  it('still rejects unsupported platforms explicitly', async () => {
    await expect(discoverNewGuides('unknown', 'Beijing')).rejects.toThrow('不支持的平台');

    const result = await importGuide('unknown', 'https://example.com/1');
    expect(result.success).toBe(false);
    expect(result.action).toBe('failed');
    expect(result.message).toContain('不支持的平台');
  });
});
