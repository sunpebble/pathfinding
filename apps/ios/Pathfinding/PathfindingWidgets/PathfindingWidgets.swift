import SwiftUI
import WidgetKit

/// Widget Bundle that combines all Pathfinding widgets
@main
struct PathfindingWidgets: WidgetBundle {
  var body: some Widget {
    // Trip countdown widget - shows days until next trip
    CountdownWidget()

    // Today's itinerary widget - shows today's schedule
    TodayItineraryWidget()

    // Weather widget - shows destination weather
    WeatherWidget()

    // Exchange rate widget - shows currency conversion
    ExchangeRateWidget()
  }
}
