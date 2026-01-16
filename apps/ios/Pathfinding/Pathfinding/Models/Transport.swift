import Foundation
import SwiftUI

// MARK: - Transport Mode

enum TransportMode: String, Codable, CaseIterable {
    case walking
    case cycling
    case driving
    case taxi
    case bus
    case subway
    case transit

    var displayName: String {
        switch self {
        case .walking: return "步行"
        case .cycling: return "骑行"
        case .driving: return "自驾"
        case .taxi: return "出租车"
        case .bus: return "公交"
        case .subway: return "地铁"
        case .transit: return "公共交通"
        }
    }

    var icon: String {
        switch self {
        case .walking: return "figure.walk"
        case .cycling: return "bicycle"
        case .driving: return "car.fill"
        case .taxi: return "car.fill"
        case .bus: return "bus.fill"
        case .subway: return "tram.fill"
        case .transit: return "tram.fill"
        }
    }

    var color: Color {
        switch self {
        case .walking: return .green
        case .cycling: return .cyan
        case .driving: return .gray
        case .taxi: return .red
        case .bus: return .orange
        case .subway: return .blue
        case .transit: return .purple
        }
    }
}

// MARK: - Coordinate

struct TransportCoordinate: Codable, Equatable {
    let latitude: Double
    let longitude: Double
}

// MARK: - Transit Step

struct TransitStep: Codable, Identifiable {
    var id: String { "\(mode.rawValue)-\(instruction.prefix(20))-\(distance)" }

    let mode: TransportMode
    let instruction: String
    let distance: Int // meters
    let duration: Int // seconds
    let polyline: String?
    let lineName: String?
    let lineColor: String?
    let departureStop: String?
    let arrivalStop: String?
    let stopCount: Int?
    let departureTime: String?
    let arrivalTime: String?

    enum CodingKeys: String, CodingKey {
        case mode
        case instruction
        case distance
        case duration
        case polyline
        case lineName = "line_name"
        case lineColor = "line_color"
        case departureStop = "departure_stop"
        case arrivalStop = "arrival_stop"
        case stopCount = "stop_count"
        case departureTime = "departure_time"
        case arrivalTime = "arrival_time"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        mode = try container.decode(TransportMode.self, forKey: .mode)
        instruction = try container.decode(String.self, forKey: .instruction)
        distance = try container.decode(Int.self, forKey: .distance)
        duration = try container.decode(Int.self, forKey: .duration)
        polyline = try container.decodeIfPresent(String.self, forKey: .polyline)
        lineName = try container.decodeIfPresent(String.self, forKey: .lineName)
        lineColor = try container.decodeIfPresent(String.self, forKey: .lineColor)
        departureStop = try container.decodeIfPresent(String.self, forKey: .departureStop)
        arrivalStop = try container.decodeIfPresent(String.self, forKey: .arrivalStop)
        stopCount = try container.decodeIfPresent(Int.self, forKey: .stopCount)
        departureTime = try container.decodeIfPresent(String.self, forKey: .departureTime)
        arrivalTime = try container.decodeIfPresent(String.self, forKey: .arrivalTime)
    }

    /// Format duration as human-readable string
    var formattedDuration: String {
        formatDuration(seconds: duration)
    }

    /// Format distance as human-readable string
    var formattedDistance: String {
        formatDistance(meters: distance)
    }
}

// MARK: - Cost Range

struct CostRange: Codable {
    let min: Double
    let max: Double

    var formatted: String {
        if min == max {
            if min == 0 { return "免费" }
            return "¥\(Int(min))"
        }
        return "¥\(Int(min))-\(Int(max))"
    }
}

// MARK: - Traffic Condition

enum TrafficCondition: String, Codable {
    case smooth
    case slow
    case congested

    var displayName: String {
        switch self {
        case .smooth: return "畅通"
        case .slow: return "缓行"
        case .congested: return "拥堵"
        }
    }

