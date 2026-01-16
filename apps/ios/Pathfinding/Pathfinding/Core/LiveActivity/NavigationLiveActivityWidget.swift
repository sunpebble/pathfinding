import SwiftUI
import WidgetKit
import ActivityKit

// MARK: - Navigation Live Activity Widget

struct NavigationLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NavigationLiveActivityAttributes.self) { context in
            // Lock Screen / Banner view
            NavigationLockScreenView(
                attributes: context.attributes,
                state: context.state
            )
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Dynamic Island regions
                DynamicIslandExpandedRegion(.leading) {
                    NavigationExpandedLeadingView(
                        nextManeuverIcon: context.state.nextManeuverIcon,
                        distanceToNextManeuver: context.state.distanceToNextManeuver
                    )
                }
                DynamicIslandExpandedRegion(.trailing) {
                    NavigationExpandedTrailingView(
                        timeToDestination: context.state.timeToDestination,
                        eta: context.state.eta
                    )
                }
                DynamicIslandExpandedRegion(.center) {
                    NavigationExpandedCenterView(
                        transportMode: context.attributes.transportMode,
                        transportModeIcon: context.attributes.transportModeIcon,
                        progress: context.state.progress
                    )
                }
                DynamicIslandExpandedRegion(.bottom) {
                    NavigationExpandedBottomView(
                        currentInstruction: context.state.currentInstruction,
                        destinationName: context.attributes.destinationName,
                        trafficCondition: context.state.trafficCondition
                    )
                }
            } compactLeading: {
                // Compact leading view - direction icon
                Image(systemName: context.state.nextManeuverIcon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Compact trailing view - distance
                Text(context.state.distanceToNextManeuver)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.primary)
            } minimal: {
                // Minimal view (single icon)
                Image(systemName: context.state.nextManeuverIcon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.blue)
            }
        }
    }
}

// MARK: - Navigation Lock Screen View

struct NavigationLockScreenView: View {
    let attributes: NavigationLiveActivityAttributes
    let state: NavigationLiveActivityAttributes.ContentState

    var body: some View {
        VStack(spacing: 12) {
            // Header: Transport mode and traffic
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: attributes.transportModeIcon)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.blue)
                    Text("Navigation")
                        .font(.system(size: 14, weight: .semibold))
                }

                Spacer()

                if let traffic = state.trafficCondition {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(trafficColor(traffic))
                            .frame(width: 8, height: 8)
                        Text(trafficDisplayName(traffic))
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(trafficColor(traffic))
                    }
                }
            }

            // Current instruction with maneuver icon
            HStack(alignment: .center, spacing: 16) {
                // Direction icon
                ZStack {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 56, height: 56)
                    Image(systemName: state.nextManeuverIcon)
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.white)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(state.distanceToNextManeuver)
                        .font(.system(size: 28, weight: .bold))
                    Text(state.currentInstruction)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }

                Spacer()
            }

            // Destination and ETA
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Destination")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(attributes.destinationName)
                        .font(.system(size: 14, weight: .medium))
                        .lineLimit(1)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("ETA")
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                    Text(state.eta)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.blue)
                }
            }

            // Progress and remaining distance/time
            VStack(spacing: 4) {
                ProgressView(value: state.progress)
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))

                HStack {
                    Text(state.distanceToDestination)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(state.timeToDestination)
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                }
            }

            // Speed indicator (if available)
            if let speed = state.currentSpeed, speed > 0 {
                HStack {
                    Spacer()
                    HStack(spacing: 4) {
                        Image(systemName: "speedometer")
                            .font(.system(size: 12))
                        Text("\(speed) km/h")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.secondary)
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
    }

    private func trafficColor(_ condition: String) -> Color {
        switch condition.lowercased() {
        case "smooth": return .green
        case "slow": return .orange
        case "congested": return .red
        default: return .gray
        }
    }

    private func trafficDisplayName(_ condition: String) -> String {
        switch condition.lowercased() {
        case "smooth": return "Smooth"
        case "slow": return "Slow"
        case "congested": return "Congested"
        default: return condition
        }
    }
}

