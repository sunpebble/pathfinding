import { Hono } from 'hono';

// Placeholder routes - will be implemented in Phase 4-5 (US2, US3)
export const poisRoutes = new Hono();

// Search POIs by keyword
poisRoutes.get('/search', async (c) => {
  // TODO: T073 - Implement POI search
  const _q = c.req.query('q');
  const _cityId = c.req.query('cityId');
  return c.json({ data: [] });
});

// Get POI recommendations
poisRoutes.get('/recommend', async (c) => {
  // TODO: T091 - Implement POI recommendations
  const _cityId = c.req.query('cityId');
  const _category = c.req.query('category');
  return c.json({ data: [] });
});

// Get nearby POIs
poisRoutes.get('/nearby', async (c) => {
  // TODO: T092 - Implement nearby POIs
  const _lat = c.req.query('lat');
  const _lng = c.req.query('lng');
  const _radius = c.req.query('radius') || '5000';
  return c.json({ data: [] });
});
