import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Itinerary Live Activity Widget

struct ItineraryLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ItineraryLiveActivityAttributes.self) { context in
            // Lock Screen / Banner view
            ItineraryLockScreenView(
                attributes: context.attributes,
                state: context.state
            )
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island regions
                DynamicIslandExpandedRegion(.leading) {
                    ItineraryExpandedLeadingView(
                        currentPoiName: context.state.currentPoiName,
                        currentPoiCategory: context.state.currentPoiCategory
                    )
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ItineraryExpandedTrailingView(
                        nextPoiName: context.state.nextPoiName,
                        timeToNextPoi: context.state.timeToNextPoi
                    )
                }
                DynamicIslandExpandedRegion(.center) {
                    ItineraryExpandedCenterView(
                        dayNumber: context.attributes.dayNumber,
                        cityName: context.attributes.cityName,
                        progress: context.state.progress
                    )
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ItineraryExpandedBottomView(
                        itineraryTitle: context.attributes.itineraryTitle,
                        currentItemIndex: context.state.currentItemIndex,
                        totalItems: context.state.totalItems,
                        isInTransit: context.state.isInTransit,
                        transitMode: context.state.transitMode
                    )
                }
            } compactLeading: {
                // Compact leading view
                Image(systemName: "map.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Compact trailing view
                Text("\(context.state.currentItemIndex)/\(context.state.totalItems)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
            } minimal: {
                // Minimal view (single icon)
                ZStack {
                    Circle()
                        .strokeBorder(Color.blue.opacity(0.3), lineWidth: 2)
                    Circle()
                        .trim(from: 0, to: context.state.progress)
                        .stroke(Color.blue, lineWidth: 2)
                        .rotationEffect(.degrees(-90))
                    Image(systemName: "map.fill")
                        .font(.system(size: 10))
                        .foregroundColor(.blue)
                }
            }
        }
    }
}

// MARK: - Itinerary Lock Screen View

struct ItineraryLockScreenView: View {
    let attributes: ItineraryLiveActivityAttributes
    let state: ItineraryLiveActivityAttributes.ContentState

    var body: some View {
        VStack(spacing: 12) {
            // Header: Day info and progress
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.blue)
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Day \(attributes.dayNumber)")
                            .font(.system(size: 16, weight: .bold))
                        if let theme = attributes.dayTheme {
                            Text(theme)
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Spacer()

                HStack(spacing: 4) {
                    Text("\(state.currentItemIndex)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.blue)
                    Text("/")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    Text("\(state.totalItems)")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.secondary)
                }
            }

            // Current POI
            HStack(alignment: .top, spacing: 12) {
                // Status indicator
                VStack(spacing: 4) {
                    Circle()
                        .fill(state.isInTransit ? Color.orange : Color.green)
                        .frame(width: 10, height: 10)
                    if state.nextPoiName != nil {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(width: 2, height: 40)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    // Current POI info
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(state.isInTransit ? "In Transit" : "Current")
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                            Text(state.currentPoiName)
                                .font(.system(size: 16, weight: .semibold))
                                .lineLimit(1)
                            if let category = state.currentPoiCategory {
                                Text(category)
                                    .font(.system(size: 11))
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        if state.isInTransit, let mode = state.transitMode {
                            VStack(alignment: .trailing, spacing: 2) {
                                Image(systemName: transitIcon(mode))
                                    .font(.system(size: 20))
                                    .foregroundColor(.orange)
                                if let eta = state.etaMinutes {
                                    Text("\(eta) min")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(.orange)
                                }
                            }
                        }
                    }

                    // Next POI preview
                    if let nextPoi = state.nextPoiName {
                        Divider()
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Next")
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                Text(nextPoi)
                                    .font(.system(size: 14, weight: .medium))
                                    .lineLimit(1)
                            }

                            Spacer()

                            if let time = state.timeToNextPoi {
                                Text(time)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            }

            // Progress bar
            VStack(spacing: 4) {
                ProgressView(value: state.progress)
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))

                HStack {
                    Text(attributes.cityName)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(attributes.dateFormatted)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
    }

    private func transitIcon(_ mode: String) -> String {
        switch mode.lowercased() {
        case "walking": return "figure.walk"
        case "cycling": return "bicycle"
        case "driving": return "car.fill"
        case "taxi": return "car.fill"
        case "bus": return "bus.fill"
        case "subway", "metro": return "tram.fill"
        case "transit": return "tram.fill"
        default: return "arrow.right"
        }
    }
}

// MARK: - Itinerary Expanded Views

struct ItineraryExpandedLeadingView: View {
    let currentPoiName: String
    let currentPoiCategory: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Now")
                .font(.system(size: 9))
                .foregroundColor(.secondary)
            Text(currentPoiName)
                .font(.system(size: 12, weight: .semibold))
                .lineLimit(2)
            if let category = currentPoiCategory {
                Text(category)
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct ItineraryExpandedTrailingView: View {
    let nextPoiName: String?
    let timeToNextPoi: String?

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            if let nextPoi = nextPoiName {
                Text("Next")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Text(nextPoi)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(2)
                if let time = timeToNextPoi {
                    Text(time)
                        .font(.system(size: 9))
                        .foregroundColor(.blue)
                }
            } else {
                Text("Completed")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.green)
            }
        }
    }
}

struct ItineraryExpandedCenterView: View {
    let dayNumber: Int
    let cityName: String
    let progress: Double

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: "map.fill")
                    .font(.system(size: 10))
                Text("Day \(dayNumber)")
                    .font(.system(size: 12, weight: .bold))
            }
            .foregroundColor(.blue)

            ProgressView(value: progress)
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                .frame(width: 50)

            Text(cityName)
                .font(.system(size: 9))
                .foregroundColor(.secondary)
        }
    }
}

struct ItineraryExpandedBottomView: View {
    let itineraryTitle: String
    let currentItemIndex: Int
    let totalItems: Int
    let isInTransit: Bool
    let transitMode: String?

    var body: some View {
        HStack {
            Text(itineraryTitle)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
                .lineLimit(1)

            Spacer()

            if isInTransit, let mode = transitMode {
                HStack(spacing: 4) {
                    Image(systemName: transitIcon(mode))
                        .font(.system(size: 10))
                    Text("In Transit")
                        .font(.system(size: 9))
                }
                .foregroundColor(.orange)
            } else {
                Text("\(currentItemIndex) of \(totalItems)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.blue)
            }
        }
    }

    private func transitIcon(_ mode: String) -> String {
        switch mode.lowercased() {
        case "walking": return "figure.walk"
        case "cycling": return "bicycle"
        case "driving", "taxi": return "car.fill"
        case "bus": return "bus.fill"
        case "subway", "metro", "transit": return "tram.fill"
        default: return "arrow.right"
        }
    }
}
