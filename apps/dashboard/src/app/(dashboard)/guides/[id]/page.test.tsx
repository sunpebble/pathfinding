import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockParams } from '@/test/setup';

import GuideDetailPage from './page';

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

describe('guideDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.mockReturnValue({ id: 'guide-1' });
  });

  it('renders snake_case AI days when POIs are omitted', () => {
    mockUseQuery.mockReturnValue({
      data: {
        data: {
          id: 'guide-1',
          _id: 'guide-1',
          title: 'Tokyo Guide',
          content: 'A useful guide.',
          source_platform: 'mafengwo',
          source_external_id: 'external-1',
          image_urls: [],
          quality_score: 0.8,
          views_count: 0,
          likes_count: 0,
          saves_count: 0,
          comments_count: 0,
          destinations: [],
          tags: [],
          ai_days: [{ day_number: 1 }],
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<GuideDetailPage />);

    expect(screen.getByText('AI 提取的行程')).toBeInTheDocument();
    expect(
      screen.getAllByText((_content, node) =>
        node?.textContent?.replace(/\s+/g, ' ').trim() === '第 1 天',
      ).length,
    ).toBeGreaterThan(0);
  });
});
