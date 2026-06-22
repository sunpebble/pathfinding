import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PoiEditor } from './poi-editor';

const mockUpdateGuidePoiCoordinates = vi.fn();
const invalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock('@/lib/api/pois', () => ({
  updateGuidePoiCoordinates: (...args: unknown[]) => mockUpdateGuidePoiCoordinates(...args),
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>;
}

describe('poiEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    invalidateQueries.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ display_name: 'Tokyo address' }),
      }),
    );
  });

  it('updates guide poi coordinates through the REST path and invalidates the guide query', async () => {
    const onClose = vi.fn();
    mockUpdateGuidePoiCoordinates.mockResolvedValue({ success: true });

    render(
      <PoiEditor
        isOpen={true}
        onClose={onClose}
        guideId="99"
        dayNumber={2}
        poiIndex={1}
        poi={{
          name: 'Tokyo Tower',
          latitude: 35.6586,
          longitude: 139.7454,
          address: 'Minato City, Tokyo',
        }}
      />,
      { wrapper: Wrapper },
    );

    fireEvent.change(screen.getByLabelText('纬度'), {
      target: { value: '35.6600' },
    });
    fireEvent.change(screen.getByLabelText('经度'), {
      target: { value: '139.7500' },
    });

    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /保存坐标/ }));
      await Promise.resolve();
    });

    expect(mockUpdateGuidePoiCoordinates).toHaveBeenCalledWith('99', {
      dayNumber: 2,
      poiIndex: 1,
      latitude: 35.66,
      longitude: 139.75,
      verifiedBy: 'admin',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['guide', '99'] });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
