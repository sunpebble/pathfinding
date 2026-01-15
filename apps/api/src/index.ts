import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { responseSizeLimitMiddleware } from './middleware/responseSizeLimit';
import { tracingMiddleware } from './middleware/tracing';
import { analysisRoutes } from './routes/analysis';
import { astronomyRoutes } from './routes/astronomy';
import budgets from './routes/budgets';
import { businessHoursRoutes } from './routes/businessHours';
import {
  chargingStationRoutes,
  publicChargingStationRoutes,
} from './routes/chargingStations';
import { chatRoutes, publicChatRoutes } from './routes/chat';
import { cityRoutes, publicCityRoutes } from './routes/cities';
import { collaborationRoutes } from './routes/collaboration';
import {
  commentRoutes,
  notificationRoutes,
  publicCommentRoutes,
} from './routes/comments';
import { eventsRoutes, publicEventsRoutes } from './routes/events';
import { feedRoutes, publicFeedRoutes } from './routes/feed';
import { flightRoutes, publicFlightRoutes } from './routes/flights';
import { followRoutes, publicFollowRoutes } from './routes/follows';
import { hiddenGemsRoutes } from './routes/hiddenGems';
import { hotelBookingsRoutes } from './routes/hotelBookings';
import { icalRoutes, publicICalRoutes } from './routes/ical';
import { insuranceRoutes } from './routes/insurance';
import {
  itinerariesRoutes,
  publicItinerariesRoutes,
} from './routes/itineraries';
import {
  favoriteCollectionsRoutes,
  itineraryFavoritesRoutes,
  myFavoritesRoutes,
  publicFavoriteCountRoutes,
} from './routes/itinerary-favorites';
import { itineraryItemsRoutes } from './routes/itinerary-items';
import { itineraryLikesRoutes, myLikesRoutes } from './routes/itinerary-likes';
import { itineraryVersionsRoutes } from './routes/itinerary-versions';
import { luggageRoutes, publicLuggageRoutes } from './routes/luggage';


import { pdfExportRoutes, publicPdfExportRoutes } from './routes/pdf-export';
import {
  photoAdminRoutes,
  photoRoutes,
  poiPhotosRoutes,
} from './routes/poiPhotos';
import { publicQARoutes, qaRoutes } from './routes/poiQA';
import { poisRoutes } from './routes/pois';
import { preferencesRoutes } from './routes/preferences';
import { remindersRoutes } from './routes/reminders';
import {
  publicRouteOptimizationRoutes,
  routeOptimizationRoutes,
} from './routes/route-optimization';
import { safetyRoutes } from './routes/safety';
import {
  itineraryShareRoutes,
  publicShareRoutes,
  shareRoutes,
} from './routes/share';
import { simCardRoutes } from './routes/simCards';
import { statsRoutes } from './routes/stats';
import {
  publicTemplateRoutes,
} from './routes/templates';
import { ticketReminderRoutes, ticketRoutes } from './routes/tickets';
import { timezonesRoutes } from './routes/timezones';
import { tippingRoutes } from './routes/tipping';
import { publicTransportRoutes } from './routes/transport';
import {
  publicTravelNotesRoutes,
  travelNotesRoutes,
} from './routes/travel-notes';


import { voiceRoutes } from './routes/voice';
import { weatherRoutes } from './routes/weather';
import { publicWifiRoutes, wifiRoutes } from './routes/wifi';
import 'dotenv/config';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:8081', // Expo web
      'http://localhost:19006', // Expo web alternative
      'exp://localhost:8081', // Expo Go
    ],
    credentials: true,
  })
);
app.use('*', tracingMiddleware);
app.use('*', errorHandler);
app.use('*', responseSizeLimitMiddleware); // NFR-004: Monitor response sizes

// Health check (no auth required)
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public API v1 routes (no auth required)
const publicApi = new Hono();
publicApi.route('/itineraries', publicItinerariesRoutes);
publicApi.route('/itineraries', publicCommentRoutes); // Public comment routes (nested under itineraries)
publicApi.route('/', publicCommentRoutes); // For /comments/:commentId endpoints
publicApi.route('/route-optimization', publicRouteOptimizationRoutes); // Route optimization public endpoints
publicApi.route('/feed', publicFeedRoutes); // Public activity feed endpoints
publicApi.route('/astronomy', astronomyRoutes); // Astronomy data (sunrise/sunset, moon phases, events)
publicApi.route('/voice', voiceRoutes); // Voice command parsing and search (no auth required for basic features)
publicApi.route('/travel-notes', publicTravelNotesRoutes); // Public travel notes endpoints
publicApi.route('/wifi', publicWifiRoutes); // Public WiFi spots and reviews
publicApi.route('/pdf', publicPdfExportRoutes); // Public PDF templates
publicApi.route('/templates', publicTemplateRoutes); // Public template browsing
publicApi.route('/weather', weatherRoutes); // Weather forecasts and recommendations (no auth required)
publicApi.route('/transport', publicTransportRoutes); // Multi-modal transport planning
publicApi.route('/charging-stations', publicChargingStationRoutes); // EV charging station search and info
publicApi.route('/photos', photoRoutes); // Public photo timeline and viewing
publicApi.route('/share', publicShareRoutes); // Public share link access and tracking
publicApi.route('/follows', publicFollowRoutes); // Public follow routes (view followers/following)
publicApi.route('/luggage', publicLuggageRoutes); // Public luggage tracking info and guides
publicApi.route('/ical', publicICalRoutes); // Public iCal export info
publicApi.route('/itineraries', publicFavoriteCountRoutes); // Public favorite counts for itineraries
publicApi.route('/events', publicEventsRoutes); // Local events and festivals
publicApi.route('/flights', publicFlightRoutes); // Flight lookup and search
publicApi.route('/cities', publicCityRoutes); // City encyclopedia and information
publicApi.route('/pois', publicQARoutes); // POI Q&A community (read-only)
publicApi.route('/chat', publicChatRoutes); // Public chat health check

