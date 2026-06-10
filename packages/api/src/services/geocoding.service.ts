/**
 * Geocoding service (D14) — resolves POI names to coordinates through an
 * authoritative geocoding API instead of trusting LLM-hallucinated values.
 *
 * Three-stage pipeline: AI extracts POI name + city → provider geocodes →
 * range / city-consistency validation. Amap returns GCJ-02; results are
 * converted to WGS-84 before they leave this module (storage standard).
 *
 * Failure semantics: a missing API key yields `pending` (never a 0,0
 * placeholder), provider/validation errors yield `failed` with a reason.
 */
import { gcj02ToWgs84, isOutOfChina } from '@pathfinding/utils';

// ── Provider contract ──────────────────────────────────

export interface GeocodeQuery {
  /** POI name as extracted by the AI step. */
  name: string;
  /** Optional city used to scope the lookup and validate consistency. */
  city?: string;
}

export interface GeocodeSuccess {
  status: 'ok';
  /** WGS-84 latitude. */
  latitude: number;
  /** WGS-84 longitude. */
  longitude: number;
  /** Provider-derived confidence in [0, 1]. */
  confidence: number;
  /** Provider identifier (e.g. 'amap'). */
  source: string;
}

export interface GeocodePending {
  status: 'pending';
  reason: string;
}

export interface GeocodeFailed {
  status: 'failed';
  reason: string;
}

export type GeocodeResult = GeocodeSuccess | GeocodePending | GeocodeFailed;

export interface GeocodingProvider {
  readonly name: string;
  geocode: (query: GeocodeQuery) => Promise<GeocodeResult>;
}

// ── Amap provider ──────────────────────────────────────

const AMAP_GEOCODE_BASE_URL = 'https://restapi.amap.com';

/**
 * Confidence by Amap geocode `level` (match granularity). POI-level matches
 * are trustworthy; city/province-level centroids are not real POI positions.
 */
const AMAP_LEVEL_CONFIDENCE: Record<string, number> = {
  '门牌号': 0.95,
  '兴趣点': 0.9,
  '单元号': 0.9,
  '热点商圈': 0.75,
  '道路交叉路口': 0.7,
  '道路': 0.65,
  '公交站台、地铁站': 0.7,
  '村庄': 0.55,
  '乡镇': 0.5,
  '区县': 0.35,
  '市': 0.2,
  '省': 0.1,
};

const AMAP_UNKNOWN_LEVEL_CONFIDENCE = 0.5;

interface AmapGeocode {
  location?: unknown;
  level?: unknown;
  city?: unknown;
  district?: unknown;
  province?: unknown;
}

interface AmapGeocodeResponse {
  status?: unknown;
  info?: unknown;
  geocodes?: AmapGeocode[];
}

export interface AmapProviderConfig {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Strip common Chinese admin suffixes so 北京 matches 北京市. */
function normalizeCityName(name: string): string {
  return name.trim().replace(/(?:自治区|自治州|特别行政区|[市省区县])$/, '');
}

/**
 * City consistency check: only fails when both sides are present and neither
 * contains the other after suffix normalization.
 */
export function isCityConsistent(
  requestedCity: string | undefined,
  responseCities: Array<string | undefined>,
): boolean {
  const requested = requestedCity ? normalizeCityName(requestedCity) : '';
  if (!requested) {
    return true;
  }
  const candidates = responseCities
    .filter((value): value is string => Boolean(value))
    .map(normalizeCityName)
    .filter(value => value !== '');
  if (candidates.length === 0) {
    return true;
  }
  return candidates.some(
    candidate => candidate.includes(requested) || requested.includes(candidate),
  );
}

export class AmapProvider implements GeocodingProvider {
  readonly name = 'amap';
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(config: AmapProviderConfig = {}) {
    this.apiKey = asNonEmptyString(config.apiKey);
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
    this.baseUrl = config.baseUrl ?? AMAP_GEOCODE_BASE_URL;
  }

