import Foundation

// MARK: - API Error

/// Unified error type for all API operations
enum APIError: LocalizedError {
  case invalidURL
  case invalidResponse
  case unauthorized
  case notFound
  case serverError(Int)
  case httpError(Int)
  case cancelled
  case networkError(Error)
  case unknown

  var errorDescription: String? {
    switch self {
    case .invalidURL:
      return "请求地址无效"
    case .invalidResponse:
      return "服务器响应无效"
    case .unauthorized:
      return "未授权，请重新登录"
    case .notFound:
      return "请求的资源不存在"
    case .serverError(let code):
      return "服务器错误 (\(code))"
    case .httpError(let code):
      return "请求失败 (\(code))"
    case .cancelled:
      return "请求已取消"
    case .networkError(let error):
      return "网络错误: \(error.localizedDescription)"
    case .unknown:
      return "未知错误"
    }
  }

  /// Whether this error is recoverable (can retry)
  var isRecoverable: Bool {
    switch self {
    case .serverError, .networkError:
      return true
    case .invalidURL, .invalidResponse, .unauthorized, .notFound, .cancelled, .httpError, .unknown:
      return false
    }
  }
}

// MARK: - User-Facing Message

extension Error {
  /// Message suitable for display in the UI: network failures get a friendly
  /// localized description instead of raw NSURLError text ("A server with the
  /// specified hostname could not be found."). Keep the raw error in logs.
  var userFacingMessage: String {
    if self is URLError {
      return "error.network_description".localized
    }
    if let apiError = self as? APIError, case .networkError = apiError {
      return "error.network_description".localized
    }
    return localizedDescription
  }
}

// MARK: - Empty Response

/// Empty response type for API calls that don't return data
struct EmptyResponse: Codable {}

/// Empty body for POST requests that don't need a body
struct EmptyBody: Encodable {}
