/**
 * iCal Export API Routes
 * Endpoints for generating iCal (.ics) files for itineraries
 */

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ICalExportService } from '../services/icalExportService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Validation schemas
const ICalOptionsSchema = z.object({
  start_date: z.string().datetime().optional(),
  enable_reminders: z.boolean().optional().default(true),
  reminder_minutes: z.number().int().min(5).max(1440).optional().default(30),
  timezone: z.string().optional().default('Asia/Shanghai'),
  include_navigation_links: z.boolean().optional().default(true),
});

const ICalQuerySchema = z.object({
  start_date: z.string().optional(),
  enable_reminders: z.enum(['true', 'false']).optional(),
  reminder_minutes: z.string().regex(/^\d+$/).optional(),
  timezone: z.string().optional(),
  include_navigation_links: z.enum(['true', 'false']).optional(),
});

// Public routes (no auth required) - for sharing iCal links
export const publicICalRoutes = new Hono();

/**
 * GET /ical/info - Get iCal export information
 * No authentication required
 */
publicICalRoutes.get('/info', async (c) => {
  return c.json({
    success: true,
    data: {
      description: 'iCal export allows you to sync your travel itinerary with calendar apps',
      supported_apps: [
        'Apple Calendar',
        'Google Calendar',
        'Microsoft Outlook',
        'Any app supporting .ics files',
      ],
      features: [
        'Export all POIs as calendar events',
        'Customizable start date',
        'Optional reminders before each event',
        'Location and description included',
        'GPS coordinates for navigation',
        'Apple Maps and Google Maps navigation links',
        'Subscription URLs for automatic updates',
      ],
      options: {
        start_date: 'ISO 8601 datetime string for itinerary start',
        enable_reminders: 'Whether to add reminders (default: true)',
        reminder_minutes: 'Minutes before event for reminder (5-1440, default: 30)',
        timezone: 'Timezone for events (default: Asia/Shanghai)',
        include_navigation_links: 'Include Apple/Google Maps links in event description (default: true)',
      },
    },
  });
});

// Protected routes (auth required)
export const icalRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /ical/itineraries/:id - Download iCal file for an itinerary
 * Supports query parameters for options
 */
icalRoutes.get(
  '/itineraries/:id',
  zValidator('query', ICalQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('id');
    const query = c.req.valid('query');

    const options = {
      startDate: query.start_date ? new Date(query.start_date) : undefined,
      enableReminders: query.enable_reminders === 'true' || query.enable_reminders === undefined,
      reminderMinutes: query.reminder_minutes ? parseInt(query.reminder_minutes, 10) : undefined,
      timezone: query.timezone,
    };

    const result = await ICalExportService.generateICal(
      itineraryId,
      userId,
      options,
      accessToken
    );

    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Content-Length': Buffer.byteLength(result.data, 'utf-8').toString(),
      },
    });
  }
);

/**
 * POST /ical/itineraries/:id - Generate iCal with JSON body options
 * More flexible option configuration via request body
 */
icalRoutes.post(
  '/itineraries/:id',
  zValidator('json', ICalOptionsSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const itineraryId = c.req.param('id');
    const options = c.req.valid('json');

    const result = await ICalExportService.generateICal(
      itineraryId,
      userId,
      {
        startDate: options.start_date ? new Date(options.start_date) : undefined,
        enableReminders: options.enable_reminders,
        reminderMinutes: options.reminder_minutes,
        timezone: options.timezone,
      },
      accessToken
    );

    return new Response(result.data, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
        'Content-Length': Buffer.byteLength(result.data, 'utf-8').toString(),
      },
    });
  }
);

/**
 * GET /ical/itineraries/:id/preview - Preview iCal export info without downloading
 * Returns metadata about what would be exported
 */
icalRoutes.get('/itineraries/:id/preview', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itineraryId = c.req.param('id');

  // Generate iCal to get event count and other metadata
  const result = await ICalExportService.generateICal(
    itineraryId,
    userId,
    {},
    accessToken
  );

  // Count events in the iCal data
  const eventCount = (result.data.match(/BEGIN:VEVENT/g) || []).length;

  return c.json({
    success: true,
    data: {
      filename: result.filename,
      content_type: result.contentType,
      event_count: eventCount,
      file_size_bytes: Buffer.byteLength(result.data, 'utf-8'),
      download_url: `/v1/ical/itineraries/${itineraryId}`,
    },
  });
});
