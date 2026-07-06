import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENWEATHERMAP_API_KEY;
});

describe('auxiliary routes', () => {
  it('optimizes transport order', async () => {
    const response = await createApp().request('/api/transport/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transportMode: 'driving',
        pois: [
          { name: 'A', latitude: 39.9163, longitude: 116.3972 },
          { name: 'B', latitude: 39.8822, longitude: 116.4066 },
          { name: 'C', latitude: 39.9999, longitude: 116.2755 },
        ],
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as {
      success: boolean;
      data: { optimizedOrder: number[]; segments: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data.optimizedOrder).toHaveLength(3);
    expect(body.data.segments).toHaveLength(2);
  });

  it('returns 503 when weather API key is missing', async () => {
    const response = await createApp().request('/api/weather/forecast?lat=39.9&lon=116.4');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'OpenWeatherMap API key not configured',
    });
  });

  it('fetches and caches weather data', async () => {
    process.env.OPENWEATHERMAP_API_KEY = 'test-key';
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ current: { temp: 24 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    vi.stubGlobal('fetch', vi.fn(fetchMock));

    const first = await createApp().request('/api/weather/forecast?lat=31.2&lon=121.5');
    const second = await createApp().request('/api/weather/forecast?lat=31.2&lon=121.5');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    await expect(second.json()).resolves.toMatchObject({
      success: true,
      data: { cached: true },
    });
  });

  it('returns 501 for non-migrated PDF and flight services', async () => {
    const pdf = await createApp().request('/api/pdf/guide/1', { method: 'POST' });
    const flights = await createApp().request('/api/flights');

    expect(pdf.status).toBe(501);
    expect(flights.status).toBe(501);
  });
});
