import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InviteDialog } from './invite-dialog';

const mockInviteCollaborator = vi.fn();
const invalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');

  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries,
    }),
  };
});

vi.mock('@/lib/api/collaborators', () => ({
  inviteCollaborator: (...args: unknown[]) => mockInviteCollaborator(...args),
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
  return (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe('inviteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    invalidateQueries.mockResolvedValue(undefined);
  });

  it('invites a collaborator through the REST API and invalidates collaborators', async () => {
    const onClose = vi.fn();
    mockInviteCollaborator.mockResolvedValue({
      data: {
        id: '18',
        itinerary_id: 42,
        user_id: 7,
        role: 'viewer',
      },
    });

    render(
      <InviteDialog
        isOpen={true}
        onClose={onClose}
        itineraryId="42"
        currentUserId="1"
      />,
      { wrapper: Wrapper },
    );

    fireEvent.change(screen.getByLabelText(/user id or email/i), {
      target: { value: 'guest@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'viewer' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));
      await Promise.resolve();
    });

    expect(mockInviteCollaborator).toHaveBeenCalledWith({
      itineraryId: 42,
      email: 'guest@example.com',
      role: 'viewer',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['itinerary-collaborators', '42'],
    });
    expect(screen.getByText('Successfully invited guest@example.com as viewer')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports the placeholder-style user id input path', async () => {
    mockInviteCollaborator.mockResolvedValue({
      data: {
        id: '19',
        itinerary_id: 42,
        user_id: 7,
        role: 'editor',
      },
    });

    render(
      <InviteDialog
        isOpen={true}
        onClose={vi.fn()}
        itineraryId="42"
        currentUserId="1"
      />,
      { wrapper: Wrapper },
    );

    fireEvent.change(screen.getByLabelText(/user id or email/i), {
      target: { value: 'user-7' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));
      await Promise.resolve();
    });

    expect(mockInviteCollaborator).toHaveBeenCalledWith({
      itineraryId: 42,
      userId: 7,
      role: 'editor',
    });
  });
});
