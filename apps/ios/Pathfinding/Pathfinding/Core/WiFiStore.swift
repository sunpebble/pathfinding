import Foundation
import OSLog

/// Store for managing WiFi spots, credentials, and reviews
@MainActor
@Observable
final class WiFiStore {
    static let shared = WiFiStore()

    private let logger = Logger(subsystem: "org.pathfinding.app", category: "WiFiStore")
    private let apiClient = APIClient.shared

    // MARK: - State

    var spots: [WiFiSpot] = []
    var nearbySpots: [WiFiSpot] = []
    var credentials: [WiFiCredential] = []
    var currentSpotReviews: [WiFiReview] = []
    var isLoading = false
    var error: String?

    // MARK: - WiFi Spots

    /// Fetch WiFi spots with optional filters
    func fetchSpots(cityId: String? = nil, type: WiFiSpotType? = nil, limit: Int? = nil) async {
        isLoading = true
        error = nil

        do {
            spots = try await apiClient.fetchWiFiSpots(cityId: cityId, type: type?.rawValue, limit: limit)
            logger.info("Loaded \(self.spots.count) WiFi spots")
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to fetch WiFi spots: \(error.localizedDescription)")
        }

        isLoading = false
    }

    /// Fetch nearby WiFi spots
    func fetchNearbySpots(
        latitude: Double,
        longitude: Double,
        radiusKm: Double = 5,
        type: WiFiSpotType? = nil,
        limit: Int? = nil
    ) async {
        isLoading = true
        error = nil

        do {
            nearbySpots = try await apiClient.fetchNearbyWiFiSpots(
                latitude: latitude,
                longitude: longitude,
                radiusKm: radiusKm,
                type: type?.rawValue,
                limit: limit
            )
            logger.info("Loaded \(self.nearbySpots.count) nearby WiFi spots")
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to fetch nearby WiFi spots: \(error.localizedDescription)")
        }

        isLoading = false
    }

    /// Search WiFi spots
    func searchSpots(query: String, cityId: String? = nil, type: WiFiSpotType? = nil) async -> [WiFiSpot] {
        do {
            let results = try await apiClient.searchWiFiSpots(
                query: query,
                cityId: cityId,
                type: type?.rawValue
            )
            logger.info("Found \(results.count) WiFi spots for query: \(query)")
            return results
        } catch {
            logger.error("Failed to search WiFi spots: \(error.localizedDescription)")
            return []
        }
    }

    /// Get WiFi spot by ID
    func getSpot(id: String) async -> WiFiSpot? {
        do {
            return try await apiClient.fetchWiFiSpot(id: id)
        } catch {
            logger.error("Failed to fetch WiFi spot: \(error.localizedDescription)")
            return nil
        }
    }

    /// Create a new WiFi spot
    func createSpot(_ request: CreateWiFiSpotRequest) async -> String? {
        do {
            let id = try await apiClient.createWiFiSpot(request)
            logger.info("Created WiFi spot with ID: \(id)")
            return id
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to create WiFi spot: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - WiFi Credentials

    /// Fetch user's saved WiFi credentials
    func fetchCredentials(limit: Int? = nil) async {
        isLoading = true
        error = nil

        do {
            credentials = try await apiClient.fetchWiFiCredentials()
            logger.info("Loaded \(self.credentials.count) WiFi credentials")
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to fetch WiFi credentials: \(error.localizedDescription)")
        }

        isLoading = false
    }

    /// Get credential for a specific spot
    func getCredentialForSpot(spotId: String) async -> WiFiCredential? {
        do {
            return try await apiClient.fetchWiFiCredentialForSpot(spotId: spotId)
        } catch {
            logger.error("Failed to fetch credential for spot: \(error.localizedDescription)")
            return nil
        }
    }

    /// Get shared credentials for a spot (community passwords)
    func getSharedCredentials(spotId: String) async -> [WiFiCredential] {
        do {
            return try await apiClient.fetchSharedWiFiCredentials()
        } catch {
            logger.error("Failed to fetch shared credentials: \(error.localizedDescription)")
            return []
        }
    }

    /// Save a new WiFi credential
    func saveCredential(_ request: CreateWiFiCredentialRequest) async -> String? {
        do {
            let id = try await apiClient.createWiFiCredential(request)
            logger.info("Saved WiFi credential with ID: \(id)")
            // Refresh credentials list
            await fetchCredentials()
            return id
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to save WiFi credential: \(error.localizedDescription)")
            return nil
        }
    }

    /// Delete a WiFi credential
    func deleteCredential(id: String) async -> Bool {
        do {
            try await apiClient.deleteWiFiCredential(id: id)
            credentials.removeAll { $0.id == id }
            logger.info("Deleted WiFi credential: \(id)")
            return true
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to delete WiFi credential: \(error.localizedDescription)")
            return false
        }
    }

    /// Mark credential as recently used
    func markCredentialUsed(id: String) async {
        do {
            try await apiClient.markWiFiCredentialUsed(id: id)
            logger.info("Marked credential as used: \(id)")
        } catch {
            logger.error("Failed to mark credential as used: \(error.localizedDescription)")
        }
    }

    // MARK: - WiFi Reviews

    /// Fetch reviews for a WiFi spot
    func fetchReviews(spotId: String, limit: Int? = nil, offset: Int? = nil) async {
        isLoading = true
        error = nil

        do {
            currentSpotReviews = try await apiClient.fetchWiFiReviews(
                spotId: spotId,
                limit: limit,
                offset: offset
            )
            logger.info("Loaded \(self.currentSpotReviews.count) reviews for spot: \(spotId)")
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to fetch WiFi reviews: \(error.localizedDescription)")
        }

        isLoading = false
    }

    /// Get user's review for a specific spot
    func getUserReview(spotId: String) async -> WiFiReview? {
        do {
            return try await apiClient.fetchUserWiFiReview(spotId: spotId)
        } catch {
            logger.error("Failed to fetch user review: \(error.localizedDescription)")
            return nil
        }
    }

    /// Create or update a review
    func submitReview(_ request: CreateWiFiReviewRequest) async -> String? {
        do {
            let id = try await apiClient.createWiFiReview(request)
            logger.info("Submitted WiFi review with ID: \(id)")
            // Refresh reviews
            await fetchReviews(spotId: request.wifiSpotId)
            return id
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to submit WiFi review: \(error.localizedDescription)")
            return nil
        }
    }

    /// Mark a review as helpful
    func markReviewHelpful(reviewId: String) async -> Bool {
        do {
            try await apiClient.markWiFiReviewHelpful(reviewId: reviewId)
            // Update local state
            if currentSpotReviews.contains(where: { $0.id == reviewId }) {
                // Note: In a real app, we'd update the helpfulCount properly
                logger.info("Marked review as helpful: \(reviewId)")
            }
            return true
        } catch {
            logger.error("Failed to mark review as helpful: \(error.localizedDescription)")
            return false
        }
    }

    /// Delete a review
    func deleteReview(id: String) async -> Bool {
        do {
            try await apiClient.deleteWiFiReview(reviewId: id)
            currentSpotReviews.removeAll { $0.id == id }
            logger.info("Deleted WiFi review: \(id)")
            return true
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to delete WiFi review: \(error.localizedDescription)")
            return false
        }
    }

    // MARK: - Helpers

    /// Clear error state
    func clearError() {
        error = nil
    }
}