    var color: Color {
        switch self {
        case .smooth: return .green
        case .slow: return .orange
        case .congested: return .red
        }
    }

    var icon: String {
        switch self {
        case .smooth: return "checkmark.circle.fill"
        case .slow: return "exclamationmark.circle.fill"
        case .congested: return "xmark.circle.fill"
        }
    }
}

// MARK: - Transport Route

struct TransportRoute: Codable, Identifiable {
    var id: String { mode.rawValue }

    let mode: TransportMode
    let distance: Int // meters
    let duration: Int // seconds
    let cost: Double?
    let costRange: CostRange?
    let steps: [TransitStep]?
    let polyline: String?
    let trafficCondition: TrafficCondition?
    let walkingDistance: Int?
    let transfers: Int?

    enum CodingKeys: String, CodingKey {
        case mode
        case distance
        case duration
        case cost
        case costRange = "cost_range"
        case steps
        case polyline
        case trafficCondition = "traffic_condition"
        case walkingDistance = "walking_distance"
        case transfers
    }

    /// Format duration as human-readable string
    var formattedDuration: String {
        formatDuration(seconds: duration)
    }

    /// Format distance as human-readable string
    var formattedDistance: String {
        formatDistance(meters: distance)
    }

    /// Format cost as human-readable string
    var formattedCost: String {
        if let cost = cost {
            if cost == 0 { return "免费" }
            return "¥\(Int(cost))"
        }
        if let range = costRange {
            return range.formatted
        }
        return "-"
    }

    /// Format walking distance if available
    var formattedWalkingDistance: String? {
        guard let walkingDistance = walkingDistance else { return nil }
        return "步行\(formatDistance(meters: walkingDistance))"
    }

    /// Format transfers if available
    var formattedTransfers: String? {
        guard let transfers = transfers else { return nil }
        if transfers == 0 { return "直达" }
        return "换乘\(transfers)次"
    }
}

// MARK: - Transport Comparison

struct TransportComparison: Codable {
    let origin: TransportCoordinate
    let destination: TransportCoordinate
    let originName: String?
    let destinationName: String?
    let routes: [TransportRoute]
    let recommended: TransportMode?
    let recommendationReason: String?
    let calculatedAt: String

    enum CodingKeys: String, CodingKey {
        case origin
        case destination
        case originName = "origin_name"
        case destinationName = "destination_name"
        case routes
        case recommended
        case recommendationReason = "recommendation_reason"
        case calculatedAt = "calculated_at"
    }

    /// Get the recommended route
    var recommendedRoute: TransportRoute? {
        guard let recommended = recommended else { return nil }
        return routes.first { $0.mode == recommended }
    }

    /// Get routes sorted by duration
    var routesByDuration: [TransportRoute] {
        routes.sorted { $0.duration < $1.duration }
    }

    /// Get routes sorted by cost
    var routesByCost: [TransportRoute] {
        routes.sorted { ($0.cost ?? 0) < ($1.cost ?? 0) }
    }
}

// MARK: - Transit Pass Type

enum TransitPassType: String, Codable {
    case dayPass = "day_pass"
    case multiDayPass = "multi_day_pass"
    case storedValue = "stored_value"
    case touristCard = "tourist_card"

    var displayName: String {
        switch self {
        case .dayPass: return "日票"
        case .multiDayPass: return "多日票"
        case .storedValue: return "储值卡"
        case .touristCard: return "旅游卡"
        }
    }
}

// MARK: - Transit Pass Recommendation

struct TransitPassRecommendation: Codable, Identifiable {
    var id: String { name }

    let name: String
    let nameZh: String
    let type: TransitPassType
    let price: Double
    let currency: String
    let validDays: Int?
    let coverage: [String]
    let benefits: [String]
    let purchaseLocations: [String]
    let recommended: Bool
    let recommendationReason: String?

