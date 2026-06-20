import SwiftUI
import CoreLocation
import OSLog

/// Main astronomy view displaying sun times, moon phases, events, and stargazing spots
struct AstronomyView: View {
  let latitude: Double
  let longitude: Double
  let locationName: String

  @State private var selectedDate = Date()
  @State private var sunTimes: SunTimes?
  @State private var moonPhase: MoonPhase?
  @State private var events: [AstronomicalEvent] = []
  @State private var stargazingSpots: [StargazingSpot] = []
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var selectedTab = 0

  @Environment(\.colorScheme) private var colorScheme

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "AstronomyView")
  private let dateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        // Header with location and date picker
        headerSection

        if isLoading {
          loadingView
        } else if let error = errorMessage {
          errorView(error)
        } else {
          // Sun times card
          if let sunTimes = sunTimes {
            sunTimesCard(sunTimes)
          }

          // Moon phase card
          if let moonPhase = moonPhase {
            moonPhaseCard(moonPhase)
          }

          // Photography golden hours
          if let sunTimes = sunTimes {
            photographyCard(sunTimes)
          }

          // Astronomical events
          if !events.isEmpty {
            eventsSection
          }

          // Stargazing spots
          if !stargazingSpots.isEmpty {
            stargazingSpotsSection
          }
        }
      }
      .padding()
    }
    .background(DesignTokens.Colors.backgroundGrouped)
    .navigationTitle("天文信息")
    .navigationBarTitleDisplayMode(.large)
    .task {
      await loadData()
    }
    .onChange(of: selectedDate) { _, _ in
      Task {
        await loadData()
      }
    }
  }

  // MARK: - Header Section

  private var headerSection: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Location info
      HStack {
        Image(systemName: "location.fill")
          .foregroundStyle(DesignTokens.Colors.accent)
        Text(locationName)
          .font(.headline)
        Spacer()
      }

      // Date picker
      DatePicker(
        "选择日期",
        selection: $selectedDate,
        displayedComponents: .date
      )
      .datePickerStyle(.compact)
      .labelsHidden()
    }
    .padding()
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  // MARK: - Sun Times Card

  private func sunTimesCard(_ sunTimes: SunTimes) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        Label("日出日落", systemImage: "sun.horizon.fill")
          .font(.headline)
          .foregroundStyle(.orange)
        Spacer()
        Text(sunTimes.formattedDayLength)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      Divider()

      // Main sun times
      HStack(spacing: DesignTokens.Spacing.xl) {
        // Sunrise
        VStack(spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "sunrise.fill")
            .font(.system(size: 32))
            .foregroundStyle(.orange.gradient)
          Text("日出")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(formatTime(sunTimes.sunrise))
            .font(.title2)
            .fontWeight(.semibold)
        }

        Spacer()

        // Solar noon
        VStack(spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "sun.max.fill")
            .font(.system(size: 32))
            .foregroundStyle(.yellow.gradient)
          Text("正午")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(formatTime(sunTimes.solarNoon))
            .font(.title2)
            .fontWeight(.semibold)
        }

        Spacer()

        // Sunset
        VStack(spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "sunset.fill")
            .font(.system(size: 32))
            .foregroundStyle(.red.gradient)
          Text("日落")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(formatTime(sunTimes.sunset))
            .font(.title2)
            .fontWeight(.semibold)
        }
      }
      .padding(.vertical, DesignTokens.Spacing.sm)

      Divider()

      // Twilight times
      VStack(spacing: DesignTokens.Spacing.sm) {
        twilightRow(
          title: "民用曙暮光",
          start: sunTimes.civilDawn,
          end: sunTimes.civilDusk,
          color: .blue
        )
        twilightRow(
          title: "航海曙暮光",
          start: sunTimes.nauticalDawn,
          end: sunTimes.nauticalDusk,
          color: .indigo
        )
        twilightRow(
          title: "天文曙暮光",
          start: sunTimes.astronomicalDawn,
          end: sunTimes.astronomicalDusk,
          color: .purple
        )
      }
    }
    .padding()
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  private func twilightRow(title: String, start: String, end: String, color: Color) -> some View {
    HStack {
      Circle()
        .fill(color)
        .frame(width: 8, height: 8)
      Text(title)
        .font(.subheadline)
      Spacer()
      Text("\(formatTime(start)) - \(formatTime(end))")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
  }

  // MARK: - Moon Phase Card

  private func moonPhaseCard(_ moonPhase: MoonPhase) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        Label("月相", systemImage: "moon.fill")
          .font(.headline)
          .foregroundStyle(.purple)
        Spacer()
      }

      Divider()

      HStack(spacing: DesignTokens.Spacing.lg) {
        // Moon emoji
        Text(moonPhase.emoji)
          .font(.system(size: 64))

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          Text(moonPhase.phase.displayName)
            .font(.title3)
            .fontWeight(.semibold)

          HStack {
            Text("光照度")
              .foregroundStyle(.secondary)
            Text(moonPhase.illuminationPercent)
              .fontWeight(.medium)
          }
          .font(.subheadline)

          HStack {
            Image(systemName: moonPhase.isWaxing ? "arrow.up.right" : "arrow.down.right")
              .foregroundStyle(moonPhase.isWaxing ? .green : .orange)
            Text(moonPhase.isWaxing ? "渐盈" : "渐亏")
              .foregroundStyle(.secondary)
          }
          .font(.subheadline)
        }

        Spacer()
      }

      Divider()

      // Days until full/new moon
      HStack {
        VStack {
          Text("\(moonPhase.daysUntilFullMoon)")
            .font(.title2)
            .fontWeight(.bold)
            .foregroundStyle(.yellow)
          Text("天后满月")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        VStack {
          Text("\(moonPhase.daysUntilNewMoon)")
            .font(.title2)
            .fontWeight(.bold)
            .foregroundStyle(.gray)
          Text("天后新月")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.xl)
    }
    .padding()
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  // MARK: - Photography Card

  private func photographyCard(_ sunTimes: SunTimes) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        Label("摄影黄金时段", systemImage: "camera.fill")
          .font(.headline)
          .foregroundStyle(.orange)
        Spacer()
      }

      Divider()

      // Morning golden hour
      photographyTimeRow(
        icon: "sunrise.fill",
        title: "晨间黄金时段",
        subtitle: "柔和暖光，适合人像和风景",
        start: sunTimes.goldenHourMorningStart,
        end: sunTimes.goldenHourMorningEnd,
        color: .orange
      )

      // Morning blue hour
      photographyTimeRow(
        icon: "moon.stars.fill",
        title: "晨间蓝调时刻",
        subtitle: "冷色调，适合城市和建筑",
        start: sunTimes.blueHourMorningStart,
        end: sunTimes.blueHourMorningEnd,
        color: .blue
      )

      Divider()

      // Evening golden hour
      photographyTimeRow(
        icon: "sunset.fill",
        title: "傍晚黄金时段",
        subtitle: "温暖光线，最佳拍摄时机",
        start: sunTimes.goldenHourEveningStart,
        end: sunTimes.goldenHourEveningEnd,
        color: .orange
      )

      // Evening blue hour
      photographyTimeRow(
        icon: "moon.fill",
        title: "傍晚蓝调时刻",
        subtitle: "梦幻氛围，适合夜景",
        start: sunTimes.blueHourEveningStart,
        end: sunTimes.blueHourEveningEnd,
        color: .indigo
      )
    }
    .padding()
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  private func photographyTimeRow(
    icon: String,
    title: String,
    subtitle: String,
    start: String,
    end: String,
    color: Color
  ) -> some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: icon)
        .font(.title2)
        .foregroundStyle(color.gradient)
        .frame(width: 32)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.subheadline)
          .fontWeight(.medium)
        Text(subtitle)
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing) {
        Text("\(formatTime(start))")
          .font(.subheadline)
          .fontWeight(.semibold)
        Text("- \(formatTime(end))")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Events Section

  private var eventsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack {
        Label("天文事件", systemImage: "sparkles")
          .font(.headline)
          .foregroundStyle(.blue)
        Spacer()
        Text("未来30天")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      ForEach(events) { event in
        eventRow(event)
      }
    }
    .padding()
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  private func eventRow(_ event: AstronomicalEvent) -> some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Event type icon
      Image(systemName: event.type.icon)
        .font(.title2)
        .foregroundStyle(Color(event.type.color))
        .frame(width: 40, height: 40)
        .background(Color(event.type.color).opacity(0.15))
        .clipShape(Circle())

      VStack(alignment: .leading, spacing: 2) {
        Text(event.name)
          .font(.subheadline)
          .fontWeight(.medium)

        Text(event.description)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)

        HStack {
          Text(formatEventDate(event.startDate))
            .font(.caption2)
            .foregroundStyle(.blue)

          Text("·")
            .foregroundStyle(.secondary)
          Text(event.visibility.displayName)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Stargazing Spots Section

  private var stargazingSpotsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack {
        Label("观星地点", systemImage: "star.fill")
          .font(.headline)
          .foregroundStyle(.yellow)
        Spacer()
      }

      ForEach(stargazingSpots) { spot in
        stargazingSpotRow(spot)
      }
    }
    .padding()
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  private func stargazingSpotRow(_ spot: StargazingSpot) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text(spot.name)
          .font(.subheadline)
          .fontWeight(.medium)

        Spacer()

        if let distance = spot.formattedDistance {
          Text(distance)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      if let description = spot.description {
        Text(description)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(2)
      }

      HStack(spacing: DesignTokens.Spacing.md) {
        // Bortle scale
        HStack(spacing: 4) {
          Image(systemName: "moon.stars")
            .font(.caption)
          Text("波特尔 \(spot.bortleScale)")
            .font(.caption)
        }
        .foregroundStyle(bortleColor(spot.bortleScale))

        // Light pollution
        Text(spot.lightPollutionLevel.displayName)
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        // Best seasons
        if let seasons = spot.bestSeasonsDescription {
          Text(seasons)
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }

      // Facilities
      if let facilities = spot.facilities, !facilities.isEmpty {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(facilities, id: \.self) { facility in
              Text(facility)
                .font(.caption2)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.1))
                .foregroundStyle(.blue)
                .clipShape(Capsule())
            }
          }
        }
      }
    }
    .padding()
    .background(DesignTokens.Colors.backgroundSecondary)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
  }

  private func bortleColor(_ scale: Int) -> Color {
    switch scale {
    case 1...2: return .green
    case 3...4: return .yellow
    case 5...6: return .orange
    default: return .red
    }
  }

  // MARK: - Loading & Error Views

  private var loadingView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ProgressView()
        .scaleEffect(1.5)
      Text("加载天文数据...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
  }

  private func errorView(_ message: String) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "exclamationmark.triangle")
        .font(.largeTitle)
        .foregroundStyle(.orange)
      Text(message)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Button("重试") {
        Task {
          await loadData()
        }
      }
      .buttonStyle(.primary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 60)
  }

  // MARK: - Helper Methods

  private func formatTime(_ isoString: String) -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    // Try with fractional seconds first
    if let date = formatter.date(from: isoString) {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      return timeFormatter.string(from: date)
    }

    // Try without fractional seconds
    formatter.formatOptions = [.withInternetDateTime]
    if let date = formatter.date(from: isoString) {
      let timeFormatter = DateFormatter()
      timeFormatter.dateFormat = "HH:mm"
      return timeFormatter.string(from: date)
    }

    // Return original if parsing fails
    return isoString
  }

  private func formatEventDate(_ dateString: String) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"

    if let date = formatter.date(from: dateString) {
      let displayFormatter = DateFormatter()
      displayFormatter.dateFormat = "M月d日"
      return displayFormatter.string(from: date)
    }

    return dateString
  }

  // MARK: - Data Loading

  private func loadData() async {
    isLoading = true
    errorMessage = nil

    let dateString = dateFormatter.string(from: selectedDate)

    do {
      // Fetch sun times
      sunTimes = try await AstronomyAPIClient.shared.fetchSunTimes(
        latitude: latitude,
        longitude: longitude,
        date: dateString
      )

      // Fetch moon phase
      moonPhase = try await AstronomyAPIClient.shared.fetchMoonPhase(date: dateString)

      // Fetch events for next 30 days
      let endDate = Calendar.current.date(byAdding: .day, value: 30, to: selectedDate)!
      let endDateString = dateFormatter.string(from: endDate)
      events = try await AstronomyAPIClient.shared.fetchAstronomicalEvents(
        startDate: dateString,
        endDate: endDateString
      )

      // Fetch stargazing spots
      stargazingSpots = try await AstronomyAPIClient.shared.fetchStargazingSpots(
        latitude: latitude,
        longitude: longitude,
        radiusKm: 200,
        limit: 5
      )

      logger.info("Astronomy data loaded successfully")
    } catch {
      logger.error("Failed to load astronomy data: \(error.localizedDescription)")
      errorMessage = "无法加载天文数据: \(error.localizedDescription)"
    }

    isLoading = false
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    AstronomyView(
      latitude: 39.9042,
      longitude: 116.4074,
      locationName: "北京"
    )
  }
}
