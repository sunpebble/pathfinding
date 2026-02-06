import Foundation
import OSLog

/// API client for PDF export operations
actor PDFAPIClient {
  static let shared = PDFAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { network.decoder }
  private var aiServiceURL: URL { network.aiServiceURL }
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "PDFAPIClient")

  private init() {}

  // MARK: - PDF Export APIs

  /// Fetch available PDF templates
  func fetchPdfTemplates(language: String = "zh") async throws -> [String: PdfTemplate] {
    var components = URLComponents(
      url: aiServiceURL.appendingPathComponent("api/pdf/templates"),
      resolvingAgainstBaseURL: false
    )!

    components.queryItems = [
      URLQueryItem(name: "lang", value: language)
    ]

    guard let url = components.url else {
      throw APIError.invalidURL
    }

    let data = try await network.fetchWithRetry(url: url)
    let result = try decoder.decode(PdfTemplatesResponse.self, from: data)
    return result.data
  }

  /// Get PDF preview info for a guide
  func fetchGuidePdfPreview(guideId: String) async throws -> PdfPreviewInfo {
    let url = aiServiceURL.appendingPathComponent("api/pdf/guide/\(guideId)/preview")

    let body = EmptyBody()
    let data = try await network.postWithRetry(url: url, body: body)
    let result = try decoder.decode(PdfPreviewResponse.self, from: data)
    return result.data
  }

  /// Generate PDF for a guide and return the file URL
  func generateGuidePdf(
    guideId: String,
    options: PdfExportOptions
  ) async throws -> URL {
    let url = aiServiceURL.appendingPathComponent("api/pdf/guide/\(guideId)")

    logger.info("Generating PDF for guide \(guideId)")

    var request = await network.createRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(options)

    let (data, response) = try await network.session.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }

    guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      if httpResponse.statusCode == 401 {
        throw APIError.unauthorized
      } else if httpResponse.statusCode == 404 {
        throw APIError.notFound
      } else {
        throw APIError.httpError(httpResponse.statusCode)
      }
    }

    // Extract filename from Content-Disposition header
    let contentDisposition = httpResponse.value(forHTTPHeaderField: "Content-Disposition") ?? ""
    let filenameMatch = contentDisposition.range(of: "filename=\"([^\"]+)\"", options: .regularExpression)
    let filename: String
    if let match = filenameMatch {
      let extracted = String(contentDisposition[match])
        .replacingOccurrences(of: "filename=\"", with: "")
        .replacingOccurrences(of: "\"", with: "")
      filename = extracted.removingPercentEncoding ?? extracted
    } else {
      filename = "itinerary-\(guideId).pdf"
    }

    // Save to temporary directory
    let tempDir = FileManager.default.temporaryDirectory
    let fileURL = tempDir.appendingPathComponent(filename)

    try data.write(to: fileURL)
    logger.info("PDF saved to \(fileURL.path)")

    return fileURL
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Fetch available PDF templates
  func fetchPdfTemplates(language: String = "zh") async throws -> [String: PdfTemplate] {
    try await PDFAPIClient.shared.fetchPdfTemplates(language: language)
  }

  /// Get PDF preview info for a guide
  func fetchGuidePdfPreview(guideId: String) async throws -> PdfPreviewInfo {
    try await PDFAPIClient.shared.fetchGuidePdfPreview(guideId: guideId)
  }

  /// Generate PDF for a guide and return the file URL
  func generateGuidePdf(
    guideId: String,
    options: PdfExportOptions
  ) async throws -> URL {
    try await PDFAPIClient.shared.generateGuidePdf(guideId: guideId, options: options)
  }
}