    enum CodingKeys: String, CodingKey {
        case name
        case nameZh = "name_zh"
        case type
        case price
        case currency
        case validDays = "valid_days"
        case coverage
        case benefits
        case purchaseLocations = "purchase_locations"
        case recommended
        case recommendationReason = "recommendation_reason"
    }

    /// Format price
    var formattedPrice: String {
        "¥\(Int(price))"
    }

    /// Format validity
    var formattedValidity: String? {
        guard let days = validDays else { return nil }
        if days == 1 { return "24小时有效" }
        return "\(days)天有效"
    }

    /// Coverage as formatted string
    var coverageText: String {
        coverage.joined(separator: "、")
    }
}

// MARK: - City Transit Info

struct CityTransitInfo: Codable {
    let city: String
    let cityZh: String
    let hasSubway: Bool
    let hasBus: Bool
    let hasBike: Bool
    let subwayLines: Int?
    let operatingHours: OperatingHours?
    let passes: [TransitPassRecommendation]
    let tips: [String]

    enum CodingKeys: String, CodingKey {
        case city
        case cityZh = "city_zh"
        case hasSubway = "has_subway"
        case hasBus = "has_bus"
        case hasBike = "has_bike"
        case subwayLines = "subway_lines"
        case operatingHours = "operating_hours"
        case passes
        case tips
    }

    /// Get recommended passes
    var recommendedPasses: [TransitPassRecommendation] {
        passes.filter { $0.recommended }
    }
}

struct OperatingHours: Codable {
    let subway: TimeRange?
    let bus: TimeRange?
}

struct TimeRange: Codable {
    let start: String
    let end: String

    var formatted: String {
        "\(start) - \(end)"
    }
}

// MARK: - API Response Wrappers

struct TransportComparisonResponse: Codable {
    let data: TransportComparison
}

struct TransportRouteResponse: Codable {
    let data: TransportRoute
}

struct DrivingRouteResponse: Codable {
    let data: DrivingRouteData
}

struct DrivingRouteData: Codable {
    let driving: TransportRoute?
    let taxi: TransportRoute?
}

struct CityTransitInfoResponse: Codable {
    let data: CityTransitInfo
}

struct TransitPassesResponse: Codable {
    let data: [TransitPassRecommendation]
    let city: String
}

struct TransitTipsResponse: Codable {
    let data: [String]
    let city: String
}

struct BatchTransportResponse: Codable {
    let data: [TransportComparison]
    let count: Int
}

// MARK: - API Request Models

struct TransportCompareRequest: Codable {
    let origin: TransportCoordinate
    let destination: TransportCoordinate
    let originName: String?
    let destinationName: String?
    let city: String?
    let modes: [TransportMode]?

    enum CodingKeys: String, CodingKey {
        case origin
        case destination
        case originName = "originName"
        case destinationName = "destinationName"
        case city
        case modes
    }
}

struct TransportRouteRequest: Codable {
    let origin: TransportCoordinate
    let destination: TransportCoordinate
    let originName: String?
    let destinationName: String?
    let city: String?
    let modes: [TransportMode]?
}

struct BatchTransportRequest: Codable {
    let routes: [TransportRouteRequest]
    let city: String?
}

// MARK: - Helper Functions

/// Format duration in seconds to human-readable string
func formatDuration(seconds: Int) -> String {
    if seconds < 60 {
        return "\(seconds)秒"
    }
    let minutes = seconds / 60
    if minutes < 60 {
        return "\(minutes)分钟"
    }
    let hours = minutes / 60
    let remainingMinutes = minutes % 60
    if remainingMinutes == 0 {
        return "\(hours)小时"
    }
    return "\(hours)小时\(remainingMinutes)分钟"
}

/// Format distance in meters to human-readable string
func formatDistance(meters: Int) -> String {
    if meters < 1000 {
        return "\(meters)米"
    }
    let km = Double(meters) / 1000.0
    return String(format: "%.1f公里", km)
}
