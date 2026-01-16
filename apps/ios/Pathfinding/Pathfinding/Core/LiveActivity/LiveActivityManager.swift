@preconcurrency import ActivityKit
import Foundation

/// Manager for handling Live Activities in the Pathfinding app
/// Supports flight tracking, itinerary progress, and navigation activities
@MainActor
@Observable
final class LiveActivityManager {
    // MARK: - Singleton

    static let shared = LiveActivityManager()

    // MARK: - Properties

    /// Currently active flight activity
    private(set) var currentFlightActivity: ActivityKit.Activity<FlightLiveActivityAttributes>?

    /// Currently active itinerary activity
    private(set) var currentItineraryActivity: ActivityKit.Activity<ItineraryLiveActivityAttributes>?

    /// Currently active navigation activity
    private(set) var currentNavigationActivity: ActivityKit.Activity<NavigationLiveActivityAttributes>?

    /// Whether Live Activities are supported on this device
    var isSupported: Bool {
        ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // MARK: - Initialization

    private init() {}

    // MARK: - Flight Live Activity

    /// Start a flight tracking Live Activity
    /// - Parameters:
    ///   - flightNumber: The flight number (e.g., "CA1234")
    ///   - airline: The airline name
    ///   - departureAirport: Departure airport code
    ///   - departureCity: Departure city name
    ///   - arrivalAirport: Arrival airport code
    ///   - arrivalCity: Arrival city name
    ///   - scheduledDeparture: Scheduled departure time (Unix timestamp in ms)
    ///   - scheduledArrival: Scheduled arrival time (Unix timestamp in ms)
    ///   - status: Initial flight status
    ///   - statusColor: Status color name
    /// - Returns: The created activity, or nil if creation failed
    @discardableResult
    func startFlightActivity(
        flightNumber: String,
        airline: String,
        departureAirport: String,
        departureCity: String,
        arrivalAirport: String,
        arrivalCity: String,
        scheduledDeparture: Int64,
        scheduledArrival: Int64,
        status: String = "Scheduled",
        statusColor: String = "blue"
    ) async throws -> ActivityKit.Activity<FlightLiveActivityAttributes>? {
        guard isSupported else {
            print("[LiveActivity] Live Activities not supported on this device")
            return nil
        }

        // End any existing flight activity
        await endFlightActivity()

        let attributes = FlightLiveActivityAttributes(
            flightNumber: flightNumber,
            airline: airline,
            departureAirport: departureAirport,
            departureCity: departureCity,
            arrivalAirport: arrivalAirport,
            arrivalCity: arrivalCity,
            scheduledDeparture: scheduledDeparture,
            scheduledArrival: scheduledArrival
        )

        let initialState = FlightLiveActivityAttributes.ContentState(
            status: status,
            statusColor: statusColor,
            departureGate: nil,
            arrivalGate: nil,
            estimatedDeparture: nil,
            estimatedArrival: nil,
            delayMinutes: nil,
            progress: 0.0,
            lastUpdated: Int64(Date().timeIntervalSince1970 * 1000)
        )

        do {
            let activity = try ActivityKit.Activity<FlightLiveActivityAttributes>.request(
                attributes: attributes,
                content: ActivityContent(state: initialState, staleDate: nil),
                pushType: nil
            )
            currentFlightActivity = activity
            print("[LiveActivity] Started flight activity: \(flightNumber)")
            return activity
        } catch {
            print("[LiveActivity] Failed to start flight activity: \(error)")
            throw error
        }
    }

    /// Update the current flight Live Activity
    /// - Parameters:
    ///   - status: Updated flight status
    ///   - statusColor: Status color name
    ///   - departureGate: Departure gate (if known)
    ///   - arrivalGate: Arrival gate (if known)
    ///   - estimatedDeparture: Estimated departure time
    ///   - estimatedArrival: Estimated arrival time
    ///   - delayMinutes: Delay in minutes
    ///   - progress: Flight progress (0.0 to 1.0)
    func updateFlightActivity(
        status: String,
        statusColor: String,
        departureGate: String? = nil,
        arrivalGate: String? = nil,
        estimatedDeparture: Int64? = nil,
        estimatedArrival: Int64? = nil,
        delayMinutes: Int? = nil,
        progress: Double
    ) async {
        guard let activity = currentFlightActivity else { return }

        let updatedState = FlightLiveActivityAttributes.ContentState(
            status: status,
            statusColor: statusColor,
            departureGate: departureGate,
            arrivalGate: arrivalGate,
            estimatedDeparture: estimatedDeparture,
            estimatedArrival: estimatedArrival,
            delayMinutes: delayMinutes,
            progress: progress,
            lastUpdated: Int64(Date().timeIntervalSince1970 * 1000)
        )

        await activity.update(
            ActivityContent(state: updatedState, staleDate: nil)
        )
        print("[LiveActivity] Updated flight activity with status: \(status)")
    }

    /// End the current flight Live Activity
    func endFlightActivity() async {
        guard let activity = currentFlightActivity else { return }

        let finalState = FlightLiveActivityAttributes.ContentState(
            status: "Completed",
            statusColor: "gray",
            departureGate: nil,
            arrivalGate: nil,
            estimatedDeparture: nil,
            estimatedArrival: nil,
            delayMinutes: nil,
            progress: 1.0,
            lastUpdated: Int64(Date().timeIntervalSince1970 * 1000)
        )

        let activityToEnd = activity
        currentFlightActivity = nil
        await activityToEnd.end(
            ActivityContent(state: finalState, staleDate: nil),
            dismissalPolicy: .default
        )
        print("[LiveActivity] Ended flight activity")
    }

    // MARK: - Itinerary Live Activity

    /// Start an itinerary progress Live Activity
    /// - Parameters:
    ///   - itineraryId: The itinerary ID
    ///   - itineraryTitle: The itinerary title
    ///   - dayNumber: Current day number
    ///   - dayTheme: Theme for the day (optional)
    ///   - cityName: City name
    ///   - dateFormatted: Formatted date string
    ///   - currentPoiName: Current POI name
    ///   - currentPoiCategory: Current POI category
    ///   - totalItems: Total items for the day
    /// - Returns: The created activity, or nil if creation failed
    @discardableResult
    func startItineraryActivity(
        itineraryId: String,
        itineraryTitle: String,
        dayNumber: Int,
        dayTheme: String? = nil,
        cityName: String,
        dateFormatted: String,
        currentPoiName: String,
        currentPoiCategory: String? = nil,
        totalItems: Int
    ) async throws -> ActivityKit.Activity<ItineraryLiveActivityAttributes>? {
        guard isSupported else {
            print("[LiveActivity] Live Activities not supported on this device")
            return nil
        }

        // End any existing itinerary activity
        await endItineraryActivity()

        let attributes = ItineraryLiveActivityAttributes(
            itineraryId: itineraryId,
            itineraryTitle: itineraryTitle,
            dayNumber: dayNumber,
            dayTheme: dayTheme,
            cityName: cityName,
            dateFormatted: dateFormatted
        )

        let initialState = ItineraryLiveActivityAttributes.ContentState(
            currentPoiName: currentPoiName,
            currentPoiCategory: currentPoiCategory,
            nextPoiName: nil,
            nextPoiCategory: nil,
            timeToNextPoi: nil,
            currentItemIndex: 1,
            totalItems: totalItems,
            progress: 1.0 / Double(totalItems),
            isInTransit: false,
            transitMode: nil,
            etaMinutes: nil
        )

        do {
            let activity = try ActivityKit.Activity<ItineraryLiveActivityAttributes>.request(
                attributes: attributes,
                content: ActivityContent(state: initialState, staleDate: nil),
                pushType: nil
            )
            currentItineraryActivity = activity
            print("[LiveActivity] Started itinerary activity: \(itineraryTitle)")
            return activity
        } catch {
            print("[LiveActivity] Failed to start itinerary activity: \(error)")
            throw error
        }
    }

    /// Update the current itinerary Live Activity
    /// - Parameters:
    ///   - currentPoiName: Current POI name
    ///   - currentPoiCategory: Current POI category
    ///   - nextPoiName: Next POI name
    ///   - nextPoiCategory: Next POI category
    ///   - timeToNextPoi: Formatted time to next POI
    ///   - currentItemIndex: Current item index (1-based)
    ///   - totalItems: Total items for the day
    ///   - isInTransit: Whether user is in transit
    ///   - transitMode: Transit mode if in transit
    ///   - etaMinutes: ETA in minutes if in transit
    func updateItineraryActivity(
        currentPoiName: String,
        currentPoiCategory: String? = nil,
        nextPoiName: String? = nil,
        nextPoiCategory: String? = nil,
        timeToNextPoi: String? = nil,
        currentItemIndex: Int,
        totalItems: Int,
        isInTransit: Bool = false,
        transitMode: String? = nil,
        etaMinutes: Int? = nil
    ) async {
        guard let activity = currentItineraryActivity else { return }

        let progress = Double(currentItemIndex) / Double(totalItems)

        let updatedState = ItineraryLiveActivityAttributes.ContentState(
            currentPoiName: currentPoiName,
            currentPoiCategory: currentPoiCategory,
            nextPoiName: nextPoiName,
            nextPoiCategory: nextPoiCategory,
            timeToNextPoi: timeToNextPoi,
            currentItemIndex: currentItemIndex,
            totalItems: totalItems,
            progress: progress,
            isInTransit: isInTransit,
            transitMode: transitMode,
            etaMinutes: etaMinutes
        )

        await activity.update(
            ActivityContent(state: updatedState, staleDate: nil)
        )
        print("[LiveActivity] Updated itinerary activity: \(currentItemIndex)/\(totalItems)")
    }

    /// End the current itinerary Live Activity
    func endItineraryActivity() async {
        guard let activity = currentItineraryActivity else { return }

        let finalState = ItineraryLiveActivityAttributes.ContentState(
            currentPoiName: "Day Completed",
            currentPoiCategory: nil,
            nextPoiName: nil,
            nextPoiCategory: nil,
            timeToNextPoi: nil,
            currentItemIndex: 0,
            totalItems: 0,
            progress: 1.0,
            isInTransit: false,
            transitMode: nil,
            etaMinutes: nil
        )

        let activityToEnd = activity
        currentItineraryActivity = nil
        await activityToEnd.end(
            ActivityContent(state: finalState, staleDate: nil),
            dismissalPolicy: .default
        )
        print("[LiveActivity] Ended itinerary activity")
    }

    // MARK: - Navigation Live Activity

    /// Start a navigation Live Activity
    /// - Parameters:
    ///   - destinationName: Destination name
    ///   - destinationAddress: Destination address
    ///   - originName: Origin name
    ///   - transportMode: Transport mode (walking, driving, etc.)
    ///   - currentInstruction: Initial instruction
    ///   - distanceToDestination: Total distance formatted
    ///   - timeToDestination: Total time formatted
    ///   - eta: ETA formatted
    /// - Returns: The created activity, or nil if creation failed
    @discardableResult
    func startNavigationActivity(
        destinationName: String,
        destinationAddress: String? = nil,
        originName: String,
        transportMode: String,
        currentInstruction: String,
        distanceToDestination: String,
        timeToDestination: String,
        eta: String
    ) async throws -> ActivityKit.Activity<NavigationLiveActivityAttributes>? {
        guard isSupported else {
            print("[LiveActivity] Live Activities not supported on this device")
            return nil
        }

        // End any existing navigation activity
        await endNavigationActivity()

        let transportModeIcon = transportIcon(for: transportMode)

        let attributes = NavigationLiveActivityAttributes(
            destinationName: destinationName,
            destinationAddress: destinationAddress,
            originName: originName,
            transportMode: transportMode,
            transportModeIcon: transportModeIcon
        )

        let initialState = NavigationLiveActivityAttributes.ContentState(
            currentInstruction: currentInstruction,
            distanceToNextManeuver: distanceToDestination,
            timeToDestination: timeToDestination,
            distanceToDestination: distanceToDestination,
            currentSpeed: nil,
            eta: eta,
            progress: 0.0,
            nextManeuverIcon: NavigationManeuver.icon(for: currentInstruction),
            trafficCondition: nil,
            currentStepIndex: 1,
            totalSteps: 1
        )

        do {
            let activity = try ActivityKit.Activity<NavigationLiveActivityAttributes>.request(
                attributes: attributes,
                content: ActivityContent(state: initialState, staleDate: nil),
                pushType: nil
            )
            currentNavigationActivity = activity
            print("[LiveActivity] Started navigation activity to: \(destinationName)")
            return activity
        } catch {
            print("[LiveActivity] Failed to start navigation activity: \(error)")
            throw error
        }
    }

    /// Update the current navigation Live Activity
    /// - Parameters:
    ///   - currentInstruction: Current navigation instruction
    ///   - distanceToNextManeuver: Distance to next turn/maneuver
    ///   - timeToDestination: Remaining time formatted
    ///   - distanceToDestination: Remaining distance formatted
    ///   - currentSpeed: Current speed in km/h
    ///   - eta: Updated ETA
    ///   - progress: Navigation progress (0.0 to 1.0)
    ///   - trafficCondition: Traffic condition
    ///   - currentStepIndex: Current step index
    ///   - totalSteps: Total navigation steps
    func updateNavigationActivity(
        currentInstruction: String,
        distanceToNextManeuver: String,
        timeToDestination: String,
        distanceToDestination: String,
        currentSpeed: Int? = nil,
        eta: String,
        progress: Double,
        trafficCondition: String? = nil,
        currentStepIndex: Int,
        totalSteps: Int
    ) async {
        guard let activity = currentNavigationActivity else { return }

        let updatedState = NavigationLiveActivityAttributes.ContentState(
            currentInstruction: currentInstruction,
            distanceToNextManeuver: distanceToNextManeuver,
            timeToDestination: timeToDestination,
            distanceToDestination: distanceToDestination,
            currentSpeed: currentSpeed,
            eta: eta,
            progress: progress,
            nextManeuverIcon: NavigationManeuver.icon(for: currentInstruction),
            trafficCondition: trafficCondition,
            currentStepIndex: currentStepIndex,
            totalSteps: totalSteps
        )

        await activity.update(
            ActivityContent(state: updatedState, staleDate: nil)
        )
        print("[LiveActivity] Updated navigation activity: \(currentInstruction)")
    }

    /// End the current navigation Live Activity
    func endNavigationActivity() async {
        guard let activity = currentNavigationActivity else { return }

        let finalState = NavigationLiveActivityAttributes.ContentState(
            currentInstruction: "Arrived",
            distanceToNextManeuver: "0 m",
            timeToDestination: "0 min",
            distanceToDestination: "0 m",
            currentSpeed: nil,
            eta: "--:--",
            progress: 1.0,
            nextManeuverIcon: NavigationManeuver.arrive.rawValue,
            trafficCondition: nil,
            currentStepIndex: 0,
            totalSteps: 0
        )

        let activityToEnd = activity
        currentNavigationActivity = nil
        await activityToEnd.end(
            ActivityContent(state: finalState, staleDate: nil),
            dismissalPolicy: .default
        )
        print("[LiveActivity] Ended navigation activity")
    }

    // MARK: - End All Activities

    /// End all active Live Activities
    func endAllActivities() async {
        await endFlightActivity()
        await endItineraryActivity()
        await endNavigationActivity()
        print("[LiveActivity] Ended all activities")
    }

    // MARK: - Helpers

    private func transportIcon(for mode: String) -> String {
        switch mode.lowercased() {
        case "walking": return "figure.walk"
        case "cycling": return "bicycle"
        case "driving": return "car.fill"
        case "taxi": return "car.fill"
        case "bus": return "bus.fill"
        case "subway", "metro": return "tram.fill"
        case "transit": return "tram.fill"
        default: return "location.fill"
        }
    }
}

// MARK: - Convenience Extensions

extension LiveActivityManager {
    /// Start a flight activity from a FlightInfo object
    @discardableResult
    func startFlightActivity(from flight: FlightInfo) async throws -> ActivityKit.Activity<FlightLiveActivityAttributes>? {
        try await startFlightActivity(
            flightNumber: flight.flightNumber,
            airline: flight.airline,
            departureAirport: flight.departureAirport,
            departureCity: flight.departureCity ?? flight.departureAirport,
            arrivalAirport: flight.arrivalAirport,
            arrivalCity: flight.arrivalCity ?? flight.arrivalAirport,
            scheduledDeparture: flight.scheduledDeparture,
            scheduledArrival: flight.scheduledArrival,
            status: flight.status.displayName,
            statusColor: flight.status.color
        )
    }

