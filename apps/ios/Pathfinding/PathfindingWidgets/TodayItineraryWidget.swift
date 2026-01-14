import SwiftUI
import WidgetKit

// MARK: - Today Itinerary Widget Entry

struct TodayItineraryEntry: TimelineEntry {
  let date: Date
  let todayData: WidgetTodayData?
  let configuration: ConfigurationAppIntent
}

// MARK: - Today Itinerary Widget Provider

struct TodayItineraryProvider: AppIntentTimelineProvider {
  typealias Entry = TodayItineraryEntry
  typealias Intent = ConfigurationAppIntent

  func placeholder(in context: Context) -> TodayItineraryEntry {
    TodayItineraryEntry(
      date: Date(),
      todayData: .sample,
      configuration: ConfigurationAppIntent()
    )
  }

  func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> TodayItineraryEntry {
    let todayData = loadTodayData()
    return TodayItineraryEntry(
      date: Date(),
      todayData: todayData ?? .sample,
      configuration: configuration
    )
  }

  func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<TodayItineraryEntry> {
    let todayData = loadTodayData()

    let currentDate = Date()
    let entry = TodayItineraryEntry(
      date: currentDate,
      todayData: todayData,
      configuration: configuration
    )

    // Update every hour to reflect schedule changes
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate)!

    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }

  private func loadTodayData() -> WidgetTodayData? {
    guard let defaults = UserDefaults(suiteName: AppGroupConstants.suiteName),
          let data = defaults.data(forKey: AppGroupConstants.todayItineraryKey),
          let today = try? JSONDecoder().decode(WidgetTodayData.self, from: data)
    else { return nil }

    // Only return if it's today's data
    let calendar = Calendar.current
    if calendar.isDateInToday(today.date) {
      return today
    }
    return nil
  }
}

// MARK: - Today Itinerary Widget View

struct TodayItineraryEntryView: View {
  var entry: TodayItineraryEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:
      SmallTodayView(todayData: entry.todayData)
    case .systemMedium:
      MediumTodayView(todayData: entry.todayData)
    case .systemLarge:
      LargeTodayView(todayData: entry.todayData)
    case .accessoryRectangular:
      RectangularTodayView(todayData: entry.todayData)
    default:
      SmallTodayView(todayData: entry.todayData)
    }
  }
}

// MARK: - Small Today View

struct SmallTodayView: View {
  let todayData: WidgetTodayData?

  var body: some View {
    if let today = todayData {
      VStack(alignment: .leading, spacing: 6) {
        // Header
        HStack {
          Text(today.dayInfo)
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(.blue.opacity(0.2))
            .foregroundStyle(.blue)
            .clipShape(Capsule())

          Spacer()

          if let destination = today.destination {
            Text(destination)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }

        if let theme = today.theme {
          Text(theme)
            .font(.caption)
            .fontWeight(.medium)
            .lineLimit(1)
        }

        Spacer()

        // POI list (show first 3)
        VStack(alignment: .leading, spacing: 4) {
          ForEach(today.pois.prefix(3)) { poi in
            HStack(spacing: 4) {
              Image(systemName: poi.icon)
                .font(.system(size: 8))
                .foregroundStyle(.secondary)
                .frame(width: 12)

              Text(poi.name)
                .font(.caption2)
                .lineLimit(1)

              if let time = poi.time {
                Spacer()
                Text(time)
                  .font(.system(size: 9))
                  .foregroundStyle(.secondary)
              }
            }
          }

          if today.pois.count > 3 {
            Text("+ \(today.pois.count - 3)个地点")
              .font(.caption2)
              .foregroundStyle(.tertiary)
          }
        }
      }
      .padding()
    } else {
      EmptyTodayView()
    }
  }
}

// MARK: - Medium Today View

struct MediumTodayView: View {
  let todayData: WidgetTodayData?

