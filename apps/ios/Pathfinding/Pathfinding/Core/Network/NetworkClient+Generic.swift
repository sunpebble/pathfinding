import Foundation

// MARK: - Generic Data Helpers (endpoint-based)

extension NetworkClient {
  func fetchData(endpoint: String) async throws -> Data {
    let url = URL(string: AppConfig.apiBaseURL)!
      .appendingPathComponent("v1")
      .appendingPathComponent(endpoint)

    var request = URLRequest(url: url)
    request.httpMethod = "GET"

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  func postData(endpoint: String, body: [String: Any]) async throws -> Data {
    // Convert to Data on the calling side to avoid Sendable issues
    let bodyData = try JSONSerialization.data(withJSONObject: body)
    return try await postDataWithBody(endpoint: endpoint, bodyData: bodyData)
  }

  func postDataWithBody(endpoint: String, bodyData: Data) async throws -> Data {
    let url = URL(string: AppConfig.apiBaseURL)!
      .appendingPathComponent("v1")
      .appendingPathComponent(endpoint)

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    request.httpBody = bodyData

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  func patchData(endpoint: String, body: [String: Any]) async throws -> Data {
    let url = URL(string: AppConfig.apiBaseURL)!
      .appendingPathComponent("v1")
      .appendingPathComponent(endpoint)

    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  func deleteData(endpoint: String) async throws -> Data {
    let url = URL(string: AppConfig.apiBaseURL)!
      .appendingPathComponent("v1")
      .appendingPathComponent(endpoint)

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }
}

// MARK: - Generic Data Helpers (URL-based)

extension NetworkClient {
  /// Fetch data from URL (generic GET request)
  func fetchData(url: URL) async throws -> Data {
    var request = URLRequest(url: url)
    request.httpMethod = "GET"

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  /// POST data to URL
  func postData(url: URL, body: [String: Any]) async throws -> Data {
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  /// PUT data to URL
  func putData(url: URL, body: sending [String: Any]) async throws -> Data {
    var request = URLRequest(url: url)
    request.httpMethod = "PUT"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  /// PATCH data to URL
  func patchData(url: URL, body: sending [String: Any]) async throws -> Data {
    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }

  /// DELETE data from URL
  func deleteData(url: URL) async throws -> Data {
    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"

    if let token = try? await AuthManager.shared.getAccessToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300 else {
      throw APIError.invalidResponse
    }

    return data
  }
}

// MARK: - Generic Codable Helpers

extension NetworkClient {
  /// POST request with Codable body
  func postCodable<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")
    var request = await createAuthenticatedRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 500)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }

  /// PATCH request with Codable body
  func patchCodable<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
    let baseURL = URL(string: AppConfig.apiBaseURL)!
    let url = baseURL.appendingPathComponent("v1/\(path)")
    var request = await createAuthenticatedRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode >= 200 && httpResponse.statusCode < 300
    else {
      throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 500)
    }

    return try JSONDecoder().decode(T.self, from: data)
  }
}
