import SwiftUI

/// Time difference display component for showing timezone differences
struct TimeDifferenceView: View {
  let sourceTimezone: String
  let targetTimezone: String
  let sourceName: String?
  let targetName: String?
  let style: TimeDifferenceStyle

  @State private var currentTime = Date()
  private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

  enum TimeDifferenceStyle {
    case compact    // Small inline display
    case card       // Card with more details
    case detailed   // Full comparison view
  }

  init(
    from sourceTimezone: String,
    to targetTimezone: String,
    sourceName: String? = nil,
    targetName: String? = nil,
    style: TimeDifferenceStyle = .compact
  ) {
    self.sourceTimezone = sourceTimezone
    self.targetTimezone = targetTimezone
    self.sourceName = sourceName
    self.targetName = targetName
    self.style = style
  }

  var body: some View {
    Group {
      switch style {
      case .compact:
        compactView
      case .card:
        cardView
      case .detailed:
        detailedView
      }
    }
    .onReceive(timer) { _ in
      currentTime = Date()
    }
  }

  // MARK: - Compact View

  private var compactView: some View {
    HStack(spacing: 4) {
      Image(systemName: timeDifference.isAhead ? "arrow.up.circle.fill" : "arrow.down.circle.fill")
        .foregroundStyle(timeDifference.isAhead ? .green : .orange)
        .font(.caption)

      Text(timeDifference.formatted)
        .font(.caption)
        .fontWeight(.medium)
        .foregroundStyle(timeDifference.isAhead ? .green : .orange)
    }
  }

  // MARK: - Card View

  private var cardView: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Source time
      VStack(alignment: .leading, spacing: 4) {
        Text(sourceName ?? formatTimezoneName(sourceTimezone))
          .font(.caption)
          .foregroundStyle(.secondary)

        Text(formatTime(for: sourceTimezone))
          .font(.title2)
          .fontWeight(.semibold)
          .monospacedDigit()
      }

      // Arrow with difference
      VStack(spacing: 2) {
        Image(systemName: "arrow.right")
          .font(.caption)
          .foregroundStyle(.secondary)

        Text(timeDifference.formatted)
          .font(.caption2)
          .fontWeight(.medium)
          .foregroundStyle(differenceColor)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .background(differenceColor.opacity(0.1))
          .clipShape(Capsule())
      }

      // Target time
      VStack(alignment: .trailing, spacing: 4) {
        Text(targetName ?? formatTimezoneName(targetTimezone))
          .font(.caption)
          .foregroundStyle(.secondary)

        Text(formatTime(for: targetTimezone))
          .font(.title2)
          .fontWeight(.semibold)
          .monospacedDigit()
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  // MARK: - Detailed View

  private var detailedView: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      // Header
      HStack {
        Text("时区对比")
          .font(.headline)
        Spacer()
        Text(timeDifference.description)
          .font(.subheadline)
          .foregroundStyle(differenceColor)
      }

      // Time comparison
      HStack(spacing: DesignTokens.Spacing.lg) {
        // Source
        TimezoneColumn(
          name: sourceName ?? formatTimezoneName(sourceTimezone),
          timezone: sourceTimezone,
          currentTime: currentTime,
          isHome: true
        )

        // Divider with arrow
        VStack(spacing: DesignTokens.Spacing.xs) {
          Rectangle()
            .fill(Color.secondary.opacity(0.3))
            .frame(width: 1, height: 40)

          ZStack {
            Circle()
              .fill(differenceColor.opacity(0.1))
              .frame(width: 44, height: 44)

            VStack(spacing: 0) {
              Image(systemName: timeDifference.isAhead ? "arrow.right" : "arrow.left")
                .font(.caption)

              Text(timeDifference.formatted)
                .font(.caption2)
                .fontWeight(.bold)
            }
            .foregroundStyle(differenceColor)
          }

          Rectangle()
            .fill(Color.secondary.opacity(0.3))
            .frame(width: 1, height: 40)
        }

        // Target
        TimezoneColumn(
          name: targetName ?? formatTimezoneName(targetTimezone),
          timezone: targetTimezone,
          currentTime: currentTime,
          isHome: false
        )
      }

      // Day difference indicator
      if dayDifference != 0 {
        HStack {
          Image(systemName: "calendar")
            .foregroundStyle(.orange)

          Text(dayDifferenceDescription)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(DesignTokens.Spacing.sm)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
      }
    }
    .padding(DesignTokens.Spacing.lg)
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
  }

