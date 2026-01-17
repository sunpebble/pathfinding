import SwiftUI

// MARK: - Flight List View

/// Main view for displaying and managing flight bookings
struct FlightListView: View {
  @Environment(\.colorScheme) private var colorScheme
  @State private var flightStore = FlightStore.shared
  @State private var showAddFlight = false
  @State private var selectedFilter: FlightFilter = .upcoming
  @State private var searchText = ""

  enum FlightFilter: String, CaseIterable {
    case upcoming = "即将出发"
    case past = "历史航班"
    case all = "全部"
  }

  var filteredBookings: [FlightBooking] {
    let baseList: [FlightBooking]
    switch selectedFilter {
    case .upcoming:
      baseList = flightStore.upcomingFlights
    case .past:
      baseList = flightStore.pastFlights
    case .all:
      baseList = flightStore.bookings.sorted { $0.departureTime > $1.departureTime }
    }

    if searchText.isEmpty {
      return baseList
    }

    return baseList.filter { booking in
      booking.displayFlightNumber.localizedCaseInsensitiveContains(searchText)
        || booking.displayRoute.localizedCaseInsensitiveContains(searchText)
        || booking.confirmationCode.localizedCaseInsensitiveContains(searchText)
        || booking.passengerName.localizedCaseInsensitiveContains(searchText)
    }
  }

  var body: some View {
    NavigationStack {
      Group {
        if flightStore.isLoading && flightStore.bookings.isEmpty {
          ProgressView("加载中...")
        } else if flightStore.bookings.isEmpty {
          emptyStateView
        } else {
          flightListContent
        }
      }
      .navigationTitle("我的航班")
      .toolbar {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showAddFlight = true
          } label: {
            Image(systemName: "plus")
          }
        }
      }
      .searchable(text: $searchText, prompt: "搜索航班号、确认码...")
      .refreshable {
        await flightStore.loadBookings(forceRefresh: true)
      }
      .sheet(isPresented: $showAddFlight) {
        AddFlightView()
      }
      .task {
        if flightStore.bookings.isEmpty {
          await flightStore.loadBookings()
        }
      }
    }
  }

  // MARK: - Empty State

  private var emptyStateView: some View {
    ContentUnavailableView {
      Label("暂无航班", systemImage: "airplane")
    } description: {
      Text("添加您的航班信息，追踪航班状态和提醒")
    } actions: {
      Button("添加航班") {
        showAddFlight = true
      }
      .buttonStyle(.primary)
    }
  }

  // MARK: - Flight List Content

  private var flightListContent: some View {
    VStack(spacing: 0) {
      // Filter picker
      Picker("筛选", selection: $selectedFilter) {
        ForEach(FlightFilter.allCases, id: \.self) { filter in
          Text(filter.rawValue).tag(filter)
        }
      }
      .pickerStyle(.segmented)
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.sm)

      // Flight list
      if filteredBookings.isEmpty {
        ContentUnavailableView {
          Label("无匹配航班", systemImage: "magnifyingglass")
        } description: {
          if !searchText.isEmpty {
            Text("没有找到与 \"\(searchText)\" 匹配的航班")
          } else {
            Text("当前筛选条件下没有航班")
          }
        }
        .frame(maxHeight: .infinity)
      } else {
        ScrollView {
          LazyVStack(spacing: DesignTokens.Spacing.md) {
            ForEach(filteredBookings, id: \.id) { booking in
              NavigationLink(value: booking) {
                FlightBookingCard(booking: booking)
              }
              .buttonStyle(.plain)
            }

            // Load more indicator
            if flightStore.isLoading {
              ProgressView()
                .padding()
            }
          }
          .padding(.horizontal, DesignTokens.Spacing.md)
          .padding(.bottom, DesignTokens.Spacing.xl)
        }
        .navigationDestination(for: FlightBooking.self) { booking in
          FlightDetailView(booking: booking)
        }
      }
    }
  }
}

// MARK: - Flight Booking Card

/// Card component for displaying a flight booking in the list
struct FlightBookingCard: View {
  let booking: FlightBooking
  @Environment(\.colorScheme) private var colorScheme

  private var statusColor: Color {
    switch booking.status {
    case .confirmed, .checkedIn, .boarded:
      return .green
    case .pending:
      return .orange
    case .cancelled:
      return .red
    case .completed:
      return .gray
    }
  }

