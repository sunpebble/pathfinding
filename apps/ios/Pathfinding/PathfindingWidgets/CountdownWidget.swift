import SwiftUI
import WidgetKit

// MARK: - Countdown Widget Entry

struct CountdownEntry: TimelineEntry {
  let date: Date
  let itinerary: WidgetItineraryData?
  let configuration: ConfigurationAppIntent
}

// MARK: - Countdown Widget Provider

struct CountdownProvider: AppIntentTimelineProvider {
  typealias Entry = CountdownEntry
  typealias Intent = ConfigurationAppIntent

  func placeholder(in context: Context) -> CountdownEntry {
    CountdownEntry(
      date: Date(),
      itinerary: .sample,
      configuration: ConfigurationAppIntent()
    )
  }

  func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> CountdownEntry {
    let itinerary = loadItineraryData()
    return CountdownEntry(
      date: Date(),
      itinerary: itinerary ?? .sample,
      configuration: configuration
    )
  }

  func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<CountdownEntry> {
    let itinerary = loadItineraryData()

    let currentDate = Date()
    let entry = CountdownEntry(
      date: currentDate,
      itinerary: itinerary,
      configuration: configuration
    )

    // Update at midnight for day changes
    let calendar = Calendar.current
    let tomorrow = calendar.startOfDay(for: calendar.date(byAdding: .day, value: 1, to: currentDate)!)

    return Timeline(entries: [entry], policy: .after(tomorrow))
  }

  private func loadItineraryData() -> WidgetItineraryData? {
    guard let defaults = UserDefaults(suiteName: AppGroupConstants.suiteName),
          let data = defaults.data(forKey: AppGroupConstants.upcomingItineraryKey),
          let itinerary = try? JSONDecoder().decode(WidgetItineraryData.self, from: data)
    else { return nil }
    return itinerary
  }
}

// MARK: - Countdown Widget View

struct CountdownWidgetEntryView: View {
  var entry: CountdownEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:
      SmallCountdownView(itinerary: entry.itinerary)
    case .systemMedium:
      MediumCountdownView(itinerary: entry.itinerary)
    case .systemLarge:
      LargeCountdownView(itinerary: entry.itinerary)
    case .accessoryCircular:
      CircularCountdownView(itinerary: entry.itinerary)
    case .accessoryRectangular:
      RectangularCountdownView(itinerary: entry.itinerary)
    case .accessoryInline:
      InlineCountdownView(itinerary: entry.itinerary)
    default:
      SmallCountdownView(itinerary: entry.itinerary)
    }
  }
}

// MARK: - Small Countdown View

struct SmallCountdownView: View {
  let itinerary: WidgetItineraryData?