  // MARK: - Computed Properties

  private var timeDifference: TimeDifference {
    TimezoneStore.shared.calculateTimeDifference(from: sourceTimezone, to: targetTimezone)
  }

  private var differenceColor: Color {
    let diff = timeDifference
    if diff.hours == 0 && diff.minutes == 0 {
      return .secondary
    }
    return diff.isAhead ? .green : .orange
  }

  private var dayDifference: Int {
    guard let sourceTz = TimeZone(identifier: sourceTimezone),
          let targetTz = TimeZone(identifier: targetTimezone) else { return 0 }

    let calendar = Calendar.current
    let sourceDay = calendar.component(.day, from: currentTime.addingTimeInterval(TimeInterval(sourceTz.secondsFromGMT(for: currentTime))))
    let targetDay = calendar.component(.day, from: currentTime.addingTimeInterval(TimeInterval(targetTz.secondsFromGMT(for: currentTime))))

    return targetDay - sourceDay
  }

  private var dayDifferenceDescription: String {
    if dayDifference > 0 {
      return "目的地已是第二天"
    } else if dayDifference < 0 {
      return "目的地还是前一天"
    }
    return ""
  }

  // MARK: - Helper Methods

  private func formatTime(for timezone: String) -> String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: currentTime)
  }

  private func formatTimezoneName(_ identifier: String) -> String {
    if let lastComponent = identifier.split(separator: "/").last {
      return String(lastComponent).replacingOccurrences(of: "_", with: " ")
    }
    return identifier
  }
}

// MARK: - Timezone Column

private struct TimezoneColumn: View {
  let name: String
  let timezone: String
  let currentTime: Date
  let isHome: Bool

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // Label
      HStack(spacing: 4) {
        if isHome {
          Image(systemName: "house.fill")
            .font(.caption2)
            .foregroundStyle(DesignTokens.Colors.accent)
        }

        Text(isHome ? "timezone.departure".localized : "timezone.destination".localized)
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      // City name
      Text(name)
        .font(.subheadline)
        .fontWeight(.medium)
        .lineLimit(1)

      // Time
      Text(formattedTime)
        .font(.system(size: 32, weight: .light, design: .rounded))
        .monospacedDigit()

      // Date
      Text(formattedDate)
        .font(.caption)
        .foregroundStyle(.secondary)

      // UTC offset
      Text(formattedOffset)
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity)
  }

  private var formattedTime: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: currentTime)
  }

  private var formattedDate: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "M月d日 EEE"
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: currentTime)
  }

  private var formattedOffset: String {
    guard let tz = TimeZone(identifier: timezone) else { return "" }
    let seconds = tz.secondsFromGMT(for: currentTime)
    let hours = seconds / 3600
    let minutes = abs(seconds / 60) % 60
    let sign = hours >= 0 ? "+" : ""
    return minutes > 0 ? "UTC\(sign)\(hours):\(String(format: "%02d", minutes))" : "UTC\(sign)\(hours)"
  }
}

// MARK: - Itinerary Time Converter

/// A view for converting itinerary times between timezones
struct ItineraryTimeConverterView: View {
  let itineraryTimezone: String
  let homeTimezone: String
  let itineraryTime: Date
  let poiName: String?

  @State private var showBothTimes = true

