import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockAuthContext,
  createMockAuthUser,
  mockPathname,
  mockRouter,
} from '@/test/setup';

import ItineraryDetailPage from './page';

const mockUseAuth = vi.fn();
const mockUseQuery = vi.fn();
const mockUseParams = vi.fn(() => ({ id: '42' }));
const mockCollaboratorPanel = vi.fn(({ collaborators }: { collaborators: unknown[] }) => (
  <div>
    Collaborators:
    {collaborators.length}
  </div>
));
const mockInviteDialog = vi.fn(({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Invite Dialog Open</div> : null));
const mockItineraryEditor = vi.fn(({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>Itinerary Editor Open</div> : null));

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock('next/navigation', () => ({
  usePathname: mockPathname,
  useRouter: () => mockRouter,
  useParams: () => mockUseParams(),
}));

vi.mock('@/components/collaborator-panel', () => ({
  CollaboratorPanel: (props: { collaborators: unknown[] }) => mockCollaboratorPanel(props),
}));

vi.mock('@/components/invite-dialog', () => ({
  InviteDialog: (props: { isOpen: boolean }) => mockInviteDialog(props),
}));

vi.mock('@/components/itinerary-editor', () => ({
  ItineraryEditor: (props: { isOpen: boolean }) => mockItineraryEditor(props),
}));

function mockAuthenticatedOwnerQueries() {
  mockUseAuth.mockReturnValue(
    createMockAuthContext({
      isAuthenticated: true,
      user: createMockAuthUser({ id: 'user-1' }),
    }),
  );

  mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
    if (queryKey[0] === 'itinerary') {
      return {
        data: {
          data: {
            id: '42',
            title: 'Tokyo Weekend',
            start_date: '2026-04-01',
            end_date: '2026-04-02',
            visibility: 'private',
            created_at: '2026-03-06T10:00:00.000Z',
            days: [
              {
                id: '7',
                day_number: 1,
                date: '2026-04-01',
                items: [
                  {
                    id: '9',
                    poi_id: '501',
                    order_index: 0,
                    start_time: '09:00',
                    end_time: '10:30',
                    notes: 'Arrive early',
                    transport_mode: 'walking',
                    poi: {
                      id: '501',
                      name: 'Tsukiji Market',
                      category: 'food',
                      address: '4 Chome-16-2 Tsukiji, Tokyo',
                      rating: 4.7,
                    },
                  },
                ],
              },
            ],
          },
        },
        isLoading: false,
      };
    }

    if (queryKey[0] === 'itinerary-collaborators') {
      return {
        data: {
          data: [
            {
              id: 'owner-42',
              user_id: 'user-1',
              role: 'owner',
              status: 'accepted',
            },
          ],
        },
        isLoading: false,
      };
    }

    return {
      data: undefined,
      isLoading: false,
    };
  });
}

describe('itineraryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/itineraries/42');
    mockRouter.push.mockReset();
    mockRouter.replace.mockReset();
    mockRouter.prefetch.mockReset();
  });

  it('renders days and items from API DTOs', () => {
    mockAuthenticatedOwnerQueries();

    render(<ItineraryDetailPage />);

    expect(screen.getByText(/Day\s*1/)).toBeInTheDocument();
    expect(screen.getByText('Tsukiji Market')).toBeInTheDocument();
    expect(screen.getByText('Arrive early')).toBeInTheDocument();
  });

  it('renders friends visibility from the API correctly', () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({
        isAuthenticated: true,
        user: createMockAuthUser({ id: 'user-1' }),
      }),
    );

    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'itinerary') {
        return {
          data: {
            data: {
              id: '42',
              title: 'Tokyo Weekend',
              start_date: '2026-04-01',
              end_date: '2026-04-02',
              visibility: 'friends',
              created_at: '2026-03-06T10:00:00.000Z',
              days: [],
            },
          },
          isLoading: false,
        };
      }

      if (queryKey[0] === 'itinerary-collaborators') {
        return {
          data: {
            data: [],
          },
          isLoading: false,
        };
      }

      return {
        data: undefined,
        isLoading: false,
      };
    });

    render(<ItineraryDetailPage />);

    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.queryByText('Team')).not.toBeInTheDocument();
  });

  it('reconnects collaborator management and itinerary editing for owners', () => {
    mockAuthenticatedOwnerQueries();

    render(<ItineraryDetailPage />);

    expect(screen.queryByText('Collaboration management and itinerary editing return in Task 6.')).not.toBeInTheDocument();
    expect(screen.queryByText('Editing and collaborator actions are temporarily unavailable during migration.')).not.toBeInTheDocument();
    expect(mockCollaboratorPanel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Invite Collaborator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Itinerary' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Invite Collaborator' }));
    expect(screen.getByText('Invite Dialog Open')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Itinerary' }));
    expect(screen.getByText('Itinerary Editor Open')).toBeInTheDocument();
  });

  it('keeps owner capabilities when collaborator loading fails but itinerary ownership is known', () => {
    mockUseAuth.mockReturnValue(
      createMockAuthContext({
        isAuthenticated: true,
        user: createMockAuthUser({ id: 'user-1' }),
      }),
    );

    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === 'itinerary') {
        return {
          data: {
            data: {
              id: '42',
              user_id: 'user-1',
              title: 'Tokyo Weekend',
              start_date: '2026-04-01',
              end_date: '2026-04-02',
              visibility: 'private',
              created_at: '2026-03-06T10:00:00.000Z',
              days: [],
            },
          },
          isLoading: false,
          error: null,
        };
      }

      if (queryKey[0] === 'itinerary-collaborators') {
        return {
          data: undefined,
          isLoading: false,
          error: new Error('collaborators unavailable'),
        };
      }

      return { data: undefined, isLoading: false, error: null };
    });

    render(<ItineraryDetailPage />);

    expect(screen.getByRole('button', { name: 'Invite Collaborator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Itinerary' })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to sign in', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext());
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<ItineraryDetailPage />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/auth/signin');
    });
  });
});
