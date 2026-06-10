/**
 * Mock data for development when the backend is unavailable.
 *
 * Keyed by endpoint prefix so `fetchBackendApi` can resolve a fallback
 * response without hitting the network.
 */

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86_400_000).toISOString();
const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();

// ---------------------------------------------------------------------------
// Crawl Jobs
// ---------------------------------------------------------------------------

const crawlJobs = [
  {
    id: 'mock-job-1',
    name: 'Xiaohongshu Travel Guides',
    platform: 'xiaohongshu',
    job_type: 'full',
    status: 'completed',
    config: { categories: ['travel'], rate_limit: { requests_per_second: 2, max_concurrent: 3 } },
    statistics: { records_extracted: 1520, requests_failed: 3, requests_success: 1523, requests_total: 1526, bytes_downloaded: 45_600_000, duration_seconds: 3600, pages_crawled: 760 },
    started_at: twoDaysAgo,
    completed_at: yesterday,
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 'mock-job-2',
    name: 'Ctrip Hotel POIs',
    platform: 'ctrip',
    job_type: 'incremental',
    status: 'running',
    config: { categories: ['hotel', 'resort'], geographic_scope: { cities: ['Shanghai', 'Beijing'] } },
    statistics: { records_extracted: 340, requests_failed: 1, requests_success: 341, requests_total: 500, bytes_downloaded: 12_000_000, duration_seconds: 1200, pages_crawled: 170 },
    started_at: now,
    created_at: yesterday,
    updated_at: now,
  },
  {
    id: 'mock-job-3',
    name: 'Mafengwo Guides Sync',
    platform: 'mafengwo',
    job_type: 'full',
    status: 'pending',
    config: {},
    schedule_cron: '0 2 * * *',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'mock-job-4',
    name: 'Weibo Travel Posts',
    platform: 'weibo',
    job_type: 'full',
    status: 'failed',
    config: { categories: ['travel'] },
    statistics: { records_extracted: 50, requests_failed: 120, requests_success: 50, requests_total: 170, bytes_downloaded: 1_500_000, duration_seconds: 600, pages_crawled: 25 },
    started_at: twoDaysAgo,
    completed_at: twoDaysAgo,
    created_at: twoDaysAgo,
    updated_at: twoDaysAgo,
  },
  {
    id: 'mock-job-5',
    name: 'Douyin Short Videos',
    platform: 'douyin',
    job_type: 'incremental',
    status: 'completed',
    config: { categories: ['travel', 'food'] },
    statistics: { records_extracted: 890, requests_failed: 5, requests_success: 895, requests_total: 900, bytes_downloaded: 28_000_000, duration_seconds: 2400, pages_crawled: 445 },
    started_at: twoDaysAgo,
    completed_at: yesterday,
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
];

// ---------------------------------------------------------------------------
// POIs
// ---------------------------------------------------------------------------

// Mocks mirror the real Hono `/api/pois` rows (snake_cased pois table) —
// a divergent mock shape previously masked the page/API contract mismatch.
const pois = [
  {
    id: 1,
    external_id: 'bund-001',
    name: 'The Bund',
    name_en: 'The Bund',
    category: 'attraction',
    city_id: 1,
    address: 'Zhongshan East 1st Road, Huangpu District',
    latitude: 31.2400,
    longitude: 121.4900,
    rating: 4.7,
    rating_count: 28500,
    price_level: null,
    business_hours: { monday: { open: '00:00', close: '23:59' } },
    phone: '021-12345678',
    image_urls: null,
    source: 'ctrip',
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 2,
    external_id: 'wl-001',
    name: 'West Lake',
    name_en: 'West Lake',
    category: 'attraction',
    city_id: 2,
    address: 'West Lake Scenic Area, Xihu District',
    latitude: 30.2590,
    longitude: 120.1300,
    rating: 4.8,
    rating_count: 35000,
    price_level: null,
    business_hours: null,
    phone: null,
    image_urls: null,
    source: 'xiaohongshu',
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 3,
    external_id: 'tas-001',
    name: 'Tiananmen Square',
    name_en: 'Tiananmen Square',
    category: 'attraction',
    city_id: 3,
    address: 'Dongcheng District',
    latitude: 39.9054,
    longitude: 116.3976,
    rating: null,
    rating_count: 0,
    price_level: null,
    business_hours: null,
    phone: null,
    image_urls: null,
    source: 'mafengwo',
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
];

// ---------------------------------------------------------------------------
// Travel Guides
// ---------------------------------------------------------------------------

const travelGuides = [
  {
    id: 'mock-guide-1',
    source_platform: 'xiaohongshu',
    source_external_id: 'xhs-001',
    source_url: 'https://example.com/guide/1',
    title: 'Shanghai Weekend Trip Guide',
    content: 'A comprehensive 3-day guide to exploring Shanghai, covering The Bund, Yu Garden, and French Concession...',
    author_name: 'TravelLover88',
    author_id: 'user-001',
    destinations: ['Shanghai'],
    tags: ['weekend', 'city', 'food'],
    likes_count: 3200,
    saves_count: null,
    comments_count: 280,
    views_count: 45000,
    cover_image_url: 'https://placehold.co/600x400/3b82f6/ffffff?text=Shanghai',
    image_urls: [],
    published_at: twoDaysAgo,
    crawled_at: yesterday,
    quality_score: 0.88,
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 'mock-guide-2',
    source_platform: 'mafengwo',
    source_external_id: 'mfw-001',
    source_url: 'https://example.com/guide/2',
    title: 'Chengdu Food & Panda Adventure',
    content: 'The ultimate guide to Chengdu — from hotpot to giant pandas...',
    author_name: 'FoodExplorer',
    author_id: 'user-002',
    destinations: ['Chengdu'],
    tags: ['food', 'panda', 'culture'],
    likes_count: 5600,
    saves_count: null,
    comments_count: 420,
    views_count: 78000,
    cover_image_url: 'https://placehold.co/600x400/10b981/ffffff?text=Chengdu',
    image_urls: [],
    published_at: twoDaysAgo,
    crawled_at: yesterday,
    quality_score: 0.92,
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 'mock-guide-3',
    source_platform: 'ctrip',
    source_external_id: 'ctrip-001',
    source_url: 'https://example.com/guide/3',
    title: 'Guilin Karst Landscape Explorer',
    content: 'Discover the stunning karst mountains of Guilin and Yangshuo...',
    author_name: 'NatureWanderer',
    author_id: 'user-003',
    destinations: ['Guilin', 'Yangshuo'],
    tags: ['nature', 'photography', 'hiking'],
    likes_count: 2100,
    saves_count: null,
    comments_count: 150,
    views_count: 32000,
    cover_image_url: 'https://placehold.co/600x400/f59e0b/ffffff?text=Guilin',
    image_urls: [],
    published_at: yesterday,
    crawled_at: now,
    quality_score: 0.75,
    created_at: yesterday,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// Training Datasets
// ---------------------------------------------------------------------------

const trainingDatasets = [
  {
    id: 'mock-ds-1',
    name: 'POI Classification v2',
    type: 'classification',
    status: 'completed',
    config: { categories: ['restaurant', 'hotel', 'attraction'] },
    statistics: { total_records: 12500, categories_distribution: { restaurant: 5000, hotel: 4000, attraction: 3500 } },
    file_path: '/datasets/poi-classification-v2.jsonl',
    created_at: twoDaysAgo,
    updated_at: yesterday,
  },
  {
    id: 'mock-ds-2',
    name: 'Travel Guide Quality',
    type: 'regression',
    status: 'generating',
    config: {},
    statistics: { total_records: 3200 },
    created_at: yesterday,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export function getMockResponse(endpoint: string, method: string): unknown | null {
  // GET /api/crawl-jobs
  if (method === 'GET' && /^\/api\/crawl-jobs(?:\?|$)/.test(endpoint)) {
    return { data: crawlJobs };
  }

  // GET /api/crawl-jobs/job?id=...
  if (method === 'GET' && /^\/api\/crawl-jobs\/job\?/.test(endpoint)) {
    const url = new URL(endpoint, 'http://localhost');
    const id = url.searchParams.get('id');
    const job = crawlJobs.find(j => j.id === id);
    return job ? { data: job } : null;
  }

  // GET /api/guides
  if (method === 'GET' && /^\/api\/guides(?:\?|$)/.test(endpoint)) {
    return { data: travelGuides };
  }

  // GET /api/guides/:id
  if (method === 'GET' && /^\/api\/guides\/[^/]+$/.test(endpoint)) {
    const id = endpoint.split('/').pop()!;
    const guide = travelGuides.find(g => g.id === id);
    return guide ? { data: guide } : null;
  }

  // GET /api/pois
  if (method === 'GET' && /^\/api\/pois(?:\?|$)/.test(endpoint)) {
    return { data: pois, pagination: { total: pois.length, limit: 50, offset: 0 } };
  }

  // GET /api/training-datasets
  if (method === 'GET' && /^\/api\/training-datasets(?:\?|$)/.test(endpoint)) {
    return { data: trainingDatasets, pagination: { total: trainingDatasets.length, limit: 50, offset: 0 } };
  }

  return null;
}
