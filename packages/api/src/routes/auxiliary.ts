import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { Env } from '../env.js';
import { Hono } from 'hono';
import { z } from 'zod';

interface TransportPOI {
  name: string;
  latitude: number;
  longitude: number;
}

interface WeatherCacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
}

const app = new Hono<{ Bindings: Env }>();
const weatherCache = new Map<string, WeatherCacheEntry>();
const weatherCacheTTL = 30 * 60 * 1000;

const transportSchema = z.object({
  pois: z.array(z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  })),
  transportMode: z.enum(['walking', 'driving', 'transit']),
});

function ok(data: unknown) {
  return { success: true, data };
}

function fail(error: string) {
  return { success: false, error };
}

function jsonError(c: Context, status: ContentfulStatusCode, error: string) {
  return c.json(fail(error), status);
}

function notMigrated(c: Context, feature: string) {
  return jsonError(c, 501, `${feature} is not available in the TypeScript API`);
}

function speedKmH(mode: string) {
  if (mode === 'walking')
    return 5;
  if (mode === 'driving')
    return 40;
  return 25;
}

function distanceKm(a: TransportPOI, b: TransportPOI) {
  const toRad = (n: number) => n * Math.PI / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function optimizeRoute(pois: TransportPOI[], mode: string) {
  if (pois.length <= 1) {
    return {
      optimizedOrder: pois.map((_, index) => index),
      segments: [],
      savings: { distanceKm: 0, durationMinutes: 0 },
    };
  }

  const order = [0];
  const visited = new Set(order);
  let current = 0;

  while (order.length < pois.length) {
    let best = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pois.length; i++) {
      if (visited.has(i))
        continue;
      const d = distanceKm(pois[current]!, pois[i]!);
      if (d < bestDistance) {
        best = i;
        bestDistance = d;
      }
    }
    visited.add(best);
    order.push(best);
    current = best;
  }

  const speed = speedKmH(mode);
  let optimizedTotal = 0;
  const segments = [];
  for (let i = 0; i < order.length - 1; i++) {
    const from = pois[order[i]!]!;
    const to = pois[order[i + 1]!]!;
    const d = distanceKm(from, to);
    optimizedTotal += d;
    segments.push({
      from: from.name,
      to: to.name,
      distanceKm: round2(d),
      durationMinutes: round2(d / speed * 60),
    });
  }

  let originalTotal = 0;
  for (let i = 0; i < pois.length - 1; i++) {
    originalTotal += distanceKm(pois[i]!, pois[i + 1]!);
  }
  const savedDistance = originalTotal - optimizedTotal;

  return {
    optimizedOrder: order,
    segments,
    savings: {
      distanceKm: round2(savedDistance),
      durationMinutes: round2(savedDistance / speed * 60),
    },
  };
}

function parseCoordinate(value: string | undefined) {
  return value === undefined || value.trim() === '' ? Number.NaN : Number(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

app.post('/transport/optimize', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  }
  catch {
    return jsonError(c, 400, 'Invalid JSON body');
  }

  const parsed = transportSchema.safeParse(body);
  if (!parsed.success) {
    const message = Array.isArray(body) || !isRecord(body) || !Array.isArray(body.pois) || body.pois.length === 0
      ? 'At least one POI required'
      : 'Invalid transportMode: expected "walking", "driving", or "transit"';
    return jsonError(c, 400, message);
  }

  if (parsed.data.pois.length === 0) {
    return jsonError(c, 400, 'At least one POI required');
  }

  return c.json(ok(optimizeRoute(parsed.data.pois, parsed.data.transportMode)));
});

app.all('/pdf/*', c => notMigrated(c, 'PDF export'));
app.all('/flights/*', c => notMigrated(c, 'Flight service'));
app.all('/flights', c => notMigrated(c, 'Flight service'));

app.get('/weather/forecast', async (c) => {
  const lat = parseCoordinate(c.req.query('lat'));
  const lon = parseCoordinate(c.req.query('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return jsonError(c, 400, 'Valid lat and lon required');
  }

  const apiKey = c.env.OPENWEATHERMAP_API_KEY?.trim();
  if (!apiKey) {
    return jsonError(c, 503, 'OpenWeatherMap API key not configured');
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < weatherCacheTTL) {
    return c.json(ok({ ...cached.data, cached: true }));
  }

  const url = new URL('https://api.openweathermap.org/data/3.0/onecall');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('appid', apiKey);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('lang', 'zh_cn');

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  }
  catch {
    return jsonError(c, 503, 'Weather service unavailable');
  }

  if (!response.ok) {
    return jsonError(c, 503, `OpenWeatherMap API error: ${response.status}`);
  }

  const payload = await response.json() as unknown;
  if (!isRecord(payload)) {
    return jsonError(c, 500, 'Failed to parse weather data');
  }

  weatherCache.set(cacheKey, { data: payload, timestamp: Date.now() });
  return c.json(ok({ ...payload, cached: false }));
});

export default app;
