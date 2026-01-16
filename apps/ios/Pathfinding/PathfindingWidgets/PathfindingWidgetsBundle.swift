import SwiftUI
import WidgetKit

/// Main entry point for all Pathfinding widgets including Live Activities
@main
struct PathfindingWidgetsBundle: WidgetBundle {
    var body: some Widget {
        // Standard Widgets
        CountdownWidget()
        TodayItineraryWidget()
        WeatherWidget()
        ExchangeRateWidget()

        // Live Activity Widgets
        FlightLiveActivityWidget()
        ItineraryLiveActivityWidget()
        NavigationLiveActivityWidget()
    }
}
