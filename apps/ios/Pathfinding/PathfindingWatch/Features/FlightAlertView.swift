import SwiftUI

// MARK: - Flight Alert View

/// View displaying upcoming flights and alerts on Apple Watch
struct FlightAlertView: View {
  @State private var sessionManager = WatchSessionManager.shared
  @State private var isRefreshing = false

  var body: some View {
    NavigationStack {
      Group {
        if sessionManager.upcomingFlights.isEmpty {
          emptyStateView
        } else {
          flightListView
        }
      }
      .navigationTitle("航班提醒")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            refreshFlights()
          } label: {
            Image(systemName: "arrow.clockwise")
          }
          .disabled(isRefreshing)
        }
      }
    }
  }

  // MARK: - Flight List

  private var flightListView: some View {
    ScrollView {
      LazyVStack(spacing: 12) {
        // Imminent flights (within 2 hours)
        let imminentFlights = sessionManager.upcomingFlights.filter { $0.isDepartureImminent }
        if !imminentFlights.isEmpty {
          Section {
            ForEach(imminentFlights) { flight in
              NavigationLink(destination: FlightDetailView(flight: flight)) {
                FlightCardView(flight: flight, isUrgent: true)
              }
              .buttonStyle(.plain)
            }
          } header: {
            sectionHeader("即将起飞", icon: "exclamationmark.triangle.fill", color: .orange)
          }
        }

        // Other upcoming flights
        let otherFlights = sessionManager.upcomingFlights.filter { !$0.isDepartureImminent }
        if !otherFlights.isEmpty {
          Section {
            ForEach(otherFlights) { flight in
              NavigationLink(destination: FlightDetailView(flight: flight)) {
                FlightCardView(flight: flight, isUrgent: false)
              }
              .buttonStyle(.plain)
            }
          } header: {
            sectionHeader("其他航班", icon: "airplane", color: .blue)
          }
        }
      }
      .padding(.horizontal)
    }
  }

  private func sectionHeader(_ title: String, icon: String, color: Color) -> some View {
    HStack {
      Image(systemName: icon)
        .foregroundStyle(color)
      Text(title)
        .font(.caption)
        .foregroundStyle(.secondary)
      Spacer()
    }
    .padding(.top, 8)
  }

  // MARK: - Empty State

  private var emptyStateView: some View {
    VStack(spacing: 12) {
      Image(systemName: "airplane.circle")
        .font(.largeTitle)
        .foregroundStyle(.secondary)

      Text("暂无航班")
        .font(.headline)

      Text("在手机上添加航班后\n会自动同步到手表")
        .font(.caption)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      Button("刷新") {
        refreshFlights()
      }
      .buttonStyle(.borderedProminent)
      .disabled(isRefreshing)
    }
    .padding()
  }

  // MARK: - Actions

  private func refreshFlights() {
    isRefreshing = true
    sessionManager.requestFlights()

    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      isRefreshing = false
    }
  }
}

// MARK: - Flight Card View

struct FlightCardView: View {
  let flight: WatchFlight
  let isUrgent: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      // Header with flight number and status
      HStack {
        Text(flight.flightNumber)
          .font(.headline)
          .fontWeight(.bold)

        Spacer()

        FlightStatusBadge(status: flight.status)
      }

      // Route
      HStack(spacing: 4) {
        Text(flight.departureCity)
          .font(.caption)
          .fontWeight(.medium)

        Image(systemName: "arrow.right")
          .font(.caption2)
          .foregroundStyle(.secondary)

        Text(flight.arrivalCity)
          .font(.caption)
          .fontWeight(.medium)
      }

      // Time info
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(flight.formattedDepartureTime)
            .font(.title3)
            .fontWeight(.bold)
            .foregroundStyle(isUrgent ? .orange : .primary)

          Text("起飞")
            .font(.caption2)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Countdown or delay info
        if flight.status == .delayed, let delay = flight.delayMinutes {
          VStack(alignment: .trailing, spacing: 2) {
            Text("+\(delay)分钟")
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(.orange)
            Text("延误")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        } else if isUrgent {
          VStack(alignment: .trailing, spacing: 2) {
            Text(countdownText)
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(.orange)
            Text("剩余")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
      }

      // Gate info if available
      if let gate = flight.gate {
        HStack {
          Image(systemName: "door.left.hand.open")
            .font(.caption)
          Text("登机口: \(gate)")
            .font(.caption)
        }
        .foregroundStyle(.blue)
      }
    }
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 12)
        .fill(isUrgent ? Color.orange.opacity(0.15) : Color(.systemGray6))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(isUrgent ? Color.orange.opacity(0.5) : Color.clear, lineWidth: 1)
    )
  }

  private var countdownText: String {
    let minutes = Int(flight.timeUntilDeparture / 60)
    if minutes >= 60 {
      let hours = minutes / 60
      let mins = minutes % 60
      return "\(hours)小时\(mins)分"
    } else {
      return "\(minutes)分钟"
    }
  }
}

