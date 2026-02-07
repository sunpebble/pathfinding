import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ItineraryEditor } from './itinerary-editor';

// Mock convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@pathfinding/convex-client', () => ({
  api: {
    itineraries: { getById: 'getById' },
    itineraryItems: {
      create: 'create',
      update: 'update',
      remove: 'remove',
      reorder: 'reorder',
    },
    pois: { search: 'search' },
  },
}));

describe('itinerary editor', () => {
  const mockDays = [
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
            name: 'Test POI',
            category: 'attraction',
            latitude: 0,
            longitude: 0,
          },
        },
      ],
    },
  ];

  it('renders with accessible form fields when expanded', () => {
    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="test-itinerary"
        days={mockDays}
        userId="test-user"
      />,
    );

    // Find expand button and click it
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);

    // Check for labels association
    // This `getByLabelText` query specifically checks for valid label-input association (via for/id or nesting)
    const startTimeInput = screen.getByLabelText('Start Time');
    expect(startTimeInput).toBeDefined();
    expect(startTimeInput.getAttribute('id')).toBe('start-time-item-1');

    const endTimeInput = screen.getByLabelText('End Time');
    expect(endTimeInput).toBeDefined();
    expect(endTimeInput.getAttribute('id')).toBe('end-time-item-1');

    const transportInput = screen.getByLabelText('Transport Mode');
    expect(transportInput).toBeDefined();
    expect(transportInput.getAttribute('id')).toBe('transport-item-1');

    const notesInput = screen.getByLabelText('Notes');
    expect(notesInput).toBeDefined();
    expect(notesInput.getAttribute('id')).toBe('notes-item-1');
  });

  it('renders search input with aria-label', () => {
    render(
      <ItineraryEditor
        isOpen={true}
        onClose={() => {}}
        itineraryId="test-itinerary"
        days={mockDays}
        userId="test-user"
      />,
    );

    // Click "Add POI" to show search
    const addPoiButton = screen.getByText('Add POI');
    fireEvent.click(addPoiButton);

    const searchInput = screen.getByLabelText('Search points of interest');
    expect(searchInput).toBeDefined();

    const categorySelect = screen.getByLabelText('Filter by category');
    expect(categorySelect).toBeDefined();
  });
});
