import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockAuthContext,
  createMockAuthUser,
  mockRouter,
} from '@/test/setup';

import ItinerariesPage from './page';

const mockUseAuth = vi.fn();
const mockUseQuery = vi.fn();
const mockGetItineraries = vi.fn();

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock('@/lib/api/itineraries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/itineraries')>();
  return {
    ...actual,
    getItineraries: (...args: unknown[]) => mockGetItineraries(...args),
  };
});

describe('itinerariesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRouter.prefetch.mockReset();
  });

  it('fetches itineraries through the API client', async () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({
        isAuthenticated: true,
        user: createMockAuthUser({ id: 'user-42' }),
      }),
    );

    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'itineraries') {
        return {
          data: {
            data: [
              {
                id: '101',
                title: 'Kyoto Highlights',
                city_name: 'Kyoto',
                start_date: '2026-04-12',
                end_date: '2026-04-14',
                visibility: 'private',
                created_at: '2026-03-06T10:00:00.000Z',
                days: [],
              },
            ],
            pagination: {
              total: 1,
              limit: 20,
              offset: 0,
            },
          },
          isLoading: false,
        };
      }

      return {
        data: undefined,
        isLoading: false,
      };
    });

    mockGetItineraries.mockResolvedValue({
      data: [],
      pagination: {
        total: 0,
        limit: 20,
        offset: 0,
      },
    });

    render(<ItinerariesPage />);

    const itineraryQuery = mockUseQuery.mock.calls.find(
      ([options]) => options.queryKey[0] === 'itineraries',
    )?.[0];

    expect(itineraryQuery).toBeDefined();

    await itineraryQuery.queryFn();

    expect(mockGetItineraries).toHaveBeenCalledWith({
      userId: 'user-42',
      limit: 20,
      offset: 0,
    });
    expect(screen.getByText('Kyoto Highlights')).toBeInTheDocument();
  });

  it('renders friends visibility from the API correctly', () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({
        isAuthenticated: true,
        user: createMockAuthUser({ id: 'user-42' }),
      }),
    );

    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'itineraries') {
        return {
          data: {
            data: [
              {
                id: '101',
                title: 'Seoul Weekend',
                city_name: 'Seoul',
                start_date: '2026-05-01',
                end_date: '2026-05-03',
                visibility: 'friends',
                created_at: '2026-03-06T10:00:00.000Z',
                days: [],
              },
            ],
            pagination: {
              total: 1,
              limit: 20,
              offset: 0,
            },
          },
          isLoading: false,
        };
      }

      return {
        data: undefined,
        isLoading: false,
      };
    });

    render(<ItinerariesPage />);

    expect(screen.getByText('好友')).toBeInTheDocument();
    expect(screen.queryByText('团队')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to sign in', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext());
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });

    render(<ItinerariesPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin');
    });
  });
});
