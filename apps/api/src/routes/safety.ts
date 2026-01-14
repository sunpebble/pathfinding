import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { SafetyService } from '../services/safetyService';

interface Variables {
  userId: string;
  accessToken: string;
}

export const safetyRoutes = new Hono<{ Variables: Variables }>();

// Enums for validation
const AlertTypeSchema = z.enum([
  'travel_advisory',
  'health_warning',
  'natural_disaster',
  'civil_unrest',
  'terrorism',
  'crime_spike',
  'scam_warning',
  'other',
]);

const SeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

const DangerLevelSchema = z.enum([
  'caution',
  'avoid_night',
  'avoid_alone',
  'high_risk',
  'no_go',
]);

const DangerTypeSchema = z.enum([
  'crime',
  'scam',
  'traffic',
  'natural_hazard',
  'political',
  'health',
  'other',
]);

const IncidentTypeSchema = z.enum([
  'theft',
  'assault',
  'scam',
  'harassment',
  'traffic_accident',
  'natural_disaster',
  'health_issue',
  'police_issue',
  'other',
]);

const IncidentSeveritySchema = z.enum([
  'minor',
  'moderate',
  'severe',
  'critical',
]);

// ============================================
// Safety Ratings
// ============================================

/**
 * Get safety rating for a destination
 * GET /safety/ratings?destination=Tokyo&countryCode=JP
 */
safetyRoutes.get(
  '/ratings',
  zValidator(
    'query',
    z.object({
      destination: z.string().optional(),
      countryCode: z.string().optional(),
      cityId: z.string().optional(),
    })
  ),
  async (c) => {
    const { destination, countryCode, cityId } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const rating = await SafetyService.getSafetyRating(
      {
        destinationName: destination,
        countryCode,
        cityId,
      },
      accessToken
    );

    return c.json({ data: rating });
  }
);

/**
 * List safety ratings by country
 * GET /safety/ratings/country/:countryCode
 */
safetyRoutes.get(
  '/ratings/country/:countryCode',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
  ),
  async (c) => {
    const countryCode = c.req.param('countryCode');
    const { limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const ratings = await SafetyService.listSafetyRatingsByCountry(
      countryCode,
      limit,
      accessToken
    );

    return c.json({ data: ratings });
  }
);

/**
 * List safest destinations
 * GET /safety/ratings/safest?minRating=4&limit=20
 */
safetyRoutes.get(
  '/ratings/safest',
  zValidator(
    'query',
    z.object({
      minRating: z.coerce.number().min(1).max(5).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    })
  ),
  async (c) => {
    const { minRating, limit } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const ratings = await SafetyService.listSafestDestinations(
      minRating,
      limit,
      accessToken
    );

    return c.json({ data: ratings });
  }
);

// ============================================
// Safety Alerts
// ============================================

/**
 * Get active alerts
 * GET /safety/alerts?destination=Tokyo&severity=high
 */
safetyRoutes.get(
  '/alerts',
  zValidator(
    'query',
    z.object({
      destination: z.string().optional(),
      countryCode: z.string().optional(),
      cityId: z.string().optional(),
      alertType: AlertTypeSchema.optional(),
      severity: SeveritySchema.optional(),
    })
  ),
  async (c) => {
    const { destination, countryCode, cityId, alertType, severity } =
      c.req.valid('query');
    const accessToken = c.get('accessToken');

    const alerts = await SafetyService.getActiveAlerts(
      {
        destinationName: destination,
        countryCode,
        cityId,
        alertType,
        severity,
      },
      accessToken
    );

    return c.json({ data: alerts });
  }
);

/**
 * Get alert by ID
 * GET /safety/alerts/:id
 */
safetyRoutes.get('/alerts/:id', async (c) => {
  const alertId = c.req.param('id');
  const accessToken = c.get('accessToken');

  const alert = await SafetyService.getAlertById(alertId, accessToken);

  return c.json({ data: alert });
});

/**
 * Create safety alert (admin only)
 * POST /safety/alerts
 */
