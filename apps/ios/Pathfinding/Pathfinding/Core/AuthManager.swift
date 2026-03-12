import Foundation
import os
import OSLog
import Security

/// Authentication manager for API auth integration
/// Handles sign in, sign up, session management, and secure token storage
actor AuthManager {
  static let shared = AuthManager()

  nonisolated static func resetPersistedSessionForTesting() {
    let keychainService = "org.pathfinding.app"
    let keys = [
      "auth.accessToken",
      "auth.refreshToken",
      "auth.userId",
      "auth.userEmail",
    ]

    for key in keys {
      let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: keychainService,
        kSecAttrAccount as String: key,
      ]
      SecItemDelete(query as CFDictionary)
    }

    _cachedUserIdLock.withLock { $0 = nil }
  }

  private let apiBaseURL: URL
  private let session: URLSession
  private let decoder: JSONDecoder
  private let encoder: JSONEncoder
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "AuthManager")

  // Keychain keys
  private let keychainService = "org.pathfinding.app"
  private let accessTokenKey = "auth.accessToken"
  private let refreshTokenKey = "auth.refreshToken"
  private let userIdKey = "auth.userId"
  private let userEmailKey = "auth.userEmail"

  // Session state
  private(set) var accessToken: String?
  private(set) var refreshToken: String?
  private(set) var userId: String?
  private(set) var userEmail: String?
  private(set) var isAuthenticated: Bool = false
  private var sessionLoaded: Bool = false

  /// Synchronous access to current user ID (cached value).
  /// Uses `OSAllocatedUnfairLock` for thread-safe access without data races.
  nonisolated var currentUserId: String? {
    Self._cachedUserIdLock.withLock { $0 }
  }

  /// Thread-safe cached user ID storage using os_unfair_lock wrapper
  private nonisolated static let _cachedUserIdLock = OSAllocatedUnfairLock<String?>(initialState: nil)

  init(apiBaseURL: String? = nil) {
    let apiBaseUrlString = apiBaseURL ?? AppConfig.apiBaseURL
    self.apiBaseURL = URL(string: apiBaseUrlString)!

    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = AppConfig.networkTimeoutRequest
    config.timeoutIntervalForResource = AppConfig.networkTimeoutResource
    self.session = URLSession(configuration: config)

    self.decoder = JSONDecoder()
    self.encoder = JSONEncoder()

    // Load stored tokens on initialization
    Task {
      await loadStoredSession()
    }
  }

  // MARK: - Authentication Methods

  /// Sign in with email and password
  func signIn(email: String, password: String) async throws {
    let request = try makeEmailSignInRequest(email: email, password: password)

    logger.info("Signing in with email: \(email)")

    let response = try await performAuthRequest(request)
    try await updateSession(from: response, email: email)

    logger.info("Sign in successful")
  }

  /// Sign up with email and password
  func signUp(email: String, password: String, name: String? = nil) async throws {
    let request = try makeEmailSignUpRequest(email: email, password: password, name: name)

    logger.info("Signing up with email: \(email)")

    let response = try await performAuthRequest(request)
    try await updateSession(from: response, email: email)

    logger.info("Sign up successful")
  }

  /// Sign in with OAuth provider (Apple or WeChat)
  func signInWithOAuth(provider: OAuthProvider) async throws {
    // OAuth flow typically requires web-based authentication
    // This is a placeholder for the OAuth URL that would be opened in a web view
    _ = apiBaseURL.appendingPathComponent("api/auth/signin/\(provider.rawValue)")

    logger.info("Initiating OAuth sign in with \(provider.rawValue)")

    // Note: Full OAuth implementation would require:
    // 1. Opening the OAuth URL in ASWebAuthenticationSession
    // 2. Handling the redirect callback with auth code
    // 3. Exchanging the code for tokens
    throw AuthError.oauthNotImplemented
  }

  /// Request SMS verification code for phone login
  func requestVerificationCode(phoneNumber: String) async throws {
    guard isValidPhoneNumber(phoneNumber) else {
      throw AuthError.invalidPhoneNumber
    }

    let url = apiBaseURL.appendingPathComponent("api/auth/sms/send")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: String] = ["phone": phoneNumber]
    request.httpBody = try encoder.encode(body)

    logger.info("Requesting verification code for phone: \(phoneNumber.prefix(3))****")

    let (data, response) = try await session.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw AuthError.invalidResponse
    }

    guard httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
        throw AuthError.serverError(errorResponse.errorMessage)
      }
      throw AuthError.httpError(httpResponse.statusCode)
    }

    logger.info("Verification code sent successfully")
  }

  /// Sign in with phone number and verification code
  func signInWithPhone(phoneNumber: String, verificationCode: String) async throws {
    guard isValidPhoneNumber(phoneNumber) else {
      throw AuthError.invalidPhoneNumber
    }

    guard verificationCode.count == 6, verificationCode.allSatisfy({ $0.isNumber }) else {
      throw AuthError.invalidVerificationCode
    }

    let url = apiBaseURL.appendingPathComponent("api/auth/signin/phone")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: String] = [
      "phone": phoneNumber,
      "code": verificationCode,
    ]
    request.httpBody = try encoder.encode(body)

    logger.info("Signing in with phone: \(phoneNumber.prefix(3))****")

    let authResponse = try await performAuthRequest(request)
    try await updateSession(from: authResponse, email: nil)

    logger.info("Phone sign in successful")
  }

  /// Validate phone number format (Chinese mobile)
  private func isValidPhoneNumber(_ phone: String) -> Bool {
    let phoneRegex = "^1[3-9]\\d{9}$"
    return phone.range(of: phoneRegex, options: .regularExpression) != nil
  }

  /// Sign out and clear session
  func signOut() async throws {
    logger.info("Signing out")

    // Call sign out endpoint if we have a token
    if let token = accessToken {
      let url = apiBaseURL.appendingPathComponent("api/auth/signout")

      var request = URLRequest(url: url)
      request.httpMethod = "POST"
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

      do {
        let (_, response) = try await session.data(for: request)
        if let httpResponse = response as? HTTPURLResponse {
          logger.debug("Sign out response status: \(httpResponse.statusCode)")
        }
      } catch {
        // Continue with local sign out even if API call fails
        logger.warning("Sign out API call failed: \(String(describing: error))")
      }
    }

    // Clear local session
    await clearSession()
    logger.info("Sign out complete")
  }

  /// Refresh authentication token
  func refreshToken() async throws {
    guard let refreshToken = refreshToken else {
      throw AuthError.noRefreshToken
    }

    logger.info("Refreshing access token")

    let url = apiBaseURL.appendingPathComponent("api/auth/refresh")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let body: [String: String] = ["refreshToken": refreshToken]
    request.httpBody = try encoder.encode(body)

    let response = try await performAuthRequest(request)
    try await updateSession(from: response, email: userEmail)

    logger.info("Token refresh successful")
  }

  // MARK: - Session Management

  /// Ensure stored session is loaded (call this before checking auth state)
  func ensureSessionLoaded() async {
    guard !sessionLoaded else { return }
    await loadStoredSession()
  }

  /// Get current access token (refreshing if needed)
  func getAccessToken() async throws -> String {
    if let token = accessToken {
      return token
    }

    // Try to refresh if we have a refresh token
    if refreshToken != nil {
      try await refreshToken()
      if let token = accessToken {
        return token
      }
    }

    throw AuthError.notAuthenticated
  }
  
  /// Get user ID by decoding the JWT access token (same as backend)
  func getUserIdFromToken() async -> String? {
    // Use getAccessToken which is proven to work for API calls
    guard let token = try? await getAccessToken() else {
      return nil
    }
    return decodeUserIdFromJWT(token)
  }

  
  /// Decode the 'sub' claim from a JWT token
  private func decodeUserIdFromJWT(_ token: String) -> String? {
    let parts = token.split(separator: ".")
    guard parts.count == 3 else { return nil }
    
    var payload = String(parts[1])
    // Convert base64url to base64
    payload = payload.replacingOccurrences(of: "-", with: "+")
    payload = payload.replacingOccurrences(of: "_", with: "/")
    // Add padding if needed
    while payload.count % 4 != 0 {
      payload += "="
    }
    
    guard let data = Data(base64Encoded: payload),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let sub = json["sub"] as? String else {
      return nil
    }
    
    return sub
  }

  // MARK: - Private Methods

  private func performAuthRequest(_ request: URLRequest) async throws -> AuthResponse {
    logger.info("Making auth request to: \(request.url?.absoluteString ?? "unknown")")

    // Log request body for debugging
    if let body = request.httpBody, let bodyString = String(data: body, encoding: .utf8) {
      logger.debug("Request body: \(bodyString)")
    }

    let data: Data
    let response: URLResponse
    do {
      (data, response) = try await session.data(for: request)
    } catch {
      logger.error("Network error: \(String(describing: error))")
      throw error
    }

    guard let httpResponse = response as? HTTPURLResponse else {
      throw AuthError.invalidResponse
    }

    logger.info("Auth response status: \(httpResponse.statusCode)")

    // Log response body for debugging
    if let responseString = String(data: data, encoding: .utf8) {
      logger.debug("Response body: \(responseString.prefix(500))")
    }

    switch httpResponse.statusCode {
    case 200...299:
      do {
        return try decoder.decode(AuthResponse.self, from: data)
      } catch {
        logger.error("Failed to decode AuthResponse: \(error)")
        // Try to get error message from response
        if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
          throw AuthError.serverError(errorResponse.errorMessage)
        }
        throw AuthError.invalidResponse
      }

    case 401:
      // Try to get error message
      if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
        throw AuthError.serverError(errorResponse.errorMessage)
      }
      throw AuthError.invalidCredentials

    case 400:
      // Try to decode error message
      if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
        throw AuthError.serverError(errorResponse.errorMessage)
      }
      throw AuthError.invalidRequest

    case 500...599:
      if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
        throw AuthError.serverError(errorResponse.errorMessage)
      }
      throw AuthError.serverError("Server error (\(httpResponse.statusCode))")

    default:
      throw AuthError.httpError(httpResponse.statusCode)
    }
  }

  func makeEmailSignInRequest(email: String, password: String) throws -> URLRequest {
    try makeEmailAuthRequest(
      payload: EmailAuthRequestPayload(
        email: email,
        password: password,
        flow: "signIn",
        name: nil
      )
    )
  }

  func makeEmailSignUpRequest(email: String, password: String, name: String?) throws -> URLRequest {
    try makeEmailAuthRequest(
      payload: EmailAuthRequestPayload(
        email: email,
        password: password,
        flow: "signUp",
        name: name
      )
    )
  }

  private func makeEmailAuthRequest(payload: EmailAuthRequestPayload) throws -> URLRequest {
    let url = apiBaseURL.appendingPathComponent("api/auth/signin")

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try encoder.encode(payload)
    return request
  }

  private func updateSession(from response: AuthResponse, email: String?) async throws {
    self.accessToken = response.token
    self.refreshToken = response.refreshToken
    self.userEmail = email ?? response.email
    self.isAuthenticated = true

    // Get userId from response or decode from JWT token
    let resolvedUserId = response.userId ?? decodeUserIdFromJWT(response.token)
    self.userId = resolvedUserId
    
    // Update cached userId for synchronous access
    AuthManager._cachedUserIdLock.withLock { $0 = resolvedUserId }

    // Persist to Keychain
    try saveToKeychain(response.token, key: accessTokenKey)
    if let refreshToken = response.refreshToken {
      try saveToKeychain(refreshToken, key: refreshTokenKey)
    }
    if let userId = resolvedUserId {
      try saveToKeychain(userId, key: userIdKey)
    }
    if let email = userEmail {
      try saveToKeychain(email, key: userEmailKey)
    }
  }

  private func loadStoredSession() async {
    guard !sessionLoaded else { return }

    let token = try? loadFromKeychain(key: accessTokenKey)
    let refresh = try? loadFromKeychain(key: refreshTokenKey)
    var storedUserId = try? loadFromKeychain(key: userIdKey)
    let email = try? loadFromKeychain(key: userEmailKey)

    if let token = token {
      // If userId not stored, decode from JWT token
      if storedUserId == nil {
        storedUserId = decodeUserIdFromJWT(token)
        // Save the decoded userId to keychain for next time
        if let userId = storedUserId {
          try? saveToKeychain(userId, key: userIdKey)
        }
      }
      
      self.accessToken = token
      self.refreshToken = refresh
      self.userId = storedUserId
      self.userEmail = email
      self.isAuthenticated = true

      // Update cached userId for synchronous access
      AuthManager._cachedUserIdLock.withLock { $0 = storedUserId }

      logger.info("Restored session from Keychain")
    }

    sessionLoaded = true
  }

  private func clearSession() async {
    self.accessToken = nil
    self.refreshToken = nil
    self.userId = nil
    self.userEmail = nil
    self.isAuthenticated = false

    // Clear cached userId for synchronous access
    AuthManager._cachedUserIdLock.withLock { $0 = nil }

    // Clear from Keychain
    deleteFromKeychain(key: accessTokenKey)
    deleteFromKeychain(key: refreshTokenKey)
    deleteFromKeychain(key: userIdKey)
    deleteFromKeychain(key: userEmailKey)
  }

  // MARK: - Keychain Storage

  private func saveToKeychain(_ value: String, key: String) throws {
    guard let data = value.data(using: .utf8) else {
      throw AuthError.keychainError
    }

    // Delete existing item first
    deleteFromKeychain(key: key)

    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: key,
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
    ]

    let status = SecItemAdd(query as CFDictionary, nil)
    guard status == errSecSuccess else {
      logger.error("Keychain save failed: \(status)")
      throw AuthError.keychainError
    }
  }

  private func loadFromKeychain(key: String) throws -> String? {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: key,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    guard status == errSecSuccess else {
      if status != errSecItemNotFound {
        logger.error("Keychain load failed: \(status)")
      }
      return nil
    }

    guard let data = result as? Data,
          let value = String(data: data, encoding: .utf8)
    else {
      return nil
    }

    return value
  }

  private func deleteFromKeychain(key: String) {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: keychainService,
      kSecAttrAccount as String: key,
    ]

    SecItemDelete(query as CFDictionary)
  }
}