  async geocode(query: GeocodeQuery): Promise<GeocodeResult> {
    if (!this.apiKey) {
      return { status: 'pending', reason: 'AMAP_API_KEY 未配置，坐标解析待执行' };
    }

    const address = query.name.trim();
    if (!address) {
      return { status: 'failed', reason: 'POI 名称为空，无法地理编码' };
    }

    const params = new URLSearchParams({ key: this.apiKey, address });
    if (query.city?.trim()) {
      params.set('city', query.city.trim());
    }

    const response = await this.fetchImpl(
      `${this.baseUrl}/v3/geocode/geo?${params.toString()}`,
    );
    if (!response.ok) {
      return { status: 'failed', reason: `高德地理编码请求失败：HTTP ${response.status}` };
    }

    const payload = (await response.json()) as AmapGeocodeResponse;
    if (payload.status !== '1') {
      return {
        status: 'failed',
        reason: `高德地理编码返回错误：${asNonEmptyString(payload.info) ?? '未知错误'}`,
      };
    }

    const geocode = payload.geocodes?.[0];
    const location = asNonEmptyString(geocode?.location);
    if (!geocode || !location) {
      return { status: 'failed', reason: `高德无匹配结果：${address}` };
    }

    const [lngRaw, latRaw] = location.split(',');
    const gcjLng = Number.parseFloat(lngRaw ?? '');
    const gcjLat = Number.parseFloat(latRaw ?? '');
    if (!Number.isFinite(gcjLat) || !Number.isFinite(gcjLng)) {
      return { status: 'failed', reason: `高德返回坐标无法解析：${location}` };
    }

    // Amap serves mainland-China GCJ-02 coordinates; anything outside the
    // valid lat/lng range or the China bbox is not trustworthy.
    if (
      gcjLat < -90 || gcjLat > 90 || gcjLng < -180 || gcjLng > 180
      || isOutOfChina(gcjLat, gcjLng)
    ) {
      return {
        status: 'failed',
        reason: `高德返回坐标超出合理范围：${gcjLat},${gcjLng}`,
      };
    }

    const responseCities = [
      asNonEmptyString(geocode.city),
      asNonEmptyString(geocode.district),
      asNonEmptyString(geocode.province),
    ];
    if (!isCityConsistent(query.city, responseCities)) {
      return {
        status: 'failed',
        reason: `城市不一致：期望 ${query.city}，高德返回 ${responseCities.filter(Boolean).join('/')}`,
      };
    }

    const wgs = gcj02ToWgs84(gcjLat, gcjLng);
    const level = asNonEmptyString(geocode.level);
    const confidence
      = (level ? AMAP_LEVEL_CONFIDENCE[level] : undefined) ?? AMAP_UNKNOWN_LEVEL_CONFIDENCE;

    return {
      status: 'ok',
      latitude: wgs.lat,
      longitude: wgs.lng,
      confidence,
      source: this.name,
    };
  }
}

/** Default provider wired to process.env (AMAP_API_KEY). */
export function createGeocodingProvider(
  env: Record<string, string | undefined> = process.env,
): GeocodingProvider {
  return new AmapProvider({ apiKey: env.AMAP_API_KEY });
}

// ── AI-days geocoding (batch-ai-process integration) ───

/** Confidence below this counts as "needs review" in geocoding metrics. */
const LOW_CONFIDENCE_THRESHOLD = 0.7;

export interface GeocodeDaysStats {
  total: number;
  resolved: number;
  pending: number;
  failed: number;
}

/** Minimal structural constraint — any day-plan shape with an optional pois list. */
interface AiDayLike {
  pois?: unknown;
}

type AiPoiLike = Record<string, unknown>;

function applyGeocodeResult(poi: AiPoiLike, result: GeocodeResult): AiPoiLike {
  // Always drop incoming coordinates — the AI step must not supply them (D14).
  const { latitude: _lat, longitude: _lng, ...rest } = poi;

  switch (result.status) {
    case 'ok':
      return {
        ...rest,
        latitude: result.latitude,
        longitude: result.longitude,
        geocodeConfidence: result.confidence,
        geocodeSource: result.source,
      };
    case 'pending':
      return { ...rest, geocodeSource: 'pending' };
    case 'failed':
      return { ...rest, geocodeSource: 'failed', geocodeError: result.reason };
  }
}

/**
 * Geocode every named POI inside AI-extracted day plans. Returns new day
 * objects (input is not mutated) plus aggregate stats. POIs without a usable
 * name are marked failed — never silently skipped.
 */
export async function geocodeAiDays<T extends AiDayLike>(
  days: T[],
  city: string | undefined,
  provider: GeocodingProvider,
): Promise<{ days: T[]; stats: GeocodeDaysStats }> {
  const stats: GeocodeDaysStats = { total: 0, resolved: 0, pending: 0, failed: 0 };

  const result: T[] = [];
  for (const day of days) {
    if (!Array.isArray(day.pois)) {
      result.push(day);
      continue;
    }

    const pois: unknown[] = [];
    for (const poi of day.pois) {
      if (!poi || typeof poi !== 'object' || Array.isArray(poi)) {
        pois.push(poi);
        continue;
      }

      stats.total++;
      const record = poi as AiPoiLike;
      const name = asNonEmptyString(record.name);
      const geocodeResult: GeocodeResult = name
        ? await provider.geocode({ name, city })
        : { status: 'failed', reason: 'POI 缺少名称，无法地理编码' };

      stats[geocodeResult.status === 'ok' ? 'resolved' : geocodeResult.status]++;
      pois.push(applyGeocodeResult(record, geocodeResult));
    }

    result.push({ ...day, pois } as T);
  }

  return { days: result, stats };
}

export interface GeocodingMetrics {
  total_pois: number;
  average_confidence: number;
  low_confidence_count: number;
}

/**
 * Build the geocoding metrics consumed by the dashboard review UI
 * (TravelGuideResponseDto.geocoding_metrics). Returns null when there is
 * nothing to report.
 */
export function buildGeocodingMetrics<T extends AiDayLike>(days: T[]): GeocodingMetrics | null {
  let total = 0;
  let lowConfidence = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const day of days) {
    if (!Array.isArray(day.pois)) {
      continue;
    }
    for (const poi of day.pois) {
      if (!poi || typeof poi !== 'object' || Array.isArray(poi)) {
        continue;
      }
      total++;
      const confidence = (poi as AiPoiLike).geocodeConfidence;
      if (typeof confidence === 'number' && Number.isFinite(confidence)) {
        confidenceSum += confidence;
        confidenceCount++;
        if (confidence < LOW_CONFIDENCE_THRESHOLD) {
          lowConfidence++;
        }
      }
      else {
        // No resolved coordinates → needs review.
        lowConfidence++;
      }
    }
  }

  if (total === 0) {
    return null;
  }

  return {
    total_pois: total,
    average_confidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    low_confidence_count: lowConfidence,
  };
}
