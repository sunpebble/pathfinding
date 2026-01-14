import ActivityKit
import Foundation

// MARK: - Flight Live Activity

/// Attributes for flight status Live Activity
struct FlightLiveActivityAttributes: ActivityAttributes {
    /// Static content that doesn't change during the activity
    public struct ContentState: Codable, Hashable {
        /// Current flight status
        var status: String
        /// Status color name (blue, green, orange, red, etc.)
        var statusColor: String
        /// Departure gate (can change)
        var departureGate: String?
        /// Arrival gate (can change)
        var arrivalGate: String?
        /// Estimated departure time (Unix timestamp in ms)
        var estimatedDeparture: Int64?
        /// Estimated arrival time (Unix timestamp in ms)
        var estimatedArrival: Int64?
        /// Delay minutes (if any)
        var delayMinutes: Int?
        /// Progress percentage (0.0 to 1.0)
        var progress: Double
        /// Last updated timestamp
        var lastUpdated: Int64
    }

    /// Flight number (e.g., "CA1234")
    var flightNumber: String
    /// Airline name
    var airline: String
    /// Departure airport code (e.g., "PEK")
    var departureAirport: String
    /// Departure city
    var departureCity: String
    /// Arrival airport code (e.g., "SHA")
    var arrivalAirport: String
    /// Arrival city
    var arrivalCity: String
    /// Scheduled departure time (Unix timestamp in ms)
    var scheduledDeparture: Int64
    /// Scheduled arrival time (Unix timestamp in ms)
    var scheduledArrival: Int64
}

// MARK: - Itinerary Progress Live Activity

/// Attributes for itinerary progress Live Activity
struct ItineraryLiveActivityAttributes: ActivityAttributes {
    /// Dynamic content that updates during the activity
    public struct ContentState: Codable, Hashable {
        /// Current POI name
        var currentPoiName: String
        /// Current POI category/type
        var currentPoiCategory: String?
        /// Next POI name (if any)
        var nextPoiName: String?
        /// Next POI category (if any)
        var nextPoiCategory: String?
        /// Time until next POI (formatted string)
        var timeToNextPoi: String?
        /// Current item index (1-based)
        var currentItemIndex: Int
        /// Total items for the day
        var totalItems: Int
        /// Progress percentage (0.0 to 1.0)
        var progress: Double
        /// Whether currently at a POI or in transit
        var isInTransit: Bool
        /// Transit mode if in transit
        var transitMode: String?
        /// ETA to next destination
        var etaMinutes: Int?
    }

    /// Itinerary ID
    var itineraryId: String
    /// Itinerary title
    var itineraryTitle: String
    /// Current day number
    var dayNumber: Int
    /// Day theme (if any)
    var dayTheme: String?
    /// City name
    var cityName: String
    /// Today's date formatted
    var dateFormatted: String
}

// MARK: - Navigation Live Activity

/// Attributes for navigation Live Activity
struct NavigationLiveActivityAttributes: ActivityAttributes {
    /// Dynamic content that updates during navigation
    public struct ContentState: Codable, Hashable {
        /// Current instruction (e.g., "Turn left onto Main Street")
        var currentInstruction: String
        /// Distance to next maneuver (formatted string)
        var distanceToNextManeuver: String
        /// Time to destination (formatted string)
        var timeToDestination: String
        /// Distance to destination (formatted string)
        var distanceToDestination: String
        /// Current speed (km/h)
        var currentSpeed: Int?
        /// ETA (formatted time string)
        var eta: String
        /// Progress percentage (0.0 to 1.0)
        var progress: Double
        /// Next maneuver icon name
        var nextManeuverIcon: String
        /// Traffic condition (smooth, slow, congested)
        var trafficCondition: String?
        /// Current step index
        var currentStepIndex: Int
        /// Total steps
        var totalSteps: Int
    }

    /// Destination name
    var destinationName: String
    /// Destination address
    var destinationAddress: String?
    /// Origin name
    var originName: String
    /// Transport mode (walking, driving, transit, etc.)
    var transportMode: String
    /// Transport mode icon name
    var transportModeIcon: String
}

// MARK: - Activity Type Identifier

/// Identifiers for different Live Activity types
enum LiveActivityType: String {
    case flight = "FlightLiveActivity"
    case itinerary = "ItineraryLiveActivity"
    case navigation = "NavigationLiveActivity"
}
