import Foundation
import Observation
import WidgetKit

// MARK: - Type Aliases for Shared Widget Models

/// Type aliases for main app - maps to shared widget models
typealias WidgetItineraryData = SharedWidgetItineraryData
typealias WidgetTodayData = SharedWidgetTodayData
typealias WidgetPoiData = SharedWidgetPoiData
typealias WidgetWeatherData = SharedWidgetWeatherData
typealias WidgetExchangeRateData = SharedWidgetExchangeRateData
typealias AppGroupConstants = WidgetAppGroupConstants

// MARK: - Widget Data Manager

/// Manages data synchronization between main app and widgets
/// Converts SavedItinerary models to widget-compatible data formats
@Observable
@MainActor
final class WidgetDataManager {
  static let shared = WidgetDataManager()

  private let defaults: UserDefaults?
  private let encoder = JSONEncoder()

  private init() {
    defaults = UserDefaults(suiteName: AppGroupConstants.suiteName)
  }

  // MARK: - Public Methods

  /// Sync all widget data based on current itineraries
  func syncAllWidgetData(itineraries: [SavedItinerary]) {
    syncUpcomingItinerary(itineraries: itineraries)
    syncTodayItinerary(itineraries: itineraries)
  }

  /// Sync upcoming itinerary for countdown widget
  func syncUpcomingItinerary(itineraries: [SavedItinerary]) {
    guard let activeItinerary = findActiveOrUpcomingItinerary(from: itineraries) else {
      saveUpcomingItinerary(nil)
      return
    }

    let widgetData = convertToWidgetItineraryData(activeItinerary)
    saveUpcomingItinerary(widgetData)
  }

  /// Sync today's itinerary for today widget
  func syncTodayItinerary(itineraries: [SavedItinerary]) {
    guard let todayData = findTodayItinerary(from: itineraries) else {
      saveTodayItinerary(nil)
      return
    }

    saveTodayItinerary(todayData)
  }

  /// Sync weather data for weather widget
  func syncWeatherData(_ data: WidgetWeatherData?) {
    saveWeatherData(data)
  }

  /// Sync exchange rate data for exchange rate widget
  func syncExchangeRateData(_ data: WidgetExchangeRateData?) {
    saveExchangeRateData(data)
  }

  /// Reload all widget timelines
  func reloadAllWidgets() {
    WidgetCenter.shared.reloadAllTimelines()
  }

  /// Reload specific widget
  func reloadWidget(kind: WidgetKind) {
    WidgetCenter.shared.reloadTimelines(ofKind: kind.rawValue)
  }

  // MARK: - Private Methods - Finding Itineraries

  /// Find the active (in-progress) or upcoming itinerary
  private func findActiveOrUpcomingItinerary(from itineraries: [SavedItinerary]) -> SavedItinerary? {
    let now = Date()

    // First, look for in-progress itineraries
    // An itinerary is in-progress if we're within its date range
    for itinerary in itineraries {
      guard let startDate = itinerary.calculatedStartDate,
            let endDate = itinerary.calculatedEndDate else { continue }

      if now >= startDate && now <= endDate {
        return itinerary
      }
    }

    // Otherwise, find the nearest upcoming itinerary
    let upcomingItineraries = itineraries.compactMap { itinerary -> (SavedItinerary, Date)? in
      guard let startDate = itinerary.calculatedStartDate,
            startDate > now else { return nil }
      return (itinerary, startDate)
    }
    .sorted { $0.1 < $1.1 }

    return upcomingItineraries.first?.0
  }

  /// Find today's itinerary data
  private func findTodayItinerary(from itineraries: [SavedItinerary]) -> WidgetTodayData? {
    let calendar = Calendar.current
    let today = calendar.startOfDay(for: Date())

    // Look for an itinerary that includes today
    for itinerary in itineraries {
      guard let startDate = itinerary.calculatedStartDate else { continue }

      let startDay = calendar.startOfDay(for: startDate)

      // Calculate which day number today is (1-indexed)
      guard let daysDiff = calendar.dateComponents([.day], from: startDay, to: today).day,
            daysDiff >= 0 else { continue }

      let dayNumber = daysDiff + 1

      // Check if this day exists in the itinerary
      guard dayNumber <= itinerary.days.count,
            let dayData = itinerary.days.first(where: { $0.dayNumber == dayNumber }) else {
        continue
      }

      // Convert to widget data
      let pois = dayData.pois.map { poi in
        WidgetPoiData(
          id: poi.id,
          name: poi.name,
          type: poi.type,
          time: poi.time,
          duration: poi.duration,
          address: poi.address
        )
      }

      return WidgetTodayData(
        itineraryTitle: itinerary.title,
        destination: itinerary.destination,
        dayNumber: dayNumber,
        totalDays: itinerary.days.count,
        theme: dayData.theme,
        pois: pois,
        date: today
      )
    }

    return nil
  }

