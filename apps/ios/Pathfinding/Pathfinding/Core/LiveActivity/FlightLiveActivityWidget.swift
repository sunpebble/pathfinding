import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Flight Live Activity Widget

struct FlightLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FlightLiveActivityAttributes.self) { context in
            // Lock Screen / Banner view
            FlightLockScreenView(
                attributes: context.attributes,
                state: context.state
            )
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island regions
                DynamicIslandExpandedRegion(.leading) {
                    FlightExpandedLeadingView(
                        departureAirport: context.attributes.departureAirport,
                        departureCity: context.attributes.departureCity,
                        departureGate: context.state.departureGate
                    )
                }
                DynamicIslandExpandedRegion(.trailing) {
                    FlightExpandedTrailingView(
                        arrivalAirport: context.attributes.arrivalAirport,
                        arrivalCity: context.attributes.arrivalCity,
                        arrivalGate: context.state.arrivalGate
                    )
                }
                DynamicIslandExpandedRegion(.center) {
                    FlightExpandedCenterView(
                        flightNumber: context.attributes.flightNumber,
                        status: context.state.status,
                        statusColor: context.state.statusColor,
                        progress: context.state.progress
                    )
                }
                DynamicIslandExpandedRegion(.bottom) {
                    FlightExpandedBottomView(
                        scheduledDeparture: context.attributes.scheduledDeparture,
                        estimatedDeparture: context.state.estimatedDeparture,
                        scheduledArrival: context.attributes.scheduledArrival,
                        estimatedArrival: context.state.estimatedArrival,
                        delayMinutes: context.state.delayMinutes
                    )
                }
            } compactLeading: {
                // Compact leading view
                Image(systemName: "airplane")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Compact trailing view
                Text(context.state.status)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(statusColor(context.state.statusColor))
            } minimal: {
                // Minimal view (single icon)
                Image(systemName: "airplane")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
            }
        }
    }

    private func statusColor(_ colorName: String) -> Color {
        switch colorName {
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "red": return .red
        case "purple": return .purple
        case "gray": return .gray
        default: return .primary
        }
    }
}

// MARK: - Flight Lock Screen View

struct FlightLockScreenView: View {
    let attributes: FlightLiveActivityAttributes
    let state: FlightLiveActivityAttributes.ContentState

    var body: some View {
        VStack(spacing: 12) {
            // Header: Flight number and status
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "airplane")
                        .font(.system(size: 14, weight: .semibold))
                    Text(attributes.flightNumber)
                        .font(.system(size: 16, weight: .bold))
                }

                Spacer()

                Text(state.status)
                    .font(.system(size: 12, weight: .semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.2))
                    .foregroundColor(statusColor)
                    .clipShape(Capsule())
            }

            // Route info
            HStack(alignment: .top, spacing: 0) {
                // Departure
                VStack(alignment: .leading, spacing: 2) {
                    Text(attributes.departureAirport)
                        .font(.system(size: 24, weight: .bold))
                    Text(attributes.departureCity)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    if let gate = state.departureGate {
                        Text("Gate \(gate)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.orange)
                    }
                }

                Spacer()

                // Progress indicator
                VStack(spacing: 4) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)

                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(height: 2)

                                Rectangle()
                                    .fill(Color.blue)
                                    .frame(width: geometry.size.width * state.progress, height: 2)

                                Image(systemName: "airplane")
                                    .font(.system(size: 10))
                                    .foregroundColor(.blue)
                                    .offset(x: geometry.size.width * state.progress - 5)
                            }
                        }
                        .frame(height: 10)

                        Circle()
                            .fill(state.progress >= 1.0 ? Color.green : Color.gray.opacity(0.5))
                            .frame(width: 6, height: 6)
                    }

                    Text(attributes.airline)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
                .frame(width: 120)

                Spacer()

                // Arrival
                VStack(alignment: .trailing, spacing: 2) {
                    Text(attributes.arrivalAirport)
                        .font(.system(size: 24, weight: .bold))
                    Text(attributes.arrivalCity)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    if let gate = state.arrivalGate {
                        Text("Gate \(gate)")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.orange)
                    }
                }
            }

            // Time info
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(formatTime(state.estimatedDeparture ?? attributes.scheduledDeparture))
                        .font(.system(size: 14, weight: .semibold))
                    if let delay = state.delayMinutes, delay > 0 {
                        Text("Delayed \(delay) min")
                            .font(.system(size: 10))
                            .foregroundColor(.orange)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(formatTime(state.estimatedArrival ?? attributes.scheduledArrival))
                        .font(.system(size: 14, weight: .semibold))
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
    }

    private var statusColor: Color {
        switch state.statusColor {
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "red": return .red
        case "purple": return .purple
        case "gray": return .gray
        default: return .primary
        }
    }

    private func formatTime(_ timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: Double(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}

// MARK: - Flight Expanded Views

struct FlightExpandedLeadingView: View {
    let departureAirport: String
    let departureCity: String
    let departureGate: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(departureAirport)
                .font(.system(size: 18, weight: .bold))
            Text(departureCity)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
            if let gate = departureGate {
                Text("G\(gate)")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.orange)
            }
        }
    }
}

struct FlightExpandedTrailingView: View {
    let arrivalAirport: String
    let arrivalCity: String
    let arrivalGate: String?

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(arrivalAirport)
                .font(.system(size: 18, weight: .bold))
            Text(arrivalCity)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
            if let gate = arrivalGate {
                Text("G\(gate)")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.orange)
            }
        }
    }
}

struct FlightExpandedCenterView: View {
    let flightNumber: String
    let status: String
    let statusColor: String
    let progress: Double

    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: "airplane")
                    .font(.system(size: 12, weight: .semibold))
                Text(flightNumber)
                    .font(.system(size: 14, weight: .bold))
            }

            ProgressView(value: progress)
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                .frame(width: 60)

            Text(status)
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(color)
        }
    }

    private var color: Color {
        switch statusColor {
        case "blue": return .blue
        case "green": return .green
        case "orange": return .orange
        case "red": return .red
        case "purple": return .purple
        case "gray": return .gray
        default: return .primary
        }
    }
}

struct FlightExpandedBottomView: View {
    let scheduledDeparture: Int64
    let estimatedDeparture: Int64?
    let scheduledArrival: Int64
    let estimatedArrival: Int64?
    let delayMinutes: Int?

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Depart")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Text(formatTime(estimatedDeparture ?? scheduledDeparture))
                    .font(.system(size: 12, weight: .semibold))
            }

            Spacer()

            if let delay = delayMinutes, delay > 0 {
                Text("+\(delay)m")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.orange)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("Arrive")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Text(formatTime(estimatedArrival ?? scheduledArrival))
                    .font(.system(size: 12, weight: .semibold))
            }
        }
    }

    private func formatTime(_ timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: Double(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }
}
