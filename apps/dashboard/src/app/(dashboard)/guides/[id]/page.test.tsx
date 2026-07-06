import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNotFound } from '@/test/setup';

import GuideDetailPage from './page';

describe('guideDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the legacy guide detail route closed', () => {
    expect(() => GuideDetailPage()).toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalledOnce();
  });
});