  // MARK: - Private Methods - Conversion

  /// Convert SavedItinerary to WidgetItineraryData
  private func convertToWidgetItineraryData(_ itinerary: SavedItinerary) -> WidgetItineraryData? {
    guard let startDate = itinerary.calculatedStartDate,
          let endDate = itinerary.calculatedEndDate else {
      return nil
    }

    let totalPois = itinerary.days.reduce(0) { $0 + $1.pois.count }

    return WidgetItineraryData(
      id: itinerary.id.uuidString,
      title: itinerary.title,
      destination: itinerary.destination,
      startDate: startDate,
      endDate: endDate,
      daysCount: itinerary.days.count,
      coverImageUrl: itinerary.coverImage,
      totalPois: totalPois
    )
  }

  // MARK: - Private Methods - Persistence

  private func saveUpcomingItinerary(_ data: WidgetItineraryData?) {
    guard let defaults else { return }
    if let data {
      if let encoded = try? encoder.encode(data) {
        defaults.set(encoded, forKey: AppGroupConstants.upcomingItineraryKey)
      }
    } else {
      defaults.removeObject(forKey: AppGroupConstants.upcomingItineraryKey)
    }
    defaults.set(Date(), forKey: AppGroupConstants.lastUpdateKey)
    WidgetCenter.shared.reloadTimelines(ofKind: WidgetKind.countdown.rawValue)
  }

  private func saveTodayItinerary(_ data: WidgetTodayData?) {
    guard let defaults else { return }
    if let data {
      if let encoded = try? encoder.encode(data) {
        defaults.set(encoded, forKey: AppGroupConstants.todayItineraryKey)
      }
    } else {
      defaults.removeObject(forKey: AppGroupConstants.todayItineraryKey)
    }
    WidgetCenter.shared.reloadTimelines(ofKind: WidgetKind.todayItinerary.rawValue)
  }

  private func saveWeatherData(_ data: WidgetWeatherData?) {
    guard let defaults else { return }
    if let data {
      if let encoded = try? encoder.encode(data) {
        defaults.set(encoded, forKey: AppGroupConstants.weatherDataKey)
      }
    } else {
      defaults.removeObject(forKey: AppGroupConstants.weatherDataKey)
    }
    WidgetCenter.shared.reloadTimelines(ofKind: WidgetKind.weather.rawValue)
  }

  private func saveExchangeRateData(_ data: WidgetExchangeRateData?) {
    guard let defaults else { return }
    if let data {
      if let encoded = try? encoder.encode(data) {
        defaults.set(encoded, forKey: AppGroupConstants.exchangeRateKey)
      }
    } else {
      defaults.removeObject(forKey: AppGroupConstants.exchangeRateKey)
    }
    WidgetCenter.shared.reloadTimelines(ofKind: WidgetKind.exchangeRate.rawValue)
  }
}

// MARK: - Widget Kind

/// Widget identifiers for timeline reloading
enum WidgetKind: String {
  case countdown = "CountdownWidget"
  case todayItinerary = "TodayItineraryWidget"
  case weather = "WeatherWidget"
  case exchangeRate = "ExchangeRateWidget"
}

// MARK: - SavedItinerary Extension

extension SavedItinerary {
  /// Calculate start date from the savedAt date
  /// In a real implementation, this would use user-defined dates
  var calculatedStartDate: Date? {
    // For now, use savedAt as a proxy
    // TODO: Add actual startDate field to SavedItinerary
    return savedAt
  }

  /// Calculate end date based on number of days
  var calculatedEndDate: Date? {
    guard let startDate = calculatedStartDate else { return nil }
    return Calendar.current.date(byAdding: .day, value: max(1, days.count) - 1, to: startDate)
  }
}