  var body: some View {
    if let today = todayData {
      HStack(spacing: 16) {
        // Left: Day info
        VStack(alignment: .leading, spacing: 8) {
          VStack(alignment: .leading, spacing: 2) {
            Text(today.itineraryTitle)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)

            Text(today.dayInfo)
              .font(.title2)
              .fontWeight(.bold)
          }

          if let theme = today.theme {
            Text(theme)
              .font(.subheadline)
              .fontWeight(.medium)
              .lineLimit(2)
          }

          Spacer()

          HStack {
            Image(systemName: "mappin.circle.fill")
              .foregroundStyle(.blue)
            Text("\(today.pois.count)个地点")
              .font(.caption)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        Divider()

        // Right: POI timeline
        VStack(alignment: .leading, spacing: 6) {
          ForEach(today.pois.prefix(4)) { poi in
            HStack(spacing: 8) {
              // Time
              if let time = poi.time {
                Text(time)
                  .font(.caption2)
                  .foregroundStyle(.secondary)
                  .frame(width: 36, alignment: .trailing)
              } else {
                Color.clear.frame(width: 36)
              }

              // Timeline dot
              Circle()
                .fill(.blue)
                .frame(width: 6, height: 6)

              // POI name
              VStack(alignment: .leading, spacing: 0) {
                Text(poi.name)
                  .font(.caption)
                  .fontWeight(.medium)
                  .lineLimit(1)

                if let duration = poi.duration {
                  Text(duration)
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
                }
              }
            }
          }

          if today.pois.count > 4 {
            HStack(spacing: 8) {
              Color.clear.frame(width: 36)
              Circle()
                .fill(.secondary.opacity(0.3))
                .frame(width: 6, height: 6)
              Text("+ \(today.pois.count - 4)个地点")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding()
    } else {
      EmptyTodayView()
    }
  }
}

// MARK: - Large Today View

struct LargeTodayView: View {
  let todayData: WidgetTodayData?

  var body: some View {
    if let today = todayData {
      VStack(alignment: .leading, spacing: 12) {
        // Header
        HStack {
          VStack(alignment: .leading, spacing: 2) {
            Text(today.itineraryTitle)
              .font(.subheadline)
              .foregroundStyle(.secondary)

            HStack {
              Text(today.dayInfo)
                .font(.title2)
                .fontWeight(.bold)

              if let theme = today.theme {
                Text("- \(theme)")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
                  .lineLimit(1)
              }
            }
          }

          Spacer()

          if let destination = today.destination {
            HStack(spacing: 4) {
              Image(systemName: "mappin.and.ellipse")
              Text(destination)
            }
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.blue.opacity(0.1))
            .foregroundStyle(.blue)
            .clipShape(Capsule())
          }
        }

        Divider()

        // POI timeline
        VStack(alignment: .leading, spacing: 0) {
          ForEach(Array(today.pois.enumerated()), id: \.element.id) { index, poi in
            HStack(alignment: .top, spacing: 12) {
              // Timeline
              VStack(spacing: 0) {
                Circle()
                  .fill(index == 0 ? Color.blue : Color.secondary.opacity(0.5))
                  .frame(width: 10, height: 10)

                if index < today.pois.count - 1 {
                  Rectangle()
                    .fill(.secondary.opacity(0.3))
                    .frame(width: 2)
                    .frame(maxHeight: .infinity)
                }
              }
              .frame(width: 10)

              // POI content
              VStack(alignment: .leading, spacing: 4) {
                HStack {
                  Image(systemName: poi.icon)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                  Text(poi.name)
                    .font(.subheadline)
                    .fontWeight(.medium)

                  Spacer()

                  if let time = poi.time {
                    Text(time)
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                }

                HStack(spacing: 12) {
                  if let duration = poi.duration {
                    Label(duration, systemImage: "clock")
                      .font(.caption2)
                      .foregroundStyle(.secondary)
                  }

                  if let address = poi.address {
                    Text(address)
                      .font(.caption2)
                      .foregroundStyle(.tertiary)
                      .lineLimit(1)
                  }
                }
              }
              .padding(.bottom, index < today.pois.count - 1 ? 12 : 0)
            }
          }
        }

        Spacer(minLength: 0)
      }
      .padding()
    } else {
      EmptyTodayView()
    }
  }
}

// MARK: - Rectangular Today View (Lock Screen)

struct RectangularTodayView: View {
  let todayData: WidgetTodayData?

  var body: some View {
    if let today = todayData {
      VStack(alignment: .leading, spacing: 2) {
        Text("\(today.dayInfo) - \(today.theme ?? today.itineraryTitle)")
          .font(.headline)
          .lineLimit(1)

        HStack(spacing: 4) {
          ForEach(today.pois.prefix(2)) { poi in
            if let time = poi.time {
              Text("\(time) \(poi.name)")
                .font(.caption2)
            } else {
              Text(poi.name)
                .font(.caption2)
            }

            if poi.id != today.pois.prefix(2).last?.id {
              Text("|")
                .foregroundStyle(.secondary)
            }
          }

          if today.pois.count > 2 {
            Text("...")
              .foregroundStyle(.secondary)
          }
        }
        .lineLimit(1)
        .foregroundStyle(.secondary)
      }
    } else {
      HStack {
        Image(systemName: "calendar")
        Text("今天没有行程安排")
          .font(.caption)
      }
    }
  }
}

// MARK: - Empty View

struct EmptyTodayView: View {
  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: "calendar.badge.clock")
        .font(.largeTitle)
        .foregroundStyle(.secondary)

      Text("今天没有行程")
        .font(.subheadline)
        .foregroundStyle(.secondary)

      Text("开始一段新旅程吧")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Widget Definition

struct TodayItineraryWidget: Widget {
  let kind: String = "TodayItineraryWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: TodayItineraryProvider()) { entry in
      TodayItineraryEntryView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("今日行程")
    .description("显示今天的行程安排")
    .supportedFamilies([
      .systemSmall,
      .systemMedium,
      .systemLarge,
      .accessoryRectangular
    ])
  }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
  TodayItineraryWidget()
} timeline: {
  TodayItineraryEntry(date: .now, todayData: .sample, configuration: ConfigurationAppIntent())
  TodayItineraryEntry(date: .now, todayData: nil, configuration: ConfigurationAppIntent())
}

#Preview("Medium", as: .systemMedium) {
  TodayItineraryWidget()
} timeline: {
  TodayItineraryEntry(date: .now, todayData: .sample, configuration: ConfigurationAppIntent())
}

#Preview("Large", as: .systemLarge) {
  TodayItineraryWidget()
} timeline: {
  TodayItineraryEntry(date: .now, todayData: .sample, configuration: ConfigurationAppIntent())
}