  var body: some View {
    if let itinerary {
      VStack(alignment: .leading, spacing: 8) {
        // Destination
        HStack {
          Image(systemName: "airplane")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(itinerary.destination ?? "未知目的地")
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }

        Spacer()

        // Countdown number
        if itinerary.isInProgress {
          VStack(alignment: .leading, spacing: 2) {
            Text("Day \(itinerary.currentDayNumber ?? 1)")
              .font(.system(size: 32, weight: .bold, design: .rounded))
              .foregroundStyle(.green)
            Text("旅途进行中")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        } else if itinerary.hasEnded {
          VStack(alignment: .leading, spacing: 2) {
            Text("已结束")
              .font(.title2)
              .fontWeight(.bold)
              .foregroundStyle(.secondary)
            Text(itinerary.formattedDateRange)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        } else {
          VStack(alignment: .leading, spacing: 2) {
            Text("\(itinerary.daysUntilStart)")
              .font(.system(size: 42, weight: .bold, design: .rounded))
              .foregroundStyle(.blue)
            Text("天后出发")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Title
        Text(itinerary.title)
          .font(.caption)
          .fontWeight(.medium)
          .lineLimit(2)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
    } else {
      EmptyCountdownView()
    }
  }
}

// MARK: - Medium Countdown View

struct MediumCountdownView: View {
  let itinerary: WidgetItineraryData?

  var body: some View {
    if let itinerary {
      HStack(spacing: 16) {
        // Left: Countdown
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Image(systemName: "airplane.departure")
              .foregroundStyle(.blue)
            Text(itinerary.destination ?? "未知目的地")
              .font(.subheadline)
              .fontWeight(.semibold)
          }

          Spacer()

          if itinerary.isInProgress {
            VStack(alignment: .leading, spacing: 2) {
              HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("Day")
                  .font(.title3)
                  .foregroundStyle(.secondary)
                Text("\(itinerary.currentDayNumber ?? 1)")
                  .font(.system(size: 48, weight: .bold, design: .rounded))
                  .foregroundStyle(.green)
              }
              Text("旅途进行中")
                .font(.caption)
                .foregroundStyle(.green)
            }
          } else if itinerary.hasEnded {
            VStack(alignment: .leading) {
              Text("旅途已结束")
                .font(.title3)
                .foregroundStyle(.secondary)
              Text(itinerary.formattedDateRange)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          } else {
            VStack(alignment: .leading, spacing: 2) {
              HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(itinerary.daysUntilStart)")
                  .font(.system(size: 48, weight: .bold, design: .rounded))
                  .foregroundStyle(.blue)
                Text("天")
                  .font(.title3)
                  .foregroundStyle(.secondary)
              }
              Text("后出发")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          Spacer()

          Text(itinerary.title)
            .font(.caption)
            .lineLimit(1)
            .foregroundStyle(.secondary)
        }

        Divider()

        // Right: Trip info
        VStack(alignment: .leading, spacing: 8) {
          InfoRow(icon: "calendar", title: "日期", value: itinerary.formattedDateRange)
          InfoRow(icon: "clock", title: "行程", value: "\(itinerary.daysCount)天")
          InfoRow(icon: "mappin.circle", title: "景点", value: "\(itinerary.totalPois)个")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding()
    } else {
      EmptyCountdownView()
    }
  }
}

// MARK: - Large Countdown View

struct LargeCountdownView: View {
  let itinerary: WidgetItineraryData?

  var body: some View {
    if let itinerary {
      VStack(alignment: .leading, spacing: 16) {
        // Header
        HStack {
          VStack(alignment: .leading) {
            Text(itinerary.title)
              .font(.headline)
              .lineLimit(1)
            HStack {
              Image(systemName: "mappin.and.ellipse")
              Text(itinerary.destination ?? "未知目的地")
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
          }

          Spacer()

          // Countdown badge
          if itinerary.isInProgress {
            Text("进行中")
              .font(.caption)
              .fontWeight(.semibold)
              .padding(.horizontal, 12)
              .padding(.vertical, 6)
              .background(.green.opacity(0.2))
              .foregroundStyle(.green)
              .clipShape(Capsule())
          } else if !itinerary.hasEnded {
            Text("\(itinerary.daysUntilStart)天后")
              .font(.caption)
              .fontWeight(.semibold)
              .padding(.horizontal, 12)
              .padding(.vertical, 6)
              .background(.blue.opacity(0.2))
              .foregroundStyle(.blue)
              .clipShape(Capsule())
          }
        }

        Divider()

        // Main countdown
        HStack {
          if itinerary.isInProgress {
            CountdownNumberView(
              number: itinerary.currentDayNumber ?? 1,
              label: "当前天数",
              color: .green
            )
            CountdownNumberView(
              number: itinerary.daysCount - (itinerary.currentDayNumber ?? 1),
              label: "剩余天数",
              color: .orange
            )
          } else if itinerary.hasEnded {
            VStack {
              Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 40))
                .foregroundStyle(.green)
              Text("旅途已圆满结束")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
          } else {
            CountdownNumberView(
              number: itinerary.daysUntilStart,
              label: "距出发",
              color: .blue
            )
            CountdownNumberView(
              number: itinerary.daysCount,
              label: "行程天数",
              color: .purple
            )
          }
        }

        Divider()

        // Info grid
        HStack(spacing: 24) {
          VStack(alignment: .leading, spacing: 4) {
            Label("出发", systemImage: "airplane.departure")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text(formatDate(itinerary.startDate))
              .font(.caption)
              .fontWeight(.medium)
          }

          VStack(alignment: .leading, spacing: 4) {
            Label("返回", systemImage: "airplane.arrival")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text(formatDate(itinerary.endDate))
              .font(.caption)
              .fontWeight(.medium)
          }

          VStack(alignment: .leading, spacing: 4) {
            Label("景点", systemImage: "mappin.circle")
              .font(.caption2)
              .foregroundStyle(.secondary)
            Text("\(itinerary.totalPois)个")
              .font(.caption)
              .fontWeight(.medium)
          }
        }
      }
      .padding()
    } else {
      EmptyCountdownView()
    }
  }

  private func formatDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "M月d日"
    return formatter.string(from: date)
  }
}

// MARK: - Circular Countdown View (Lock Screen)

struct CircularCountdownView: View {
  let itinerary: WidgetItineraryData?

  var body: some View {
    if let itinerary {
      if itinerary.isInProgress {
        Gauge(value: Double(itinerary.currentDayNumber ?? 1), in: 0...Double(itinerary.daysCount)) {
          Image(systemName: "airplane")
        } currentValueLabel: {
          Text("D\(itinerary.currentDayNumber ?? 1)")
            .font(.system(.body, design: .rounded, weight: .bold))
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(.green)
      } else if itinerary.hasEnded {
        ZStack {
          AccessoryWidgetBackground()
          Image(systemName: "checkmark.circle.fill")
            .font(.title)
        }
      } else {
        Gauge(value: 1.0 - Double(min(itinerary.daysUntilStart, 30)) / 30.0) {
          Image(systemName: "airplane")
        } currentValueLabel: {
          Text("\(itinerary.daysUntilStart)")
            .font(.system(.title2, design: .rounded, weight: .bold))
        }
        .gaugeStyle(.accessoryCircularCapacity)
        .tint(.blue)
      }
    } else {
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "airplane")
          .font(.title2)
      }
    }
  }
}

// MARK: - Rectangular Countdown View (Lock Screen)

struct RectangularCountdownView: View {
  let itinerary: WidgetItineraryData?

  var body: some View {
    if let itinerary {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(itinerary.title)
            .font(.headline)
            .lineLimit(1)

          if itinerary.isInProgress {
            Text("Day \(itinerary.currentDayNumber ?? 1)/\(itinerary.daysCount) - 进行中")
              .font(.caption)
              .foregroundStyle(.secondary)
          } else if itinerary.hasEnded {
            Text("已结束")
              .font(.caption)
              .foregroundStyle(.secondary)
          } else {
            Text("\(itinerary.daysUntilStart)天后出发")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        if itinerary.isInProgress {
          Text("D\(itinerary.currentDayNumber ?? 1)")
            .font(.system(.title, design: .rounded, weight: .bold))
            .foregroundStyle(.green)
        } else if !itinerary.hasEnded {
          Text("\(itinerary.daysUntilStart)")
            .font(.system(.title, design: .rounded, weight: .bold))
            .foregroundStyle(.blue)
        }
      }
    } else {
      HStack {
        Image(systemName: "airplane")
        Text("暂无行程")
          .font(.caption)
      }
    }
  }
}

// MARK: - Inline Countdown View (Lock Screen)

struct InlineCountdownView: View {
  let itinerary: WidgetItineraryData?

  var body: some View {
    if let itinerary {
      if itinerary.isInProgress {
        Label("Day \(itinerary.currentDayNumber ?? 1) \(itinerary.title)", systemImage: "airplane")
      } else if itinerary.hasEnded {
        Label("\(itinerary.title) 已结束", systemImage: "checkmark.circle")
      } else {
        Label("\(itinerary.daysUntilStart)天后 \(itinerary.title)", systemImage: "airplane")
      }
    } else {
      Label("暂无行程", systemImage: "airplane")
    }
  }
}

// MARK: - Empty View

struct EmptyCountdownView: View {
  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: "airplane.circle")
        .font(.largeTitle)
        .foregroundStyle(.secondary)

      Text("暂无行程")
        .font(.subheadline)
        .foregroundStyle(.secondary)

      Text("打开探路添加行程")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Helper Views

struct InfoRow: View {
  let icon: String
  let title: String
  let value: String

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: icon)
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(width: 16)

      Text(title)
        .font(.caption2)
        .foregroundStyle(.secondary)

      Spacer()

      Text(value)
        .font(.caption)
        .fontWeight(.medium)
    }
  }
}

struct CountdownNumberView: View {
  let number: Int
  let label: String
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Text("\(number)")
        .font(.system(size: 36, weight: .bold, design: .rounded))
        .foregroundStyle(color)

      Text(label)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Widget Definition

struct CountdownWidget: Widget {
  let kind: String = "CountdownWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: CountdownProvider()) { entry in
      CountdownWidgetEntryView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("行程倒计时")
    .description("显示下一个行程的倒计时")
    .supportedFamilies([
      .systemSmall,
      .systemMedium,
      .systemLarge,
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryInline
    ])
  }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
  CountdownWidget()
} timeline: {
  CountdownEntry(date: .now, itinerary: .sample, configuration: ConfigurationAppIntent())
  CountdownEntry(date: .now, itinerary: .inProgressSample, configuration: ConfigurationAppIntent())
  CountdownEntry(date: .now, itinerary: nil, configuration: ConfigurationAppIntent())
}

#Preview("Medium", as: .systemMedium) {
  CountdownWidget()
} timeline: {
  CountdownEntry(date: .now, itinerary: .sample, configuration: ConfigurationAppIntent())
}

#Preview("Large", as: .systemLarge) {
  CountdownWidget()
} timeline: {
  CountdownEntry(date: .now, itinerary: .sample, configuration: ConfigurationAppIntent())
}
