import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ItineraryEditor } from './itinerary-editor';

const mockGetItinerary = vi.fn();
const mockCreateItineraryItem = vi.fn();
const mockUpdateItineraryItem = vi.fn();
const mockReorderItineraryItems = vi.fn();
const mockRemoveItineraryItem = vi.fn();
const mockSearchPois = vi.fn();
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

vi.mock('@/lib/api/itineraries', () => ({
  getItinerary: (...args: unknown[]) => mockGetItinerary(...args),
  createItineraryItem: (...args: unknown[]) => mockCreateItineraryItem(...args),
  updateItineraryItem: (...args: unknown[]) => mockUpdateItineraryItem(...args),
  reorderItineraryItems: (...args: unknown[]) => mockReorderItineraryItems(...args),
  removeItineraryItem: (...args: unknown[]) => mockRemoveItineraryItem(...args),
  normalizeItineraryResponse: (response: { data: unknown }) => response,
}));

vi.mock('@/lib/api/pois', () => ({
  searchPois: (...args: unknown[]) => mockSearchPois(...args),
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

function createPoi(id: string, name: string, category = 'attraction') {
  return {
    id,
    name,
    category,
    address: `${name} address`,
    latitude: 35.0,
    longitude: 139.0,
    rating: 4.6,
  };
}

function createItem(id: string, orderIndex: number, poiName: string) {
  return {
    id,
    poiId: `${Number.parseInt(id.replace(/\D/g, ''), 10) + 100}`,
    orderIndex,
    startTime: orderIndex === 0 ? '09:00' : undefined,
    endTime: orderIndex === 0 ? '10:00' : undefined,
    transportMode: 'walking',
    notes: orderIndex === 0 ? 'Initial notes' : undefined,
    poi: createPoi(`${id}-poi`, poiName),
  };
}

function createItinerary(days: Array<{ id: string; dayNumber: number; date: string; items: ReturnType<typeof createItem>[] }>) {
  return {
    data: {
      id: '42',
      title: 'Tokyo Weekend',
      cityId: '7',
      cityName: 'Tokyo',
      startDate: '2026-04-01',
      endDate: '2026-04-02',
      visibility: 'private',
      createdAt: '2026-03-06T10:00:00.000Z',
      days,
      items: days.flatMap(day => day.items),
      daysCount: days.length,
    },
  };
}

describe('itineraryEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueries.mockResolvedValue(undefined);
  });

  it('adds a POI to a day and refreshes the editor state', async () => {
    mockGetItinerary
      .mockResolvedValueOnce(createItinerary([
        { id: 'day-1', dayNumber: 1, date: '2026-04-01', items: [] },
      ]))
      .mockResolvedValueOnce(createItinerary([
        { id: 'day-1', dayNumber: 1, date: '2026-04-01', items: [createItem('item-1', 0, 'Tokyo Tower')] },
      ]));
    mockSearchPois.mockResolvedValue({
      data: [createPoi('501', 'Tokyo Tower')],
      pagination: { total: 1, limit: 20, offset: 0 },
    });
    mockCreateItineraryItem.mockResolvedValue({ data: { id: 'item-1' } });

    render(
      <ItineraryEditor
        isOpen={true}
        onClose={vi.fn()}
        itineraryId="42"
        days={[]}
        userId="1"
      />,
      { wrapper: Wrapper },
    );

    expect(await screen.findByText('No activities planned for this day')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add poi/i }));

    const searchInput = await screen.findByPlaceholderText('Search POIs...');
    fireEvent.change(searchInput, { target: { value: 'tower' } });
    fireEvent.click(await screen.findByRole('button', { name: /Tokyo Tower/i }));

    await waitFor(() => {
      expect(mockCreateItineraryItem).toHaveBeenCalledWith('42', 'day-1', {
        poiId: '501',
        orderIndex: 0,
      });
    });
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['itinerary', '42'] });
    });
    expect(await screen.findByText('Tokyo Tower')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('No activities planned for this day')).not.toBeInTheDocument();
    });
  });

  it('updates item fields and reflects the refreshed values', async () => {
    mockGetItinerary
      .mockResolvedValueOnce(createItinerary([
        { id: 'day-1', dayNumber: 1, date: '2026-04-01', items: [createItem('item-1', 0, 'Tsukiji Market')] },
      ]))
      .mockResolvedValueOnce(createItinerary([
        {
          id: 'day-1',
          dayNumber: 1,
          date: '2026-04-01',
          items: [
            {
              ...createItem('item-1', 0, 'Tsukiji Market'),
              startTime: '10:30',
              endTime: '11:45',
              notes: 'Updated plan',
              transportMode: 'taxi',
            },
          ],
        },
      ]));
    mockUpdateItineraryItem.mockResolvedValue({ success: true });

    render(
      <ItineraryEditor
        isOpen={true}
        onClose={vi.fn()}
        itineraryId="42"
        days={[]}
        userId="1"
      />,
      { wrapper: Wrapper },
    );

    expect(await screen.findByText('Tsukiji Market')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /expand/i }));
    fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '10:30' } });
    fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '11:45' } });
    fireEvent.change(screen.getByLabelText('Transport Mode'), { target: { value: 'taxi' } });
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated plan' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdateItineraryItem).toHaveBeenCalledWith('42', 'day-1', 'item-1', {
        startTime: '10:30',
        endTime: '11:45',
        notes: 'Updated plan',
        transportMode: 'taxi',
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: /expand/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Start Time')).toHaveValue('10:30');
      expect(screen.getByLabelText('End Time')).toHaveValue('11:45');
      expect(screen.getByLabelText('Transport Mode')).toHaveValue('taxi');
      expect(screen.getByLabelText('Notes')).toHaveValue('Updated plan');
    });
  });

  it('reorders items after moving one down', async () => {
    mockGetItinerary
      .mockResolvedValueOnce(createItinerary([
        {
          id: 'day-1',
          dayNumber: 1,
          date: '2026-04-01',
          items: [createItem('item-1', 0, 'Meiji Shrine'), createItem('item-2', 1, 'Shibuya Crossing')],
        },
      ]))
      .mockResolvedValueOnce(createItinerary([
        {
          id: 'day-1',
          dayNumber: 1,
          date: '2026-04-01',
          items: [createItem('item-2', 0, 'Shibuya Crossing'), createItem('item-1', 1, 'Meiji Shrine')],
        },
      ]));
    mockReorderItineraryItems.mockResolvedValue({ success: true });

    const { container } = render(
      <ItineraryEditor
        isOpen={true}
        onClose={vi.fn()}
        itineraryId="42"
        days={[]}
        userId="1"
      />,
      { wrapper: Wrapper },
    );

    expect(await screen.findByText('Meiji Shrine')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /move down/i }));

    await waitFor(() => {
      expect(mockReorderItineraryItems).toHaveBeenCalledWith('42', 'day-1', ['item-2', 'item-1']);
    });

    await waitFor(() => {
      const headings = Array.from(container.querySelectorAll('h4')).map(node => node.textContent);
      expect(headings).toEqual(expect.arrayContaining(['Shibuya Crossing', 'Meiji Shrine']));
      expect(headings.indexOf('Shibuya Crossing')).toBeLessThan(headings.indexOf('Meiji Shrine'));
    });
  });

  it('removes an item and shows the empty day state', async () => {
    mockGetItinerary
      .mockResolvedValueOnce(createItinerary([
        { id: 'day-1', dayNumber: 1, date: '2026-04-01', items: [createItem('item-1', 0, 'Asakusa')] },
      ]))
      .mockResolvedValueOnce(createItinerary([
        { id: 'day-1', dayNumber: 1, date: '2026-04-01', items: [] },
      ]));
    mockRemoveItineraryItem.mockResolvedValue({ success: true });

    render(
      <ItineraryEditor
        isOpen={true}
        onClose={vi.fn()}
        itineraryId="42"
        days={[]}
        userId="1"
      />,
      { wrapper: Wrapper },
    );

    expect(await screen.findByText('Asakusa')).toBeInTheDocument();
    const itemCard = screen.getByText('Asakusa').closest('div[class*="rounded-lg"]') as HTMLElement | null;
    fireEvent.click(within(itemCard ?? document.body).getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(mockRemoveItineraryItem).toHaveBeenCalledWith('42', 'day-1', 'item-1');
    });
    expect(await screen.findByText('No activities planned for this day')).toBeInTheDocument();
  });
});
