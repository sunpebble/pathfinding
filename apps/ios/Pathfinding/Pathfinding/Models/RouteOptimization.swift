import Foundation

// MARK: - Route Optimization Models

struct RouteOptimizationOptions: Codable {
    var preferredTransportMode: String?
    var startTime: Int? // Minutes from midnight
    var endTime: Int? // Minutes from midnight
    var considerTimeWindows: Bool?
    var returnToStart: Bool?
    var maxWalkingDistanceKm: Double?
}

struct OptimizeDayRequest: Codable {
    let day: AiDay
    let options: RouteOptimizationOptions?
}

struct OptimizeItineraryRequest: Codable {
    let days: [AiDay]
    let options: RouteOptimizationOptions?
}

struct OptimizedRouteResponse: Codable {
    let success: Bool
    let data: OptimizedRouteResult
}

struct OptimizedItineraryResponse: Codable {
    let success: Bool
    let data: OptimizedItineraryResult
}

struct RouteComparisonResponse: Codable {
    let success: Bool
    let data: RouteComparisonResult
}

struct TransportModesResponse: Codable {
    let success: Bool
    let data: [RouteTransportModeInfo]
}

struct OptimizedRouteResult: Codable {
    let originalOrder: [AiPoi]
    let optimizedOrder: [AiPoi]
    let totalDistance: Double
    let totalDuration: Int
    let savings: RouteSavings
    let segments: [RouteSegment]
    let feasibilityIssues: [String]
}

struct OptimizedItineraryResult: Codable {
    let days: [OptimizedRouteResult]
    let summary: ItinerarySummary
}

struct RouteComparisonResult: Codable {
    let original: RouteBasicInfo
    let optimized: RouteBasicInfo
    let savings: RouteSavings
    let segments: [RouteSegment]
    let feasibilityIssues: [String]
    let recommendation: String
}

struct RouteBasicInfo: Codable {
    let order: [String]
    let poiCount: Int
}

struct RouteSavings: Codable {
    let distanceKm: Double
    let distancePercent: Double
    let durationMinutes: Int
    let durationPercent: Double
}

struct RouteSegment: Codable, Identifiable {
    var id: String { "\(from)-\(to)" }
    let from: String
    let to: String
    let transportMode: String
    let distanceKm: Double
    let durationMinutes: Int
    let departureTime: String?
    let arrivalTime: String?
}

struct RouteTransportModeInfo: Codable, Identifiable {
    let id: String
    let name: String
    let nameEn: String
    let avgSpeedKmh: Int
    let maxRecommendedKm: Double
    let icon: String
}

struct ItinerarySummary: Codable {
    let totalDays: Int
    let totalPois: Int
    let totalDistance: Double
    let totalTravelDuration: Int
    let totalSavings: RouteSavingsSimple
    let allFeasible: Bool
}

struct RouteSavingsSimple: Codable {
    let distanceKm: Double
    let durationMinutes: Int
}