// Protected API v1 routes (auth required)
const protectedApi = new Hono();
protectedApi.use('*', authMiddleware);
protectedApi.route('/itineraries', itinerariesRoutes);
protectedApi.route('/itineraries', itineraryItemsRoutes); // Nested items routes
protectedApi.route('/itineraries', commentRoutes); // Protected comment routes (nested under itineraries)
protectedApi.route('/', commentRoutes); // For /comments/:commentId endpoints
protectedApi.route('/notifications', notificationRoutes);
protectedApi.route('/pois', poisRoutes);
protectedApi.route('/pois', businessHoursRoutes); // POI business hours management
protectedApi.route('/hidden-gems', hiddenGemsRoutes);
protectedApi.route('/safety', safetyRoutes);
protectedApi.route('/stats', statsRoutes); // Travel statistics and yearly reviews
protectedApi.route('/', remindersRoutes);
protectedApi.route('/', budgets); // Budget routes
protectedApi.route('/route-optimization', routeOptimizationRoutes); // Route optimization protected endpoints
protectedApi.route('/insurance', insuranceRoutes); // Insurance products, recommendations, and claims
protectedApi.route('/timezones', timezonesRoutes); // Timezone settings and world clock
protectedApi.route('/itineraries', collaborationRoutes); // Real-time collaboration routes
protectedApi.route('/wifi', wifiRoutes); // WiFi credentials and reviews management
protectedApi.route('/pdf', pdfExportRoutes); // PDF export for itineraries and guides
protectedApi.route('/feed', feedRoutes); // Protected activity feed endpoints (personalized feed, follows)
protectedApi.route('/travel-notes', travelNotesRoutes); // Travel notes CRUD operations
protectedApi.route('/hotel-bookings', hotelBookingsRoutes); // Hotel booking management
protectedApi.route('/pois', ticketRoutes); // POI ticket information
protectedApi.route('/ticket-reminders', ticketReminderRoutes); // Ticket booking reminders
protectedApi.route('/tipping', tippingRoutes); // Tipping guides and calculator
protectedApi.route('/charging-stations', chargingStationRoutes); // EV charging station reviews and favorites
protectedApi.route('/pois', poiPhotosRoutes); // POI photo upload and management
protectedApi.route('/photos', photoRoutes); // Photo operations (like, unlike, delete)
protectedApi.route('/admin/photos', photoAdminRoutes); // Photo moderation (admin only)
protectedApi.route('/share', shareRoutes); // Share link management and statistics
protectedApi.route('/itineraries', itineraryShareRoutes); // Itinerary-specific share routes
protectedApi.route('/luggage', luggageRoutes); // Luggage tracking and management
protectedApi.route('/follows', followRoutes); // Follow/unfollow, recommendations, mutual follows
protectedApi.route('/analysis', analysisRoutes); // Itinerary analysis and scoring
protectedApi.route('/ical', icalRoutes); // iCal export for itineraries
protectedApi.route('/itineraries', itineraryLikesRoutes); // Itinerary like/unlike operations
protectedApi.route('/itineraries', itineraryFavoritesRoutes); // Itinerary favorite operations
protectedApi.route('/me', myLikesRoutes); // User's liked itineraries
protectedApi.route('/me', myFavoritesRoutes); // User's favorited itineraries
protectedApi.route('/collections', favoriteCollectionsRoutes); // Favorite collections management
protectedApi.route('/events', eventsRoutes); // Local events management
protectedApi.route('/preferences', preferencesRoutes); // User preferences and behavior tracking
protectedApi.route('/flights', flightRoutes); // Flight bookings management
protectedApi.route('/cities', cityRoutes); // City encyclopedia management
protectedApi.route('/itineraries', itineraryVersionsRoutes); // Itinerary version history
protectedApi.route('/pois', qaRoutes); // POI Q&A community (create, vote, answer)
protectedApi.route('/sim-cards', simCardRoutes); // International SIM card recommendations
protectedApi.route('/chat', chatRoutes); // AI Chat proxy to crawler service

// Mount both API groups under /v1
// Public routes first so they take precedence for matching paths
app.route('/v1', publicApi);
app.route('/v1', protectedApi);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Start server
const port = Number.parseInt(process.env.PORT || '8000');
// eslint-disable-next-line no-console -- Server startup log is intentional
console.log(`🚀 API server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