// MARK: - Supporting Types

enum OAuthProvider: String {
  case apple = "apple"
  case wechat = "wechat"
}

enum AuthError: LocalizedError {
  case invalidCredentials
  case invalidRequest
  case invalidResponse
  case serverError(String)
  case httpError(Int)
  case notAuthenticated
  case noRefreshToken
  case keychainError
  case oauthNotImplemented
  case invalidPhoneNumber
  case invalidVerificationCode
  case verificationCodeExpired
  case invalidPassword

  var errorDescription: String? {
    switch self {
    case .invalidCredentials:
      return "邮箱或密码错误"
    case .invalidRequest:
      return "请求无效，请检查输入"
    case .invalidResponse:
      return "服务器响应无效"
    case .serverError(let message):
      // Parse specific error messages for user-friendly display
      if message.contains("Invalid password") || message.contains("validateDefaultPasswordRequirements") {
        return "密码至少需要8个字符"
      }
      if message.contains("already exists") || message.contains("duplicate") {
        return "该邮箱已被注册"
      }
      if message.contains("Invalid email") {
        return "邮箱格式不正确"
      }
      return "服务器错误，请稍后重试"
    case .httpError(let code):
      return "请求失败 (\(code))"
    case .notAuthenticated:
      return "未登录，请先登录"
    case .noRefreshToken:
      return "无法刷新会话，请重新登录"
    case .keychainError:
      return "无法保存登录信息"
    case .oauthNotImplemented:
      return "社交登录功能开发中"
    case .invalidPhoneNumber:
      return "手机号格式不正确"
    case .invalidVerificationCode:
      return "验证码错误"
    case .verificationCodeExpired:
      return "验证码已过期，请重新获取"
    case .invalidPassword:
      return "密码至少需要8个字符"
    }
  }
}

private struct AuthResponse: Codable {
  let token: String
  let refreshToken: String?
  let userId: String?
  let email: String?
}

struct EmailAuthRequestPayload: Codable {
  let email: String
  let password: String
  let flow: String
  let name: String?
}

private struct ErrorResponse: Codable {
  let error: String?
  let message: String?

  var errorMessage: String {
    error ?? message ?? "Unknown error"
  }
}
