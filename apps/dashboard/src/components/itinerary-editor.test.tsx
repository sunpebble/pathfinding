import { cleanup, render, screen } from '@testing-library/react';
import * as convexReact from 'convex/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ItineraryEditor } from './itinerary-editor';

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Mock API
vi.mock('@pathfinding/convex-client', () => ({
  api: {
    itineraries: {
      getById: 'itineraries:getById',
    },
    itineraryItems: {
      create: 'itineraryItems:create',
      update: 'itineraryItems:update',
      remove: 'itineraryItems:remove',
      reorder: 'itineraryItems:reorder',
    },
    pois: {
      search: 'pois:search',
    },
  },
}));

const mockItinerary = {
  _id: 'itinerary-123',
  cityId: 'city-123',
  days: [
    {
      _id: 'day-1',
      dayNumber: 1,
      date: '2023-01-01',
      items: [
        {
          _id: 'item-1',
          poiId: 'poi-1',
          orderIndex: 0,
          poi: {
            id: 'poi-1',
            name: 'Eiffel Tower',
            category: 'attraction',
            latitude: 48.8584,
            longitude: 2.2945,
          },
          startTime: '10:00',
        },
        {
          _id: 'item-2',
          poiId: 'poi-2',
          orderIndex: 1,
          poi: {
            id: 'poi-2',
            name: 'Louvre Museum',
            category: 'attraction',
            latitude: 48.8606,
            longitude: 2.3376,
          },
        },
      ],
    },
  ],
};

describe('itineraryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders correctly with itinerary data', () => {
    vi.mocked(convexReact.useQuery).mockImplementation((query: unknown) => {
      // Just return the mock itinerary for any query for simplicity in this test
      if (query === 'itineraries:getById')
        return mockItinerary;
      return [];
    });

    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="itinerary-123"
        days={[]}
        userId="user-123"
      />,
    );

    // Check if header is present
    expect(screen.getByText('Edit Itinerary')).toBeDefined();

    // Check if items are rendered
    expect(screen.getByText('Eiffel Tower')).toBeDefined();
    expect(screen.getByText('Louvre Museum')).toBeDefined();
  });

  it('renders "No days" when empty', () => {
    vi.mocked(convexReact.useQuery).mockImplementation((query: unknown) => {
      if (query === 'itineraries:getById')
        return { ...mockItinerary, days: [] };
      return [];
    });

    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="itinerary-123"
        days={[]}
        userId="user-123"
      />,
    );

    expect(screen.getByText('No days in this itinerary')).toBeDefined();
  });
});
