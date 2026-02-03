import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ItineraryEditor } from './itinerary-editor';

// Mock Convex hooks
const mockUseQuery = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockReorder = vi.fn();

// We return a specific mock function based on the mutation being requested is hard with the current mock setup
// so we will just return a generic mock that we can spy on, or specific ones if we can identify them.
// But useMutation takes the api function.
// Let's make a map of mocks.
const mutationMocks: Record<string, unknown> = {
  'itineraryItems:create': mockCreate,
  'itineraryItems:update': mockUpdate,
  'itineraryItems:remove': mockRemove,
  'itineraryItems:reorder': mockReorder,
};

vi.mock('convex/react', () => ({
  useQuery: (query: unknown, args: unknown) => mockUseQuery(query, args),
  useMutation: (mutation: string) => {
    return mutationMocks[mutation] || vi.fn();
  },
}));

// Mock API object
// The component uses api.itineraryItems.create etc.
// We need these to be unique strings/symbols so we can map them in useMutation mock.
vi.mock('@pathfinding/convex-client', () => ({
  api: {
    itineraries: { getById: 'itineraries:getById' },
    pois: { search: 'pois:search' },
    itineraryItems: {
      create: 'itineraryItems:create',
      update: 'itineraryItems:update',
      remove: 'itineraryItems:remove',
      reorder: 'itineraryItems:reorder',
    },
  },
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock generic UI components if needed, but they seem to be standard HTML or lucid-react icons which render fine.

describe('itineraryEditor', () => {
  // eslint-disable-next-line ts/no-explicit-any
  const defaultProps: any = {
    isOpen: true,
    onClose: vi.fn(),
    itineraryId: 'itinerary-1',
    userId: 'user-1',
    days: [
      {
        _id: 'day-1',
        dayNumber: 1,
        date: '2024-01-01',
        items: [
          {
            _id: 'item-1',
            poiId: 'poi-1',
            orderIndex: 0,
            poi: {
              id: 'poi-1',
              name: 'Test POI',
              category: 'attraction',
              latitude: 0,
              longitude: 0,
            },
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockImplementation((query) => {
      if (query === 'itineraries:getById') {
        return { days: defaultProps.days, cityId: 'city-1' };
      }
      return [];
    });

    mockUpdate.mockResolvedValue(undefined);
  });

  it('renders correctly', () => {
    render(<ItineraryEditor {...defaultProps} />);
    expect(screen.getByText('Edit Itinerary')).toBeDefined();
    // Use regex to handle potential whitespace differences
    expect(screen.getByText(/Day\s*1/)).toBeDefined();
    expect(screen.getByText('Test POI')).toBeDefined();
  });

  it('calls update mutation when item is edited', async () => {
    render(<ItineraryEditor {...defaultProps} />);

    // Expand item
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);

    // Change note
    const notesInput = screen.getByPlaceholderText('Add notes about this activity...');
    fireEvent.change(notesInput, { target: { value: 'New Note' } });

    // Save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      notes: 'New Note',
    }));
  });
});
