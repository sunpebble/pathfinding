import { describe, expect, it } from 'vitest';
import {
  normalizeCollaboratorsResponse,
  normalizeItinerariesResponse,
  normalizeItineraryResponse,
} from './itineraries';

type NormalizeItinerariesInput = Parameters<typeof normalizeItinerariesResponse>[0];
type NormalizeItineraryInput = Parameters<typeof normalizeItineraryResponse>[0];
type NormalizeCollaboratorsInput = Parameters<typeof normalizeCollaboratorsResponse>[0];

describe('itinerary api normalization', () => {
  it('handles null or malformed itinerary list payloads without crashing', () => {
    expect(() => normalizeItinerariesResponse({
      data: null,
      pagination: { total: 0, limit: 20, offset: 0 },
    } as NormalizeItinerariesInput)).not.toThrow();

    expect(normalizeItinerariesResponse({
      data: null,
      pagination: { total: 0, limit: 20, offset: 0 },
    } as NormalizeItinerariesInput)).toEqual({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0 },
    });

    expect(normalizeItinerariesResponse({
      data: { id: 'broken' },
      pagination: { total: 1, limit: 20, offset: 0 },
    } as unknown as NormalizeItinerariesInput)).toEqual({
      data: [],
      pagination: { total: 1, limit: 20, offset: 0 },
    });
  });

  it('normalizes partial itinerary detail DTOs with missing days, null items, and missing poi', () => {
    const result = normalizeItineraryResponse({
      data: {
        id: '42',
        title: null,
        start_date: '2026-04-01',
        end_date: null,
        days: [
          {
            id: 'day-1',
            day_number: 1,
            date: '2026-04-01',
            items: null,
          },
          {
            id: 'day-2',
            day_number: 2,
            date: null,
            items: [
              {
                id: 'item-1',
                poi_id: null,
                order_index: null,
                poi: null,
              },
            ],
          },
        ],
      } as NormalizeItineraryInput['data'],
    });

    expect(result.data.title).toBe('Untitled itinerary');
    expect(result.data.endDate).toBe('2026-04-01');
    expect(result.data.days).toHaveLength(2);
    expect(result.data.days[0]?.items).toEqual([]);
    expect(result.data.days[1]?.items[0]).toMatchObject({
      id: 'item-1',
      poiId: '',
      orderIndex: 0,
      poi: null,
    });
    expect(result.data.items).toHaveLength(1);
  });

  it('handles null or malformed collaborator payloads without crashing', () => {
    expect(() => normalizeCollaboratorsResponse({ data: null } as NormalizeCollaboratorsInput)).not.toThrow();

    expect(normalizeCollaboratorsResponse({ data: null } as NormalizeCollaboratorsInput)).toEqual({
      data: [],
    });

    expect(normalizeCollaboratorsResponse({
      data: [
        null,
        {
          id: null,
          user_id: null,
          role: null,
          status: null,
          user: 'bad-payload',
        },
      ],
    } as NormalizeCollaboratorsInput)).toEqual({
      data: [
        {
          id: 'unknown-collaborator',
          userId: 'unknown-user',
          role: 'viewer',
          status: 'accepted',
          user: null,
        },
        {
          id: 'unknown-collaborator',
          userId: 'unknown-user',
          role: 'viewer',
          status: 'accepted',
          user: null,
        },
      ],
    });
  });
});
