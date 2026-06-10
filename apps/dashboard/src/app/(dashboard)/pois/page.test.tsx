import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import POIsPage from './page';

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

/** A row exactly as the Hono /api/pois route returns it (snake_cased pois table). */
const fullPoi = {
  id: 1,
  external_id: 'bund-001',
  name: '外滩',
  name_en: 'The Bund',
  category: 'attraction',
  city_id: 1,
  address: '中山东一路',
  latitude: 31.24,
  longitude: 121.49,
  rating: 4.7,
  rating_count: 28500,
  price_level: null,
  business_hours: { monday: { open: '09:00', close: '22:00' } },
  phone: '021-12345678',
  image_urls: null,
  source: 'mafengwo',
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-02T00:00:00.000Z',
};

/** A sparse row — nullable fields absent must simply not render. */
const sparsePoi = {
  ...fullPoi,
  id: 2,
  external_id: null,
  name: '人民广场',
  name_en: null,
  address: null,
  rating: null,
  rating_count: 0,
  business_hours: null,
  phone: null,
  source: 'ctrip',
};

describe('pOIsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders real backend rows without crashing and without fake values', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: {
        data: [fullPoi, sparsePoi],
        pagination: { total: 2, limit: 12, offset: 0 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    // Act
    render(<POIsPage />);

    // Assert — both cards render from the real row shape.
    expect(screen.getByText('外滩')).toBeInTheDocument();
    expect(screen.getByText('人民广场')).toBeInTheDocument();
    // Real fields are shown: rating, phone, source platform string.
    expect(screen.getByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('021-12345678')).toBeInTheDocument();
    expect(screen.getByText('mafengwo')).toBeInTheDocument();
    expect(screen.getByText('ctrip')).toBeInTheDocument();
    // No NaN% quality badge — the backend has no quality_score field.
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('hides nullable fields instead of rendering placeholders', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: {
        data: [sparsePoi],
        pagination: { total: 1, limit: 12, offset: 0 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    // Act
    render(<POIsPage />);

    // Assert — null rating / phone / business hours leave no trace.
    expect(screen.queryByText('条评价)', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText('营业时间')).not.toBeInTheDocument();
  });

  it('shows the empty state when the backend returns no rows', () => {
    // Arrange
    mockUseQuery.mockReturnValue({
      data: { data: [], pagination: { total: 0, limit: 12, offset: 0 } },
      isLoading: false,
      refetch: vi.fn(),
    });

    // Act
    render(<POIsPage />);

    // Assert
    expect(screen.getByText('未找到兴趣点')).toBeInTheDocument();
  });
});
