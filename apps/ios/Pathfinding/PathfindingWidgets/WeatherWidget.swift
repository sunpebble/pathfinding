import SwiftUI
import WidgetKit

// MARK: - Weather Widget Entry

struct WeatherEntry: TimelineEntry {
  let date: Date
  let weather: WidgetWeatherData?
  let configuration: ConfigurationAppIntent
}

// MARK: - Weather Widget Provider

struct WeatherProvider: AppIntentTimelineProvider {
  typealias Entry = WeatherEntry
  typealias Intent = ConfigurationAppIntent

  func placeholder(in context: Context) -> WeatherEntry {
    WeatherEntry(
      date: Date(),
      weather: .sample,
      configuration: ConfigurationAppIntent()
    )
  }

  func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> WeatherEntry {
    let weather = loadWeatherData()
    return WeatherEntry(
      date: Date(),
      weather: weather ?? .sample,
      configuration: configuration
    )
  }

  func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<WeatherEntry> {
    let weather = loadWeatherData()

    let currentDate = Date()
    let entry = WeatherEntry(
      date: currentDate,
      weather: weather,
      configuration: configuration
    )

    // Update every 30 minutes for weather changes
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate)!

    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }

  private func loadWeatherData() -> WidgetWeatherData? {
    guard let defaults = UserDefaults(suiteName: AppGroupConstants.suiteName),
          let data = defaults.data(forKey: AppGroupConstants.weatherDataKey),
          let weather = try? JSONDecoder().decode(WidgetWeatherData.self, from: data)
    else { return nil }
    return weather
  }
}

// MARK: - Weather Widget View

struct WeatherWidgetEntryView: View {
  var entry: WeatherEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:
      SmallWeatherView(weather: entry.weather)
    case .systemMedium:
      MediumWeatherView(weather: entry.weather)
    case .systemLarge:
      LargeWeatherView(weather: entry.weather)
    case .accessoryCircular:
      CircularWeatherView(weather: entry.weather)
    case .accessoryRectangular:
      RectangularWeatherView(weather: entry.weather)
    default:
      SmallWeatherView(weather: entry.weather)
    }
  }
}

// MARK: - Small Weather View

struct SmallWeatherView: View {
  let weather: WidgetWeatherData?