  init(
    itineraryTimezone: String,
    homeTimezone: String = TimeZone.current.identifier,
    itineraryTime: Date,
    poiName: String? = nil
  ) {
    self.itineraryTimezone = itineraryTimezone
    self.homeTimezone = homeTimezone
    self.itineraryTime = itineraryTime
    self.poiName = poiName
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      // POI name if provided
      if let name = poiName {
        Text(name)
          .font(.subheadline)
          .fontWeight(.medium)
      }

      // Time display
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Local time (destination)
        VStack(alignment: .leading, spacing: 2) {
          Text("当地时间")
            .font(.caption2)
            .foregroundStyle(.secondary)

          Text(formatTime(for: itineraryTimezone))
            .font(.headline)
            .monospacedDigit()
        }

        if showBothTimes && homeTimezone != itineraryTimezone {
          Divider()
            .frame(height: 30)

          // Home time
          VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 2) {
              Image(systemName: "house.fill")
                .font(.caption2)
              Text("家乡时间")
                .font(.caption2)
            }
            .foregroundStyle(.secondary)

            Text(formatTime(for: homeTimezone))
              .font(.headline)
              .monospacedDigit()
              .foregroundStyle(DesignTokens.Colors.accent)
          }
        }

        Spacer()

        // Toggle button
        Button {
          withAnimation(.easeInOut(duration: 0.2)) {
            showBothTimes.toggle()
          }
        } label: {
          Image(systemName: showBothTimes ? "clock.badge.checkmark" : "clock")
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .background(DesignTokens.Colors.fillTertiary)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
  }

  private func formatTime(for timezone: String) -> String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: itineraryTime)
  }
}

// MARK: - Time Zone Reminder Banner

/// A banner showing time difference reminder for travel
struct TimezoneReminderBanner: View {
  let destinationTimezone: String
  let destinationName: String
  let homeTimezone: String

  @State private var isExpanded = false

  var body: some View {
    VStack(spacing: 0) {
      // Main banner
      Button {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
          isExpanded.toggle()
        }
      } label: {
        HStack(spacing: DesignTokens.Spacing.sm) {
          Image(systemName: "clock.badge.exclamationmark")
            .font(.title3)
            .foregroundStyle(.orange)

          VStack(alignment: .leading, spacing: 2) {
            Text("时差提醒")
              .font(.subheadline)
              .fontWeight(.medium)
              .foregroundStyle(.primary)

            Text("\(destinationName) \(timeDifferenceText)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }

          Spacer()

          Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(DesignTokens.Spacing.md)
        .background(Color.orange.opacity(0.1))
      }
      .buttonStyle(.plain)

      // Expanded content
      if isExpanded {
        VStack(spacing: DesignTokens.Spacing.md) {
          TimeDifferenceView(
            from: homeTimezone,
            to: destinationTimezone,
            sourceName: "家",
            targetName: destinationName,
            style: .detailed
          )

          // Tips
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            TipRow(icon: "bed.double.fill", text: "建议提前调整作息时间")
            TipRow(icon: "sun.max.fill", text: "多晒太阳有助于调整生物钟")
            TipRow(icon: "drop.fill", text: "保持充足水分摄入")
          }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.backgroundSecondary)
      }
    }
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(Color.orange.opacity(0.3), lineWidth: 1)
    )
  }

  private var timeDifferenceText: String {
    let diff = TimezoneStore.shared.calculateTimeDifference(from: homeTimezone, to: destinationTimezone)
    return diff.description
  }
}

// MARK: - Tip Row

private struct TipRow: View {
  let icon: String
  let text: String

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: icon)
        .font(.caption)
        .foregroundStyle(.orange)
        .frame(width: 20)

      Text(text)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
  }
}

// MARK: - Previews

#Preview("Compact") {
  TimeDifferenceView(
    from: "Asia/Shanghai",
    to: "America/New_York",
    style: .compact
  )
  .padding()
}

#Preview("Card") {
  TimeDifferenceView(
    from: "Asia/Shanghai",
    to: "Europe/London",
    sourceName: "上海",
    targetName: "伦敦",
    style: .card
  )
  .padding()
}

#Preview("Detailed") {
  TimeDifferenceView(
    from: "Asia/Shanghai",
    to: "America/Los_Angeles",
    sourceName: "上海",
    targetName: "洛杉矶",
    style: .detailed
  )
  .padding()
}

#Preview("Itinerary Time Converter") {
  ItineraryTimeConverterView(
    itineraryTimezone: "Europe/Paris",
    homeTimezone: "Asia/Shanghai",
    itineraryTime: Date(),
    poiName: "埃菲尔铁塔"
  )
  .padding()
}

#Preview("Timezone Reminder Banner") {
  TimezoneReminderBanner(
    destinationTimezone: "America/New_York",
    destinationName: "纽约",
    homeTimezone: "Asia/Shanghai"
  )
  .padding()
}