// MARK: - Flight Status Badge

struct FlightStatusBadge: View {
  let status: WatchFlightStatus

  var body: some View {
    Text(status.displayName)
      .font(.caption2)
      .fontWeight(.medium)
      .padding(.horizontal, 6)
      .padding(.vertical, 2)
      .background(backgroundColor)
      .foregroundStyle(foregroundColor)
      .clipShape(Capsule())
  }

  private var backgroundColor: Color {
    switch status {
    case .scheduled: return .green.opacity(0.2)
    case .boarding: return .blue.opacity(0.2)
    case .departed: return .blue.opacity(0.2)
    case .delayed: return .orange.opacity(0.2)
    case .cancelled: return .red.opacity(0.2)
    case .arrived: return .green.opacity(0.2)
    case .unknown: return .gray.opacity(0.2)
    }
  }

  private var foregroundColor: Color {
    switch status {
    case .scheduled: return .green
    case .boarding: return .blue
    case .departed: return .blue
    case .delayed: return .orange
    case .cancelled: return .red
    case .arrived: return .green
    case .unknown: return .gray
    }
  }
}

// MARK: - Flight Detail View

struct FlightDetailView: View {
  let flight: WatchFlight

  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        // Flight header
        flightHeader

        Divider()

        // Route details
        routeDetails

        // Additional info
        additionalInfo

        // Status history
        if flight.status == .delayed {
          delayInfo
        }
      }
      .padding(.horizontal)
    }
    .navigationTitle(flight.flightNumber)
    .navigationBarTitleDisplayMode(.inline)
  }

  private var flightHeader: some View {
    VStack(spacing: 8) {
      if let airline = flight.airline {
        Text(airline)
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Text(flight.flightNumber)
        .font(.title2)
        .fontWeight(.bold)

      FlightStatusBadge(status: flight.status)
    }
  }

  private var routeDetails: some View {
    HStack(spacing: 16) {
      // Departure
      VStack(spacing: 4) {
        Text(flight.departureCity)
          .font(.headline)

        if let airport = flight.departureAirport {
          Text(airport)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }

        Text(flight.formattedDepartureTime)
          .font(.title3)
          .fontWeight(.bold)
          .foregroundStyle(.blue)
      }

      // Arrow
      VStack {
        Image(systemName: "airplane")
          .font(.title3)
          .foregroundStyle(.secondary)

        if let duration = flightDuration {
          Text(duration)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }

      // Arrival
      VStack(spacing: 4) {
        Text(flight.arrivalCity)
          .font(.headline)

        if let airport = flight.arrivalAirport {
          Text(airport)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }

        if let arrivalTime = flight.arrivalTime {
          Text(formatTime(arrivalTime))
            .font(.title3)
            .fontWeight(.bold)
            .foregroundStyle(.green)
        }
      }
    }
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 12)
        .fill(.ultraThinMaterial)
    )
  }

  private var additionalInfo: some View {
    VStack(spacing: 8) {
      if let terminal = flight.terminal {
        infoRow(icon: "building.2", label: "航站楼", value: terminal)
      }

      if let gate = flight.gate {
        infoRow(icon: "door.left.hand.open", label: "登机口", value: gate)
      }
    }
  }

  private var delayInfo: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Image(systemName: "exclamationmark.triangle.fill")
          .foregroundStyle(.orange)
        Text("航班延误")
          .font(.caption)
          .fontWeight(.medium)
      }

      if let delay = flight.delayMinutes {
        Text("预计延误 \(delay) 分钟")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(.orange.opacity(0.15))
    )
  }

  private func infoRow(icon: String, label: String, value: String) -> some View {
    HStack {
      Label(label, systemImage: icon)
        .font(.caption)
        .foregroundStyle(.secondary)

      Spacer()

      Text(value)
        .font(.caption)
        .fontWeight(.medium)
    }
    .padding(8)
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(.ultraThinMaterial)
    )
  }

  private var flightDuration: String? {
    guard let arrival = flight.arrivalTime else { return nil }
    let duration = arrival.timeIntervalSince(flight.departureTime)
    let hours = Int(duration) / 3600
    let minutes = (Int(duration) % 3600) / 60
    return "\(hours)h\(minutes)m"
  }

  private func formatTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: date)
  }
}

// MARK: - Preview

#Preview {
  FlightAlertView()
}