safetyRoutes.post(
  '/alerts',
  zValidator(
    'json',
    z.object({
      destinationName: z.string().min(1),
      countryCode: z.string().length(2),
      cityId: z.string().optional(),
      affectedAreas: z.array(z.string()).optional(),
      alertType: AlertTypeSchema,
      severity: SeveritySchema,
      title: z.string().min(1),
      titleEn: z.string().optional(),
      description: z.string().min(1),
      descriptionEn: z.string().optional(),
      recommendations: z.array(z.string()),
      avoidAreas: z.array(z.string()).optional(),
      startDate: z.number(),
      endDate: z.number().optional(),
      source: z.string(),
      sourceUrl: z.string().url().optional(),
      officialAdvisoryLevel: z.string().optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid('json');
    const accessToken = c.get('accessToken');
    const userId = c.get('userId');

    const id = await SafetyService.createAlert(
      {
        ...data,
        createdBy: userId,
      },
      accessToken
    );

    return c.json({ data: { id } }, 201);
  }
);

/**
 * Update safety alert
 * PATCH /safety/alerts/:id
 */
safetyRoutes.patch(
  '/alerts/:id',
  zValidator(
    'json',
    z.object({
      title: z.string().min(1).optional(),
      titleEn: z.string().optional(),
      description: z.string().min(1).optional(),
      descriptionEn: z.string().optional(),
      severity: SeveritySchema.optional(),
      recommendations: z.array(z.string()).optional(),
      avoidAreas: z.array(z.string()).optional(),
      endDate: z.number().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const alertId = c.req.param('id');
    const data = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const alert = await SafetyService.updateAlert(alertId, data, accessToken);

    return c.json({ data: alert });
  }
);

/**
 * Deactivate alert
 * DELETE /safety/alerts/:id
 */
safetyRoutes.delete('/alerts/:id', async (c) => {
  const alertId = c.req.param('id');
  const accessToken = c.get('accessToken');

  await SafetyService.deactivateAlert(alertId, accessToken);

  return c.json({ success: true });
});

// ============================================
// Danger Zones
// ============================================

/**
 * Get danger zones
 * GET /safety/danger-zones?destination=Tokyo&dangerLevel=high_risk
 */
safetyRoutes.get(
  '/danger-zones',
  zValidator(
    'query',
    z.object({
      destination: z.string().optional(),
      countryCode: z.string().optional(),
      cityId: z.string().optional(),
      dangerLevel: DangerLevelSchema.optional(),
      activeOnly: z.coerce.boolean().optional().default(true),
    })
  ),
  async (c) => {
    const { destination, countryCode, cityId, dangerLevel, activeOnly } =
      c.req.valid('query');
    const accessToken = c.get('accessToken');

    const zones = await SafetyService.getDangerZones(
      {
        destinationName: destination,
        countryCode,
        cityId,
        dangerLevel,
        activeOnly,
      },
      accessToken
    );

    return c.json({ data: zones });
  }
);

/**
 * Get nearby danger zones
 * GET /safety/danger-zones/nearby?lat=35.6&lng=139.7&radiusKm=5
 */
safetyRoutes.get(
  '/danger-zones/nearby',
  zValidator(
    'query',
    z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radiusKm: z.coerce.number().min(0.1).max(100).optional().default(5),
      activeOnly: z.coerce.boolean().optional().default(true),
    })
  ),
  async (c) => {
    const { lat, lng, radiusKm, activeOnly } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const zones = await SafetyService.getNearbyDangerZones(
      lat,
      lng,
      radiusKm,
      activeOnly,
      accessToken
    );

    return c.json({ data: zones });
  }
);

/**
 * Create danger zone (admin only)
 * POST /safety/danger-zones
 */
safetyRoutes.post(
  '/danger-zones',
  zValidator(
    'json',
    z.object({
      destinationName: z.string().min(1),
      countryCode: z.string().length(2),
      cityId: z.string().optional(),
      zoneName: z.string().min(1),
      zoneNameEn: z.string().optional(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      radiusMeters: z.number().positive().optional(),
      polygon: z
        .array(
          z.object({
            lat: z.number(),
            lng: z.number(),
          })
        )
        .optional(),
      dangerLevel: DangerLevelSchema,
      dangerTypes: z.array(DangerTypeSchema),
      description: z.string().min(1),
      descriptionEn: z.string().optional(),
      precautions: z.array(z.string()),
      dangerousTimes: z
        .object({
          allDay: z.boolean(),
          nightOnly: z.boolean().optional(),
          specificHours: z.string().optional(),
          specificDays: z.array(z.string()).optional(),
        })
        .optional(),
      source: z.string(),
    })
  ),
  async (c) => {
    const data = c.req.valid('json');
    const accessToken = c.get('accessToken');

    const id = await SafetyService.createDangerZone(data, accessToken);

    return c.json({ data: { id } }, 201);
  }
);

// ============================================
// Incident Reports
// ============================================

/**
 * Get incident reports
 * GET /safety/incidents?destination=Tokyo&incidentType=theft
 */
safetyRoutes.get(
  '/incidents',
  zValidator(
    'query',
    z.object({
      destination: z.string().optional(),
      countryCode: z.string().optional(),
      cityId: z.string().optional(),
      incidentType: IncidentTypeSchema.optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const { destination, countryCode, cityId, incidentType, limit } =
      c.req.valid('query');
    const accessToken = c.get('accessToken');

    const reports = await SafetyService.getIncidentReports(
      {
        destinationName: destination,
        countryCode,
        cityId,
        incidentType,
        limit,
      },
      accessToken
    );

    return c.json({ data: reports });
  }
);

/**
 * Get user's incident reports
 * GET /safety/incidents/me
 */
safetyRoutes.get(
  '/incidents/me',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    })
  ),
  async (c) => {
    const { limit } = c.req.valid('query');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const reports = await SafetyService.getUserIncidentReports(
      userId,
      limit,
      accessToken
    );

    return c.json({ data: reports });
  }
);

/**
 * Create incident report
 * POST /safety/incidents
 */
safetyRoutes.post(
  '/incidents',
  zValidator(
    'json',
    z.object({
      isAnonymous: z.boolean().optional().default(false),
      destinationName: z.string().min(1),
      countryCode: z.string().length(2),
      cityId: z.string().optional(),
      specificLocation: z.string().optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      incidentType: IncidentTypeSchema,
      severity: IncidentSeveritySchema,
      title: z.string().min(1).max(200),
      description: z.string().min(10).max(5000),
      incidentDate: z.number(),
      wasPoliceInvolved: z.boolean().optional(),
      wasResolved: z.boolean().optional(),
      resolutionNotes: z.string().optional(),
    })
  ),
  async (c) => {
    const data = c.req.valid('json');
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');

    const id = await SafetyService.createIncidentReport(
      {
        ...data,
        userId,
      },
      accessToken
    );

    return c.json({ data: { id } }, 201);
  }
);

/**
 * Mark incident report as helpful
 * POST /safety/incidents/:id/helpful
 */
safetyRoutes.post('/incidents/:id/helpful', async (c) => {
  const reportId = c.req.param('id');
  const accessToken = c.get('accessToken');

  await SafetyService.markReportHelpful(reportId, accessToken);

  return c.json({ success: true });
});

// ============================================
// Comprehensive Safety Info
// ============================================

/**
 * Get complete safety information for a destination
 * GET /safety/destination/:name
 */
safetyRoutes.get(
  '/destination/:name',
  zValidator(
    'query',
    z.object({
      countryCode: z.string().optional(),
    })
  ),
  async (c) => {
    const destinationName = c.req.param('name');
    const { countryCode } = c.req.valid('query');
    const accessToken = c.get('accessToken');

    const info = await SafetyService.getDestinationSafetyInfo(
      destinationName,
      countryCode,
      accessToken
    );

    return c.json({ data: info });
  }
);