// MARK: - Navigation Expanded Views

struct NavigationExpandedLeadingView: View {
    let nextManeuverIcon: String
    let distanceToNextManeuver: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: nextManeuverIcon)
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.blue)
            Text(distanceToNextManeuver)
                .font(.system(size: 12, weight: .semibold))
        }
    }
}

struct NavigationExpandedTrailingView: View {
    let timeToDestination: String
    let eta: String

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(timeToDestination)
                .font(.system(size: 14, weight: .bold))
            Text("ETA \(eta)")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
    }
}

struct NavigationExpandedCenterView: View {
    let transportMode: String
    let transportModeIcon: String
    let progress: Double

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: transportModeIcon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.blue)

            ProgressView(value: progress)
                .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                .frame(width: 50)
        }
    }
}

struct NavigationExpandedBottomView: View {
    let currentInstruction: String
    let destinationName: String
    let trafficCondition: String?

    var body: some View {
        HStack {
            Text(currentInstruction)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
                .lineLimit(1)

            Spacer()

            if let traffic = trafficCondition {
                HStack(spacing: 4) {
                    Circle()
                        .fill(trafficColor(traffic))
                        .frame(width: 6, height: 6)
                    Text(traffic.capitalized)
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(trafficColor(traffic))
                }
            }
        }
    }

    private func trafficColor(_ condition: String) -> Color {
        switch condition.lowercased() {
        case "smooth": return .green
        case "slow": return .orange
        case "congested": return .red
        default: return .gray
        }
    }
}

// MARK: - Navigation Maneuver Icons

/// Helper to map navigation maneuvers to SF Symbols
enum NavigationManeuver: String {
    case straight = "arrow.up"
    case slightLeft = "arrow.up.left"
    case slightRight = "arrow.up.right"
    case left = "arrow.left"
    case right = "arrow.right"
    case sharpLeft = "arrow.turn.up.left"
    case sharpRight = "arrow.turn.up.right"
    case uTurn = "arrow.uturn.left"
    case merge = "arrow.merge"
    case fork = "arrow.triangle.branch"
    case roundabout = "arrow.triangle.2.circlepath"
    case exit = "arrow.up.right.square"
    case arrive = "mappin.circle.fill"
    case depart = "location.fill"

    static func icon(for instruction: String) -> String {
        let lowercased = instruction.lowercased()
        if lowercased.contains("straight") || lowercased.contains("continue") {
            return NavigationManeuver.straight.rawValue
        } else if lowercased.contains("slight left") {
            return NavigationManeuver.slightLeft.rawValue
        } else if lowercased.contains("slight right") {
            return NavigationManeuver.slightRight.rawValue
        } else if lowercased.contains("sharp left") || lowercased.contains("hairpin left") {
            return NavigationManeuver.sharpLeft.rawValue
        } else if lowercased.contains("sharp right") || lowercased.contains("hairpin right") {
            return NavigationManeuver.sharpRight.rawValue
        } else if lowercased.contains("left") || lowercased.contains("turn left") {
            return NavigationManeuver.left.rawValue
        } else if lowercased.contains("right") || lowercased.contains("turn right") {
            return NavigationManeuver.right.rawValue
        } else if lowercased.contains("u-turn") || lowercased.contains("u turn") {
            return NavigationManeuver.uTurn.rawValue
        } else if lowercased.contains("merge") {
            return NavigationManeuver.merge.rawValue
        } else if lowercased.contains("fork") {
            return NavigationManeuver.fork.rawValue
        } else if lowercased.contains("roundabout") || lowercased.contains("rotary") {
            return NavigationManeuver.roundabout.rawValue
        } else if lowercased.contains("exit") || lowercased.contains("off-ramp") {
            return NavigationManeuver.exit.rawValue
        } else if lowercased.contains("arrive") || lowercased.contains("destination") {
            return NavigationManeuver.arrive.rawValue
        } else if lowercased.contains("depart") || lowercased.contains("start") {
            return NavigationManeuver.depart.rawValue
        }
        return NavigationManeuver.straight.rawValue
    }
}
