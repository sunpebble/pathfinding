/// API endpoint constants
class ApiEndpoints {
  // API server for itineraries and POIs
  static const String baseUrl = 'http://localhost:8000/v1';
  
  // Itineraries
  static const String itineraries = '/itineraries';
  static String itinerary(String id) => '/itineraries/$id';
  static String itineraryDays(String id) => '/itineraries/$id/days';
  
  // POIs
  static const String pois = '/pois';
  static String poi(String id) => '/pois/$id';
  static const String poiSearch = '/pois/search';
  static const String poiRecommend = '/pois/recommend';
}

/// Supabase configuration
class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'http://localhost:54321',
  );
  
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  );
}

/// App configuration
class AppConfig {
  static const String appName = 'Pathfinding';
  static const String appVersion = '1.0.0';
  
  // Pagination
  static const int defaultPageSize = 20;
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Map
  static const double defaultLatitude = 35.8617;
  static const double defaultLongitude = 104.1954;
  static const double defaultZoom = 5.0;
}
