import Foundation
import Observation
import OSLog

/// Timezone store for managing world clock and timezone settings
@MainActor
@Observable
final class TimezoneStore {
  static let shared = TimezoneStore()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "TimezoneStore")
  private let apiClient = APIClient.shared

  // MARK: - State

  /// User's timezone settings
  var settings: UserTimezoneSettings = .default

  /// Home city (if set)
  var homeCity: City?

  /// Saved world clock cities
  var worldClockItems: [WorldClockItem] = []

  /// All available cities for selection
  var availableCities: [City] = []

  /// Search results
  var searchResults: [City] = []

  /// Loading states
  var isLoadingSettings = false
  var isLoadingCities = false
  var isSearching = false

  /// Error message
  var errorMessage: String?

  /// Timer for updating clocks
  /// Note: Using nonisolated(unsafe) because Timer is not Sendable
  /// and we need mutable access from both actor and timer callback
  nonisolated(unsafe) private var updateTimer: Timer?

  /// Current time (updated every second)
  var currentTime = Date()

  private init() {
    startClockTimer()
  }

  deinit {
    updateTimer?.invalidate()
  }

  // MARK: - Clock Timer

  /// Start timer to update current time every second
  private func startClockTimer() {
    updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
      Task { @MainActor in
        self?.currentTime = Date()
      }
    }
  }

  // MARK: - Data Loading

  /// Load user's world clock data
  func loadWorldClock() async {
    isLoadingSettings = true
    errorMessage = nil

    do {
      let response = try await fetchWorldClock()
      settings = UserTimezoneSettings(
        userId: nil,
        homeTimezone: response.settings?.homeTimezone ?? TimeZone.current.identifier,
        homeCityId: nil,
        displayFormat: response.settings?.displayFormat ?? .hour24,
        showSeconds: response.settings?.showSeconds ?? false,
        autoDetect: response.settings?.autoDetect ?? true,
        savedClocks: [],
        createdAt: nil,
        updatedAt: nil
      )
      homeCity = response.homeCity
      worldClockItems = response.clocks
      logger.info("Loaded world clock with \(response.clocks.count) cities")
    } catch {
      logger.error("Failed to load world clock: \(error.localizedDescription)")
      errorMessage = "无法加载世界时钟数据"
    }

    isLoadingSettings = false
  }

  /// Load all available cities
  func loadCities() async {
    isLoadingCities = true

    do {
      availableCities = try await fetchCities()
      logger.info("Loaded \(self.availableCities.count) cities")
    } catch {
      logger.error("Failed to load cities: \(error.localizedDescription)")
    }

    isLoadingCities = false
  }

  /// Search cities by name
  func searchCities(query: String) async {
    guard !query.isEmpty else {
      searchResults = []
      return
    }

    isSearching = true

    do {
      searchResults = try await fetchCitySearch(query: query)
      logger.info("Found \(self.searchResults.count) cities for query: \(query)")
    } catch {
      logger.error("Failed to search cities: \(error.localizedDescription)")
      searchResults = []
    }

    isSearching = false
  }

  // MARK: - World Clock Management

  /// Add a city to world clock
  func addCityToWorldClock(cityId: String, label: String? = nil) async -> Bool {
    do {
      _ = try await postAddClock(cityId: cityId, label: label)
      await loadWorldClock()
      logger.info("Added city \(cityId) to world clock")
      return true
    } catch {
      logger.error("Failed to add city to world clock: \(error.localizedDescription)")
      errorMessage = "无法添加城市"
      return false
    }
  }

  /// Remove a city from world clock
  func removeCityFromWorldClock(cityId: String) async -> Bool {
    do {
      _ = try await deleteRemoveClock(cityId: cityId)
      worldClockItems.removeAll { $0.city.id == cityId }
      logger.info("Removed city \(cityId) from world clock")
      return true
    } catch {
      logger.error("Failed to remove city from world clock: \(error.localizedDescription)")
      errorMessage = "无法移除城市"
      return false
    }
  }

  /// Update a saved clock's label
  func updateClockLabel(cityId: String, label: String?) async -> Bool {
    do {
      _ = try await patchUpdateClockLabel(cityId: cityId, label: label)
      if let index = worldClockItems.firstIndex(where: { $0.city.id == cityId }) {
        let item = worldClockItems[index]
        worldClockItems[index] = WorldClockItem(city: item.city, label: label, sortOrder: item.sortOrder)
      }
      logger.info("Updated label for city \(cityId)")
      return true
    } catch {
      logger.error("Failed to update clock label: \(error.localizedDescription)")
      errorMessage = "无法更新标签"
      return false
    }
  }

  /// Reorder world clock cities
  func reorderClocks(orderedCityIds: [String]) async -> Bool {
    do {
      _ = try await putReorderClocks(orderedCityIds: orderedCityIds)
      await loadWorldClock()
      logger.info("Reordered world clock cities")
      return true
    } catch {
      logger.error("Failed to reorder clocks: \(error.localizedDescription)")
      errorMessage = "无法重新排序"
      return false
    }
  }

  // MARK: - Settings Management

  /// Update home timezone
  func updateHomeTimezone(timezone: String, cityId: String? = nil) async -> Bool {
    do {
      _ = try await patchUpdateHomeTimezone(timezone: timezone, cityId: cityId)
      settings = UserTimezoneSettings(
        userId: settings.userId,
        homeTimezone: timezone,
        homeCityId: cityId,
        displayFormat: settings.displayFormat,
        showSeconds: settings.showSeconds,
        autoDetect: settings.autoDetect,
        savedClocks: settings.savedClocks,
        createdAt: settings.createdAt,
        updatedAt: Int(Date().timeIntervalSince1970 * 1000)
      )
      logger.info("Updated home timezone to \(timezone)")
      return true
    } catch {
      logger.error("Failed to update home timezone: \(error.localizedDescription)")
      errorMessage = "无法更新主时区"
      return false
    }
  }

  /// Update display format
  func updateDisplayFormat(format: TimeDisplayFormat, showSeconds: Bool? = nil) async -> Bool {
    do {
      _ = try await patchUpdateDisplayFormat(format: format, showSeconds: showSeconds)
      settings = UserTimezoneSettings(
        userId: settings.userId,
        homeTimezone: settings.homeTimezone,
        homeCityId: settings.homeCityId,
        displayFormat: format,
        showSeconds: showSeconds ?? settings.showSeconds,
        autoDetect: settings.autoDetect,
        savedClocks: settings.savedClocks,
        createdAt: settings.createdAt,
        updatedAt: Int(Date().timeIntervalSince1970 * 1000)
      )
      logger.info("Updated display format to \(format.rawValue)")
      return true
    } catch {
      logger.error("Failed to update display format: \(error.localizedDescription)")
      errorMessage = "无法更新显示格式"
      return false
    }
  }

  // MARK: - Time Conversion

  /// Convert time between timezones
  func convertTime(from: String, to: String, time: Date? = nil) async -> TimeConversionResult? {
    do {
      return try await fetchTimeConversion(from: from, to: to, time: time)
    } catch {
      logger.error("Failed to convert time: \(error.localizedDescription)")
      return nil
    }
  }

  /// Get current time in multiple timezones
  func getCurrentTimes(timezones: [String]) async -> [CurrentTimeResult] {
    do {
      return try await postCurrentTimes(timezones: timezones, format: settings.displayFormat)
    } catch {
      logger.error("Failed to get current times: \(error.localizedDescription)")
      return []
    }
  }

  // MARK: - Local Time Helpers

  /// Calculate time difference between two timezones
  func calculateTimeDifference(from: String, to: String) -> TimeDifference {
    guard let fromTz = TimeZone(identifier: from),
          let toTz = TimeZone(identifier: to) else {
      return TimeDifference(hours: 0, minutes: 0, isAhead: true, formatted: "+0:00", totalMinutes: 0)
    }

    let now = Date()
    let fromOffset = fromTz.secondsFromGMT(for: now)
    let toOffset = toTz.secondsFromGMT(for: now)
    let diffSeconds = toOffset - fromOffset
    let diffMinutes = diffSeconds / 60

    let hours = abs(diffMinutes) / 60
    let minutes = abs(diffMinutes) % 60
    let isAhead = diffMinutes >= 0

    let sign = isAhead ? "+" : "-"
    let formatted = minutes > 0 ? "\(sign)\(hours):\(String(format: "%02d", minutes))" : "\(sign)\(hours):00"

    return TimeDifference(
      hours: hours,
      minutes: minutes,
      isAhead: isAhead,
      formatted: formatted,
      totalMinutes: diffMinutes
    )
  }

  /// Format time for a specific timezone
  func formatTime(for timezone: String, date: Date = Date()) -> String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)

    switch settings.displayFormat {
    case .hour12:
      formatter.dateFormat = settings.showSeconds ? "h:mm:ss a" : "h:mm a"
    case .hour24:
      formatter.dateFormat = settings.showSeconds ? "HH:mm:ss" : "HH:mm"
    }

    return formatter.string(from: date)
  }

  /// Format date for a specific timezone
  func formatDate(for timezone: String, date: Date = Date()) -> String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "M月d日 EEEE"
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: date)
  }

  // MARK: - API Calls

  private func fetchWorldClock() async throws -> WorldClockResponse {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/world-clock")
    let data = try await apiClient.fetchData(url: url)
    let response = try JSONDecoder().decode(WorldClockDataResponse.self, from: data)
    return response.data
  }

  private func fetchCities() async throws -> [City] {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/cities")
    let data = try await apiClient.fetchData(url: url)
    let response = try JSONDecoder().decode(CitiesResponse.self, from: data)
    return response.data
  }

  private func fetchCitySearch(query: String) async throws -> [City] {
    var components = URLComponents(string: AppConfig.apiBaseURL)!
    components.path += "/v1/timezones/cities/search"
    components.queryItems = [URLQueryItem(name: "q", value: query)]

    guard let url = components.url else { throw APIError.invalidURL }

    let data = try await apiClient.fetchData(url: url)
    let response = try JSONDecoder().decode(CitiesResponse.self, from: data)
    return response.data
  }

  private func postAddClock(cityId: String, label: String?) async throws -> String {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/world-clock/cities")
    var body: [String: Any] = ["cityId": cityId]
    if let label = label {
      body["label"] = label
    }
    let data = try await apiClient.postData(url: url, body: body)
    let response = try JSONDecoder().decode(TimezoneIdResponse.self, from: data)
    return response.data.id
  }

  private func deleteRemoveClock(cityId: String) async throws -> String {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/world-clock/cities/\(cityId)")
    let data = try await apiClient.deleteData(url: url)
    let response = try JSONDecoder().decode(TimezoneIdResponse.self, from: data)
    return response.data.id
  }

  private func patchUpdateClockLabel(cityId: String, label: String?) async throws -> String {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/world-clock/cities/\(cityId)")
    var body: [String: Any] = [:]
    if let label = label {
      body["label"] = label
    }
    let data = try await apiClient.patchData(url: url, body: body)
    let response = try JSONDecoder().decode(TimezoneIdResponse.self, from: data)
    return response.data.id
  }

  private func putReorderClocks(orderedCityIds: [String]) async throws -> String {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/world-clock/order")
    let body: [String: Any] = ["orderedCityIds": orderedCityIds]
    let data = try await apiClient.putData(url: url, body: body)
    let response = try JSONDecoder().decode(TimezoneIdResponse.self, from: data)
    return response.data.id
  }

  private func patchUpdateHomeTimezone(timezone: String, cityId: String?) async throws -> String {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/settings/home")
    var body: [String: Any] = ["homeTimezone": timezone]
    if let cityId = cityId {
      body["homeCityId"] = cityId
    }
    let data = try await apiClient.patchData(url: url, body: body)
    let response = try JSONDecoder().decode(TimezoneIdResponse.self, from: data)
    return response.data.id
  }

  private func patchUpdateDisplayFormat(format: TimeDisplayFormat, showSeconds: Bool?) async throws -> String {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/settings/display")
    var body: [String: Any] = ["displayFormat": format.rawValue]
    if let showSeconds = showSeconds {
      body["showSeconds"] = showSeconds
    }
    let data = try await apiClient.patchData(url: url, body: body)
    let response = try JSONDecoder().decode(TimezoneIdResponse.self, from: data)
    return response.data.id
  }

  private func fetchTimeConversion(from: String, to: String, time: Date?) async throws -> TimeConversionResult {
    var components = URLComponents(string: AppConfig.apiBaseURL)!
    components.path += "/v1/timezones/convert"
    var queryItems = [
      URLQueryItem(name: "from", value: from),
      URLQueryItem(name: "to", value: to)
    ]
    if let time = time {
      let formatter = ISO8601DateFormatter()
      queryItems.append(URLQueryItem(name: "time", value: formatter.string(from: time)))
    }
    components.queryItems = queryItems

    guard let url = components.url else { throw APIError.invalidURL }

    let data = try await apiClient.fetchData(url: url)
    let response = try JSONDecoder().decode(TimeConversionResponse.self, from: data)
    return response.data
  }

  private func postCurrentTimes(timezones: [String], format: TimeDisplayFormat) async throws -> [CurrentTimeResult] {
    let url = URL(string: AppConfig.apiBaseURL)!.appendingPathComponent("v1/timezones/current")
    let body: [String: Any] = [
      "timezones": timezones,
      "format": format.rawValue
    ]
    let data = try await apiClient.postData(url: url, body: body)
    let response = try JSONDecoder().decode(CurrentTimesResponse.self, from: data)
    return response.data
  }
}

// MARK: - APIClient Extensions

extension APIClient {
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