  var body: some View {
    if let weather {
      VStack(alignment: .leading, spacing: 8) {
        // Location
        HStack {
          Image(systemName: "location.fill")
            .font(.caption2)
            .foregroundStyle(.secondary)
          Text(weather.location)
            .font(.caption)
            .fontWeight(.medium)
            .lineLimit(1)
        }

        Spacer()

        // Main temperature
        HStack(alignment: .top, spacing: 2) {
          Text(weather.formattedTemp)
            .font(.system(size: 48, weight: .light, design: .rounded))

          Text("°")
            .font(.title2)
            .fontWeight(.light)
            .offset(y: 4)
        }

        // Condition
        HStack(spacing: 4) {
          Image(systemName: weather.sfSymbol)
            .font(.caption)
            .symbolRenderingMode(.multicolor)

          Text(weather.conditionName)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // High/Low
        Text(weather.tempRange)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
    } else {
      EmptyWeatherView()
    }
  }
}

// MARK: - Medium Weather View

struct MediumWeatherView: View {
  let weather: WidgetWeatherData?

  var body: some View {
    if let weather {
      HStack(spacing: 16) {
        // Left: Main weather info
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Image(systemName: "location.fill")
              .font(.caption)
            Text(weather.location)
              .font(.subheadline)
              .fontWeight(.semibold)
          }

          Spacer()

          HStack(alignment: .top, spacing: 4) {
            Image(systemName: weather.sfSymbol)
              .font(.system(size: 36))
              .symbolRenderingMode(.multicolor)

            VStack(alignment: .leading, spacing: 0) {
              HStack(alignment: .top, spacing: 2) {
                Text(weather.formattedTemp)
                  .font(.system(size: 42, weight: .light, design: .rounded))
                Text("°")
                  .font(.title3)
                  .offset(y: 4)
              }

              Text(weather.conditionName)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          Spacer()

          Text(weather.tempRange)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Divider()

        // Right: Weather details
        VStack(alignment: .leading, spacing: 10) {
          WeatherDetailRow(
            icon: "humidity.fill",
            title: "湿度",
            value: "\(weather.humidity)%"
          )

          WeatherDetailRow(
            icon: "wind",
            title: "风速",
            value: String(format: "%.1f m/s", weather.windSpeed)
          )

          WeatherDetailRow(
            icon: "sun.max.fill",
            title: "紫外线",
            value: uvIndexDescription(weather.uvIndex)
          )

          WeatherDetailRow(
            icon: "drop.fill",
            title: "降水",
            value: String(format: "%.0f%%", weather.precipitation * 100)
          )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding()
    } else {
      EmptyWeatherView()
    }
  }

  private func uvIndexDescription(_ index: Double) -> String {
    switch index {
    case 0..<3: return "低"
    case 3..<6: return "中等"
    case 6..<8: return "高"
    case 8..<11: return "很高"
    default: return "极高"
    }
  }
}

// MARK: - Large Weather View

struct LargeWeatherView: View {
  let weather: WidgetWeatherData?

  var body: some View {
    if let weather {
      VStack(alignment: .leading, spacing: 12) {
        // Header
        HStack {
          VStack(alignment: .leading, spacing: 2) {
            HStack {
              Image(systemName: "location.fill")
                .font(.caption)
              Text(weather.location)
                .font(.headline)
            }

            Text("更新于 \(formatUpdateTime(weather.updatedAt))")
              .font(.caption2)
              .foregroundStyle(.tertiary)
          }

          Spacer()

          // Condition badge
          HStack(spacing: 4) {
            Image(systemName: weather.sfSymbol)
              .symbolRenderingMode(.multicolor)
            Text(weather.conditionName)
          }
          .font(.caption)
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(weatherBackgroundColor(weather.condition).opacity(0.2))
          .foregroundStyle(weatherBackgroundColor(weather.condition))
          .clipShape(Capsule())
        }

        Divider()

        // Main temperature display
        HStack {
          VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top, spacing: 4) {
              Text(weather.formattedTemp)
                .font(.system(size: 64, weight: .thin, design: .rounded))
              Text("°C")
                .font(.title2)
                .fontWeight(.light)
                .offset(y: 8)
            }

            Text(weather.tempRange)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          Spacer()

          Image(systemName: weather.sfSymbol)
            .font(.system(size: 56))
            .symbolRenderingMode(.multicolor)
        }

        Divider()

        // Weather details grid
        LazyVGrid(columns: [
          GridItem(.flexible()),
          GridItem(.flexible()),
          GridItem(.flexible())
        ], spacing: 16) {
          WeatherInfoCard(
            icon: "humidity.fill",
            title: "湿度",
            value: "\(weather.humidity)%",
            color: .blue
          )

          WeatherInfoCard(
            icon: "wind",
            title: "风速",
            value: String(format: "%.1f", weather.windSpeed),
            unit: "m/s",
            color: .teal
          )

          WeatherInfoCard(
            icon: "sun.max.fill",
            title: "紫外线",
            value: String(format: "%.0f", weather.uvIndex),
            color: .orange
          )

          WeatherInfoCard(
            icon: "drop.fill",
            title: "降水概率",
            value: String(format: "%.0f%%", weather.precipitation * 100),
            color: .cyan
          )

          WeatherInfoCard(
            icon: "sunrise.fill",
            title: "日出",
            value: weather.sunrise,
            color: .yellow
          )

          WeatherInfoCard(
            icon: "sunset.fill",
            title: "日落",
            value: weather.sunset,
            color: .orange
          )
        }

        Spacer(minLength: 0)
      }
      .padding()
    } else {
      EmptyWeatherView()
    }
  }

  private func formatUpdateTime(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "HH:mm"
    return formatter.string(from: date)
  }

  private func weatherBackgroundColor(_ condition: String) -> Color {
    switch condition.lowercased() {
    case "clear": return .orange
    case "clouds": return .gray
    case "rain", "drizzle": return .blue
    case "thunderstorm": return .purple
    case "snow": return .cyan
    default: return .gray
    }
  }
}

// MARK: - Circular Weather View (Lock Screen)

struct CircularWeatherView: View {
  let weather: WidgetWeatherData?

  var body: some View {
    if let weather {
      ZStack {
        AccessoryWidgetBackground()

        VStack(spacing: 2) {
          Image(systemName: weather.sfSymbol)
            .font(.title3)

          Text("\(weather.formattedTemp)°")
            .font(.system(.body, design: .rounded, weight: .semibold))
        }
      }
    } else {
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "cloud.fill")
          .font(.title2)
      }
    }
  }
}

// MARK: - Rectangular Weather View (Lock Screen)

struct RectangularWeatherView: View {
  let weather: WidgetWeatherData?

  var body: some View {
    if let weather {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(weather.location)
            .font(.headline)
            .lineLimit(1)

          HStack(spacing: 4) {
            Image(systemName: weather.sfSymbol)
              .font(.caption)
            Text(weather.conditionName)
              .font(.caption)
            Text(weather.tempRange)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        Text("\(weather.formattedTemp)°")
          .font(.system(.title, design: .rounded, weight: .medium))
      }
    } else {
      HStack {
        Image(systemName: "cloud.fill")
        Text("暂无天气数据")
          .font(.caption)
      }
    }
  }
}

// MARK: - Empty View

struct EmptyWeatherView: View {
  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: "cloud.sun.fill")
        .font(.largeTitle)
        .symbolRenderingMode(.multicolor)

      Text("暂无天气数据")
        .font(.subheadline)
        .foregroundStyle(.secondary)

      Text("打开 Sunpebble Trips 查看目的地天气")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Helper Views

struct WeatherDetailRow: View {
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

struct WeatherInfoCard: View {
  let icon: String
  let title: String
  let value: String
  var unit: String? = nil
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.caption)
        .foregroundStyle(color)

      Text(title)
        .font(.caption2)
        .foregroundStyle(.secondary)

      HStack(alignment: .firstTextBaseline, spacing: 2) {
        Text(value)
          .font(.caption)
          .fontWeight(.semibold)

        if let unit {
          Text(unit)
            .font(.system(size: 8))
            .foregroundStyle(.secondary)
        }
      }
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Widget Definition

struct WeatherWidget: Widget {
  let kind: String = "WeatherWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: WeatherProvider()) { entry in
      WeatherWidgetEntryView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("目的地天气")
    .description("显示旅行目的地的天气信息")
    .supportedFamilies([
      .systemSmall,
      .systemMedium,
      .systemLarge,
      .accessoryCircular,
      .accessoryRectangular
    ])
  }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
  WeatherWidget()
} timeline: {
  WeatherEntry(date: .now, weather: .sample, configuration: ConfigurationAppIntent())
  WeatherEntry(date: .now, weather: nil, configuration: ConfigurationAppIntent())
}

#Preview("Medium", as: .systemMedium) {
  WeatherWidget()
} timeline: {
  WeatherEntry(date: .now, weather: .sample, configuration: ConfigurationAppIntent())
}

#Preview("Large", as: .systemLarge) {
  WeatherWidget()
} timeline: {
  WeatherEntry(date: .now, weather: .sample, configuration: ConfigurationAppIntent())
}
