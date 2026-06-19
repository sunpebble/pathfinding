import { describe, expect, it } from 'vitest';
import { aiDayNumber, aiDaysToDayItineraries, isRecord, resolveAiDays } from './ai-days';

describe('aiDayNumber', () => {
  it('reads day_number, dayNumber, then day', () => {
    expect(aiDayNumber({ day_number: 2 })).toBe(2);
    expect(aiDayNumber({ dayNumber: 3 })).toBe(3);
    expect(aiDayNumber({ day: 4 })).toBe(4);
  });

  it('returns null when no finite number present', () => {
    expect(aiDayNumber({ day: 'x' })).toBeNull();
    expect(aiDayNumber({})).toBeNull();
  });
});

describe('aiDaysToDayItineraries', () => {
  it('keeps days with a valid number and emits POIs that have name+lat+lng', () => {
    const result = aiDaysToDayItineraries([
      {
        day_number: 1,
        theme: '抵达',
        pois: [
          { name: '天安门', latitude: 39.9, longitude: 116.4, type: 'attraction' },
          { name: '无坐标', latitude: null, longitude: 116.4 },
        ],
      },
    ]);

    expect(result).toEqual([
      { day: 1, title: '抵达', pois: [{ name: '天安门', lat: 39.9, lng: 116.4, category: 'attraction' }] },
    ]);
  });

  it('prefers title over theme and keeps a day even when all POIs are filtered out', () => {
    const result = aiDaysToDayItineraries([{ dayNumber: 2, title: '第二天', theme: 'fallback', pois: [] }]);

    expect(result).toEqual([{ day: 2, title: '第二天', pois: [] }]);
  });

  it('skips entries without a valid day number and non-record entries', () => {
    const result = aiDaysToDayItineraries([{ pois: [] }, 'nope', null]);

    expect(result).toEqual([]);
  });
});

describe('resolveAiDays', () => {
  it('prefers aiDays, then ai_days, then the fallback', () => {
    expect(resolveAiDays({ aiDays: [{ day: 1, pois: [] }] }, null)).toEqual([{ day: 1, pois: [] }]);
    expect(resolveAiDays({ ai_days: [{ day: 2, pois: [] }] }, null)).toEqual([{ day: 2, pois: [] }]);
    expect(resolveAiDays({}, [{ day: 3, pois: [] }])).toEqual([{ day: 3, pois: [] }]);
    expect(resolveAiDays({}, null)).toBeNull();
  });
});

describe('isRecord', () => {
  it('accepts plain objects and rejects arrays/null', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
});
