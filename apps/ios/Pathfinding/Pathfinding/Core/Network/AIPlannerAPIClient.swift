import Foundation
import OSLog

/// API client for AI travel planner
actor AIPlannerAPIClient {
    static let shared = AIPlannerAPIClient()

    private let network = NetworkClient.shared
    private let logger = Logger(subsystem: "com.sunpebble.trips", category: "AIPlannerAPI")

    private init() {}

    // MARK: - Start Planning Session

    func startPlanning(
        sessionId: String,
        message: String,
        userId: String?
    ) async throws -> AIPlanStartResponse {
        let url = await network.url(for: "api/agent/plan/start")

        let request = AIPlanStartRequest(
            sessionId: sessionId,
            message: message,
            userId: userId
        )

        logger.info("Starting planning session: \(sessionId)")

        let data = try await network.postWithRetry(url: url, body: request)
        var response = try network.decoder.decode(AIPlanStartResponse.self, from: data)

        // Inject sessionId into plan if it exists
        if var plan = response.plan {
            plan.sessionId = sessionId
            response.plan = plan
        }

        return response
    }

    // MARK: - Submit Feedback

    func submitFeedback(
        sessionId: String,
        feedback: String
    ) async throws -> AIPlanFeedbackResponse {
        let url = await network.url(for: "api/agent/plan/\(sessionId)/feedback")

        let request = AIPlanFeedbackRequest(feedback: feedback)

        logger.info("Submitting feedback for session: \(sessionId)")

        let data = try await network.postWithRetry(url: url, body: request)
        var response = try network.decoder.decode(AIPlanFeedbackResponse.self, from: data)

        // Inject sessionId into plan if it exists
        if var plan = response.plan {
            plan.sessionId = sessionId
            response.plan = plan
        }

        return response
    }

    // MARK: - Get Session Status

    func getStatus(sessionId: String) async throws -> AIPlanStatusResponse {
        let url = await network.url(for: "api/agent/plan/\(sessionId)/status")

        logger.debug("Getting status for session: \(sessionId)")

        let data = try await network.fetchWithRetry(url: url)
        return try network.decoder.decode(AIPlanStatusResponse.self, from: data)
    }

    // MARK: - Get Final Result

    func getResult(sessionId: String) async throws -> AIPlanResultResponse {
        let url = await network.url(for: "api/agent/plan/\(sessionId)/result")

        logger.info("Getting result for session: \(sessionId)")

        let data = try await network.fetchWithRetry(url: url)
        var response = try network.decoder.decode(AIPlanResultResponse.self, from: data)

        // Inject sessionId into plan
        var plan = response.plan
        plan.sessionId = sessionId
        response.plan = plan

        return response
    }
}

// MARK: - Decoder Extension

extension AIPlannerAPIClient {
    /// Custom decoder for handling nested plan JSON
    private var planDecoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}
