import Foundation
import OSLog

/// Store for managing transport planning state
@MainActor
@Observable
final class TransportStore {
    // MARK: - Singleton

    static let shared = TransportStore()

    // MARK: - Properties

    private let apiClient = APIClient.shared
    private let logger = Logger(subsystem: "org.pathfinding.app", category: "TransportStore")

    // Route comparison state
    var currentComparison: TransportComparison?
    var selectedRoute: TransportRoute?
    var isLoadingComparison = false
    var comparisonError: String?

    // City transit info state
    var cityTransitInfo: CityTransitInfo?
    var isLoadingCityInfo = false
    var cityInfoError: String?

    // Transit passes state
    var transitPasses: [TransitPassRecommendation] = []
    var isLoadingPasses = false
    var passesError: String?

    // Transit tips state
    var transitTips: [String] = []
    var isLoadingTips = false
    var tipsError: String?

    // Batch comparison state
    var batchComparisons: [TransportComparison] = []
    var isLoadingBatch = false
    var batchError: String?

    // Current city for transit queries
    var currentCity: String?

    // MARK: - Initialization

    private init() {}

    // MARK: - Route Comparison

    /// Compare transport routes between two points
    func compareRoutes(
        origin: TransportCoordinate,
        destination: TransportCoordinate,
        originName: String? = nil,
        destinationName: String? = nil,
        city: String? = nil,
        modes: [TransportMode]? = nil
    ) async {
        isLoadingComparison = true
        comparisonError = nil
        selectedRoute = nil

        do {
            let comparison = try await apiClient.compareTransportRoutes(
                origin: origin,
                destination: destination,
                originName: originName,
                destinationName: destinationName,
                city: city ?? currentCity,
                modes: modes
            )

            currentComparison = comparison

            // Auto-select recommended route
            if let recommended = comparison.recommendedRoute {
                selectedRoute = recommended
            } else if let first = comparison.routes.first {
                selectedRoute = first
            }

            logger.info("Loaded \(comparison.routes.count) transport routes")
        } catch {
            logger.error("Failed to compare routes: \(error.localizedDescription)")
            comparisonError = error.localizedDescription
        }

        isLoadingComparison = false
    }

    /// Get walking route only
    func getWalkingRoute(
        origin: TransportCoordinate,
        destination: TransportCoordinate
    ) async -> TransportRoute? {
        do {
            let route = try await apiClient.getWalkingRoute(origin: origin, destination: destination)
            return route
        } catch {
            logger.error("Failed to get walking route: \(error.localizedDescription)")
            return nil
        }
    }

    /// Get cycling route only
    func getCyclingRoute(
        origin: TransportCoordinate,
        destination: TransportCoordinate
    ) async -> TransportRoute? {
        do {
            let route = try await apiClient.getCyclingRoute(origin: origin, destination: destination)
            return route
        } catch {
            logger.error("Failed to get cycling route: \(error.localizedDescription)")
            return nil
        }
    }

    /// Get driving route with taxi estimate
    func getDrivingRoute(
        origin: TransportCoordinate,
        destination: TransportCoordinate,
        city: String? = nil
    ) async -> DrivingRouteData? {
        do {
            let data = try await apiClient.getDrivingRoute(
                origin: origin,
                destination: destination,
                city: city ?? currentCity
            )
            return data
        } catch {
            logger.error("Failed to get driving route: \(error.localizedDescription)")
            return nil
        }
    }

