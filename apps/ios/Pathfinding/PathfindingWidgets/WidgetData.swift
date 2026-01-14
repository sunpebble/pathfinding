import Foundation
import WidgetKit

// MARK: - Type Aliases for Shared Widget Models

/// Type aliases for widget extension - maps to shared widget models from Shared folder
/// This avoids code duplication between main app and widget extension
typealias WidgetItineraryData = SharedWidgetItineraryData
typealias WidgetTodayData = SharedWidgetTodayData
typealias WidgetPoiData = SharedWidgetPoiData
typealias WidgetWeatherData = SharedWidgetWeatherData
typealias WidgetExchangeRateData = SharedWidgetExchangeRateData
typealias AppGroupConstants = WidgetAppGroupConstants

// MARK: - Widget Shared UserDefaults

/// Shared UserDefaults for widget data - reads data written by main app
@MainActor
final class WidgetSharedDefaults {
  static let shared = WidgetSharedDefaults()

  private let defaults: UserDefaults?

  private init() {
    defaults = UserDefaults(suiteName: AppGroupConstants.suiteName)
  }

  // MARK: - Upcoming Itinerary

  func loadUpcomingItinerary() -> WidgetItineraryData? {
    guard let defaults,
          let data = defaults.data(forKey: AppGroupConstants.upcomingItineraryKey),
          let itinerary = try? JSONDecoder().decode(WidgetItineraryData.self, from: data)
    else { return nil }
    return itinerary
  }

  // MARK: - Today Itinerary

  func loadTodayItinerary() -> WidgetTodayData? {
    guard let defaults,
          let data = defaults.data(forKey: AppGroupConstants.todayItineraryKey),
          let today = try? JSONDecoder().decode(WidgetTodayData.self, from: data)
    else { return nil }
    return today
  }

  // MARK: - Weather Data

  func loadWeatherData() -> WidgetWeatherData? {
    guard let defaults,
          let data = defaults.data(forKey: AppGroupConstants.weatherDataKey),
          let weather = try? JSONDecoder().decode(WidgetWeatherData.self, from: data)
    else { return nil }
    return weather
  }

  // MARK: - Exchange Rate

  func loadExchangeRate() -> WidgetExchangeRateData? {
    guard let defaults,
          let data = defaults.data(forKey: AppGroupConstants.exchangeRateKey),
          let rate = try? JSONDecoder().decode(WidgetExchangeRateData.self, from: data)
    else { return nil }
    return rate
  }

  // MARK: - Last Update

  func lastUpdateDate() -> Date? {
    defaults?.object(forKey: AppGroupConstants.lastUpdateKey) as? Date
  }

  // MARK: - Reload Widgets

  func reloadAllWidgets() {
    WidgetCenter.shared.reloadAllTimelines()
  }

  func reloadCountdownWidget() {
    WidgetCenter.shared.reloadTimelines(ofKind: "CountdownWidget")
  }

  func reloadTodayWidget() {
    WidgetCenter.shared.reloadTimelines(ofKind: "TodayItineraryWidget")
  }

  func reloadWeatherWidget() {
    WidgetCenter.shared.reloadTimelines(ofKind: "WeatherWidget")
  }

  func reloadExchangeRateWidget() {
    WidgetCenter.shared.reloadTimelines(ofKind: "ExchangeRateWidget")
  }
}

// MARK: - Widget-Specific Extensions

/// Additional computed properties for weather widget display
extension SharedWidgetWeatherData {
  /// Weather condition color for widget UI
  var conditionColor: String {
    switch condition.lowercased() {
    case "clear": return "orange"
    case "rain", "drizzle": return "blue"
    case "thunderstorm": return "purple"
    case "snow": return "cyan"
    default: return "gray"
    }
  }
}

/// Additional computed properties for exchange rate widget display
extension SharedWidgetExchangeRateData {
  /// Base currency country code for flag display
  var baseCurrencyFlag: String {
    currencyFlag(for: baseCurrency)
  }

  /// Target currency country code for flag display
  var targetCurrencyFlag: String {
    currencyFlag(for: targetCurrency)
  }

  private func currencyFlag(for currency: String) -> String {
    switch currency.uppercased() {
    case "CNY": return "CN"
    case "USD": return "US"
    case "EUR": return "EU"
    case "GBP": return "GB"
    case "JPY": return "JP"
    case "KRW": return "KR"
    case "HKD": return "HK"
    case "TWD": return "TW"
    case "SGD": return "SG"
    case "AUD": return "AU"
    case "CAD": return "CA"
    case "THB": return "TH"
    case "MYR": return "MY"
    case "VND": return "VN"
    default: return String(currency.prefix(2).uppercased())
    }
  }
}