    /// Update flight activity from a FlightInfo object
    func updateFlightActivity(from flight: FlightInfo) async {
        await updateFlightActivity(
            status: flight.status.displayName,
            statusColor: flight.status.color,
            departureGate: flight.departureGate,
            arrivalGate: flight.arrivalGate,
            estimatedDeparture: flight.estimatedDeparture,
            estimatedArrival: flight.estimatedArrival,
            delayMinutes: flight.delayMinutes,
            progress: calculateFlightProgress(flight)
        )
    }

    private func calculateFlightProgress(_ flight: FlightInfo) -> Double {
        switch flight.status {
        case .scheduled, .delayed:
            return 0.0
        case .boarding:
            return 0.1
        case .departed:
            return 0.2
        case .inAir:
            // Calculate based on time
            let now = Date().timeIntervalSince1970 * 1000
            let departure = Double(flight.actualDeparture ?? flight.scheduledDeparture)
            let arrival = Double(flight.estimatedArrival ?? flight.scheduledArrival)
            let total = arrival - departure
            let elapsed = now - departure
            if total > 0 {
                return min(max(0.2 + (elapsed / total) * 0.7, 0.2), 0.9)
            }
            return 0.5
        case .landed:
            return 0.95
        case .arrived:
            return 1.0
        case .cancelled, .diverted:
            return 0.0
        }
    }
}