  private var flightStatusColor: Color {
    guard let flight = booking.flight else { return .secondary }
    switch flight.status {
    case .scheduled:
      return .blue
    case .delayed, .diverted:
      return .orange
    case .boarding:
      return .purple
    case .departed, .inAir:
      return .green
    case .landed, .arrived:
      return .gray
    case .cancelled:
      return .red
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Header: Flight number and status
      HStack {
        // Flight number with airline icon
        HStack(spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "airplane")
            .foregroundStyle(DesignTokens.Colors.accent)
          Text(booking.displayFlightNumber)
            .font(.headline)
            .fontWeight(.bold)
        }

        Spacer()

        // Status badges
        HStack(spacing: DesignTokens.Spacing.xs) {
          // Booking status
          StatusBadge(
            text: booking.status.displayName,
            color: statusColor
          )

          // Flight status (if available)
          if let flight = booking.flight {
            StatusBadge(
              text: flight.status.displayName,
              color: flightStatusColor,
              icon: flight.status.icon
            )
          }
        }
      }

      // Route info
      if let flight = booking.flight {
        HStack(spacing: DesignTokens.Spacing.sm) {
          // Departure
          VStack(alignment: .leading, spacing: 2) {
            Text(flight.departureAirport)
              .font(.title2)
              .fontWeight(.bold)
            Text(flight.departureCity ?? flight.departureAirportName ?? "")
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }

          Spacer()

          // Flight path visualization
          VStack(spacing: 4) {
            HStack(spacing: 4) {
              Circle()
                .fill(DesignTokens.Colors.accent)
                .frame(width: 6, height: 6)
              Rectangle()
                .fill(DesignTokens.Colors.accent.opacity(0.3))
                .frame(height: 2)
              Image(systemName: "airplane")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.accent)
              Rectangle()
                .fill(DesignTokens.Colors.accent.opacity(0.3))
                .frame(height: 2)
              Circle()
                .fill(DesignTokens.Colors.accent)
                .frame(width: 6, height: 6)
            }
            .frame(width: 100)

            if flight.duration != nil {
              Text(flight.durationFormatted)
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
          }

          Spacer()

          // Arrival
          VStack(alignment: .trailing, spacing: 2) {
            Text(flight.arrivalAirport)
              .font(.title2)
              .fontWeight(.bold)
            Text(flight.arrivalCity ?? flight.arrivalAirportName ?? "")
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
      } else {
        // Fallback when flight info not available
        Text(booking.displayRoute)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      Divider()

      // Bottom row: Date, time, and extras
      HStack {
        // Departure date/time
        VStack(alignment: .leading, spacing: 2) {
          Text(booking.departureDate, style: .date)
            .font(.subheadline)
          if let flight = booking.flight {
            Text(flight.scheduledDepartureDate, style: .time)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Additional info
        HStack(spacing: DesignTokens.Spacing.md) {
          // Cabin class
          Label {
            Text(booking.cabinClass.displayName)
          } icon: {
            Image(systemName: booking.cabinClass.icon)
          }
          .font(.caption)
          .foregroundStyle(.secondary)

          // Seat number
          if let seat = booking.seatNumber {
            Label {
              Text(seat)
            } icon: {
              Image(systemName: "chair")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
          }

          // Terminal/Gate
          if let flight = booking.flight, let terminal = flight.departureTerminal {
            Label {
              Text("T\(terminal)")
            } icon: {
              Image(systemName: "building.2")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
          }
        }
      }

      // Check-in availability hint
      if booking.canCheckIn {
        HStack {
          Image(systemName: "clock.badge.checkmark")
            .foregroundStyle(.green)
          Text("可以值机")
            .font(.caption)
            .foregroundStyle(.green)
        }
        .padding(.top, DesignTokens.Spacing.xxs)
      }

      // Delay warning
      if let flight = booking.flight, flight.isDelayed {
        HStack {
          Image(systemName: "exclamationmark.triangle.fill")
            .foregroundStyle(.orange)
          if let delayMinutes = flight.delayMinutes {
            Text("延误约 \(delayMinutes) 分钟")
              .font(.caption)
              .foregroundStyle(.orange)
          } else {
            Text("航班延误")
              .font(.caption)
              .foregroundStyle(.orange)
          }
          if let reason = flight.delayReason {
            Text("- \(reason)")
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
        .padding(.top, DesignTokens.Spacing.xxs)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .adaptiveCardStyle(colorScheme: colorScheme)
  }
}

// MARK: - Status Badge

/// Small badge component for displaying status
struct StatusBadge: View {
  let text: String
  let color: Color
  var icon: String? = nil

  var body: some View {
    HStack(spacing: 3) {
      if let icon = icon {
        Image(systemName: icon)
          .font(.caption2)
      }
      Text(text)
        .font(.caption2)
        .fontWeight(.medium)
    }
    .foregroundStyle(color)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(color.opacity(0.15))
    .clipShape(Capsule())
  }
}

// MARK: - Previews

#Preview("Flight List - With Flights") {
  FlightListView()
}

#Preview("Flight List - Empty") {
  FlightListView()
}