    /// Get public transit route
    func getTransitRoute(
        origin: TransportCoordinate,
        destination: TransportCoordinate,
        city: String
    ) async -> TransportRoute? {
        do {
            let route = try await apiClient.getTransitRoute(
                origin: origin,
                destination: destination,
                city: city
            )
            return route
        } catch {
            logger.error("Failed to get transit route: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - City Transit Info

    /// Load city transit information
    func loadCityTransitInfo(cityName: String) async {
        isLoadingCityInfo = true
        cityInfoError = nil
        currentCity = cityName

        do {
            let info = try await apiClient.getCityTransitInfo(cityName: cityName)
            cityTransitInfo = info
            logger.info("Loaded transit info for \(cityName)")
        } catch {
            logger.error("Failed to load city transit info: \(error.localizedDescription)")
            cityInfoError = error.localizedDescription
        }

        isLoadingCityInfo = false
    }

    /// Load transit passes for a city
    func loadTransitPasses(cityName: String) async {
        isLoadingPasses = true
        passesError = nil

        do {
            let passes = try await apiClient.getTransitPasses(cityName: cityName)
            transitPasses = passes
            logger.info("Loaded \(passes.count) transit passes for \(cityName)")
        } catch {
            logger.error("Failed to load transit passes: \(error.localizedDescription)")
            passesError = error.localizedDescription
        }

        isLoadingPasses = false
    }

    /// Load transit tips for a city
    func loadTransitTips(cityName: String) async {
        isLoadingTips = true
        tipsError = nil

        do {
            let tips = try await apiClient.getTransitTips(cityName: cityName)
            transitTips = tips
            logger.info("Loaded \(tips.count) transit tips for \(cityName)")
        } catch {
            logger.error("Failed to load transit tips: \(error.localizedDescription)")
            tipsError = error.localizedDescription
        }

        isLoadingTips = false
    }

    /// Load all city transit data (info, passes, tips)
    func loadAllCityData(cityName: String) async {
        currentCity = cityName

        // Load all data in parallel
        async let infoTask: () = loadCityTransitInfo(cityName: cityName)
        async let passesTask: () = loadTransitPasses(cityName: cityName)
        async let tipsTask: () = loadTransitTips(cityName: cityName)

        _ = await (infoTask, passesTask, tipsTask)
    }

    // MARK: - Batch Comparison

    /// Compare routes for multiple origin-destination pairs
    func batchCompareRoutes(
        routes: [TransportRouteRequest],
        city: String? = nil
    ) async {
        isLoadingBatch = true
        batchError = nil

        do {
            let comparisons = try await apiClient.batchCompareTransportRoutes(
                routes: routes,
                city: city ?? currentCity
            )
            batchComparisons = comparisons
            logger.info("Loaded \(comparisons.count) batch comparisons")
        } catch {
            logger.error("Failed to batch compare routes: \(error.localizedDescription)")
            batchError = error.localizedDescription
        }

        isLoadingBatch = false
    }

    // MARK: - Selection

    /// Select a transport route
    func selectRoute(_ route: TransportRoute) {
        selectedRoute = route
        logger.debug("Selected route: \(route.mode.rawValue)")
    }

    /// Select route by mode
    func selectRouteByMode(_ mode: TransportMode) {
        guard let comparison = currentComparison else { return }
        if let route = comparison.routes.first(where: { $0.mode == mode }) {
            selectedRoute = route
            logger.debug("Selected route by mode: \(mode.rawValue)")
        }
    }

    // MARK: - Helpers

    /// Clear all state
    func clearAll() {
        currentComparison = nil
        selectedRoute = nil
        isLoadingComparison = false
        comparisonError = nil

        cityTransitInfo = nil
        isLoadingCityInfo = false
        cityInfoError = nil

        transitPasses = []
        isLoadingPasses = false
        passesError = nil

        transitTips = []
        isLoadingTips = false
        tipsError = nil

        batchComparisons = []
        isLoadingBatch = false
        batchError = nil

        currentCity = nil

        logger.info("Transport store cleared")
    }

    /// Clear route comparison state only
    func clearComparison() {
        currentComparison = nil
        selectedRoute = nil
        comparisonError = nil
    }

    /// Check if any data is loading
    var isLoading: Bool {
        isLoadingComparison || isLoadingCityInfo || isLoadingPasses || isLoadingTips || isLoadingBatch
    }

    /// Check if there are any errors
    var hasError: Bool {
        comparisonError != nil || cityInfoError != nil || passesError != nil || tipsError != nil || batchError != nil
    }

    /// Get all error messages
    var allErrors: [String] {
        [comparisonError, cityInfoError, passesError, tipsError, batchError].compactMap { $0 }
    }
}
