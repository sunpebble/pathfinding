import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CollaboratorPanel } from './collaborator-panel';

const mockUpdateCollaborator = vi.fn();
const mockRemoveCollaborator = vi.fn();
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
  updateCollaborator: (...args: unknown[]) => mockUpdateCollaborator(...args),
  removeCollaborator: (...args: unknown[]) => mockRemoveCollaborator(...args),
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

const collaborators = [
  {
    _id: '10',
    userId: '2',
    role: 'viewer' as const,
    status: 'accepted' as const,
  },
  {
    _id: '11',
    userId: '3',
    role: 'editor' as const,
    status: 'accepted' as const,
  },
];

const apiShapeCollaborators = [
  {
    id: '10',
    userId: '2',
    role: 'viewer' as const,
    status: 'accepted' as const,
  },
  {
    id: '11',
    userId: '3',
    role: 'editor' as const,
    status: 'accepted' as const,
  },
];

describe('collaboratorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueries.mockResolvedValue(undefined);
  });

  it('changes a collaborator role and keeps the local UI in sync', async () => {
    mockUpdateCollaborator.mockResolvedValue({
      data: {
        id: '10',
        itinerary_id: 42,
        user_id: 2,
        role: 'editor',
      },
    });

    render(
      <CollaboratorPanel
        itineraryId="42"
        collaborators={collaborators}
        currentUserId="1"
        isOwner={true}
      />,
      { wrapper: Wrapper },
    );

    const roleSelectors = screen.getAllByRole('combobox');
    fireEvent.change(roleSelectors[0]!, { target: { value: 'editor' } });

    await waitFor(() => {
      expect(mockUpdateCollaborator).toHaveBeenCalledWith('10', { role: 'editor' });
    });
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['itinerary-collaborators', '42'],
      });
    });
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[0]).toHaveValue('editor');
    });
  });

  it('removes a collaborator and updates the rendered list', async () => {
    mockRemoveCollaborator.mockResolvedValue({ success: true });

    render(
      <CollaboratorPanel
        itineraryId="42"
        collaborators={collaborators}
        currentUserId="1"
        isOwner={true}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Collaborators (2)')).toBeInTheDocument();
    fireEvent.click(screen.getAllByTitle('Remove collaborator')[0]!);

    await waitFor(() => {
      expect(mockRemoveCollaborator).toHaveBeenCalledWith('10');
    });
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['itinerary-collaborators', '42'],
      });
    });
    await waitFor(() => {
      expect(screen.queryByText(/^2$/)).not.toBeInTheDocument();
    });
  });

  it('uses plain API id fields for mutations and local state updates', async () => {
    mockUpdateCollaborator.mockResolvedValue({
      data: {
        id: '10',
        itinerary_id: 42,
        user_id: 2,
        role: 'editor',
      },
    });
    mockRemoveCollaborator.mockResolvedValue({ success: true });

    render(
      <CollaboratorPanel
        itineraryId="42"
        collaborators={apiShapeCollaborators as never}
        currentUserId="1"
        isOwner={true}
      />,
      { wrapper: Wrapper },
    );

    fireEvent.change(screen.getAllByRole('combobox')[0]!, { target: { value: 'editor' } });

    await waitFor(() => {
      expect(mockUpdateCollaborator).toHaveBeenCalledWith('10', { role: 'editor' });
    });
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')[0]).toHaveValue('editor');
    });

    fireEvent.click(screen.getAllByTitle('Remove collaborator')[0]!);

    await waitFor(() => {
      expect(mockRemoveCollaborator).toHaveBeenCalledWith('10');
    });
    await waitFor(() => {
      expect(screen.getByText('Collaborators (1)')).toBeInTheDocument();
    });
  });
});
