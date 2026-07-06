import SwiftUI
import WidgetKit

// MARK: - Exchange Rate Widget Entry

struct ExchangeRateEntry: TimelineEntry {
  let date: Date
  let exchangeRate: WidgetExchangeRateData?
  let configuration: ConfigurationAppIntent
}

// MARK: - Exchange Rate Widget Provider

struct ExchangeRateProvider: AppIntentTimelineProvider {
  typealias Entry = ExchangeRateEntry
  typealias Intent = ConfigurationAppIntent

  func placeholder(in context: Context) -> ExchangeRateEntry {
    ExchangeRateEntry(
      date: Date(),
      exchangeRate: .sample,
      configuration: ConfigurationAppIntent()
    )
  }

  func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> ExchangeRateEntry {
    let exchangeRate = loadExchangeRateData()
    return ExchangeRateEntry(
      date: Date(),
      exchangeRate: exchangeRate ?? .sample,
      configuration: configuration
    )
  }

  func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<ExchangeRateEntry> {
    let exchangeRate = loadExchangeRateData()

    let currentDate = Date()
    let entry = ExchangeRateEntry(
      date: currentDate,
      exchangeRate: exchangeRate,
      configuration: configuration
    )

    // Update every hour for exchange rate changes
    let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate)!

    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }

  private func loadExchangeRateData() -> WidgetExchangeRateData? {
    guard let defaults = UserDefaults(suiteName: AppGroupConstants.suiteName),
          let data = defaults.data(forKey: AppGroupConstants.exchangeRateKey),
          let rate = try? JSONDecoder().decode(WidgetExchangeRateData.self, from: data)
    else { return nil }
    return rate
  }
}

// MARK: - Exchange Rate Widget View

struct ExchangeRateWidgetEntryView: View {
  var entry: ExchangeRateEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:
      SmallExchangeRateView(exchangeRate: entry.exchangeRate)
    case .systemMedium:
      MediumExchangeRateView(exchangeRate: entry.exchangeRate)
    case .accessoryCircular:
      CircularExchangeRateView(exchangeRate: entry.exchangeRate)
    case .accessoryRectangular:
      RectangularExchangeRateView(exchangeRate: entry.exchangeRate)
    case .accessoryInline:
      InlineExchangeRateView(exchangeRate: entry.exchangeRate)
    default:
      SmallExchangeRateView(exchangeRate: entry.exchangeRate)
    }
  }
}

// MARK: - Small Exchange Rate View

struct SmallExchangeRateView: View {
  let exchangeRate: WidgetExchangeRateData?

  var body: some View {
    if let rate = exchangeRate {
      VStack(alignment: .leading, spacing: 8) {
        // Currency pair header
        HStack(spacing: 4) {
          Text(rate.baseCurrencyFlag)
            .font(.caption)
          Text(rate.baseCurrency)
            .font(.caption)
            .fontWeight(.medium)
          Image(systemName: "arrow.right")
            .font(.system(size: 8))
            .foregroundStyle(.secondary)
          Text(rate.targetCurrencyFlag)
            .font(.caption)
          Text(rate.targetCurrency)
            .font(.caption)
            .fontWeight(.medium)
        }

        Spacer()

        // Main rate
        VStack(alignment: .leading, spacing: 2) {
          Text("1 \(rate.baseCurrency) =")
            .font(.caption2)
            .foregroundStyle(.secondary)

          Text(rate.formattedRate)
            .font(.system(size: 28, weight: .semibold, design: .rounded))

          Text(rate.targetCurrency)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Change indicator
        if rate.change24h != nil {
          HStack(spacing: 4) {
            Image(systemName: rate.isIncreased ? "arrow.up.right" : "arrow.down.right")
              .font(.caption2)
              .foregroundStyle(rate.isIncreased ? .green : .red)

            Text(rate.formattedChangePercent)
              .font(.caption2)
              .foregroundStyle(rate.isIncreased ? .green : .red)

            Text("24h")
              .font(.system(size: 8))
              .foregroundStyle(.tertiary)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
    } else {
      EmptyExchangeRateView()
    }
  }
}

// MARK: - Medium Exchange Rate View

struct MediumExchangeRateView: View {
  let exchangeRate: WidgetExchangeRateData?

  var body: some View {
    if let rate = exchangeRate {
      HStack(spacing: 16) {
        // Left: Base to Target
        VStack(alignment: .leading, spacing: 8) {
          // Header
          HStack {
            CurrencyBadge(code: rate.baseCurrency, flag: rate.baseCurrencyFlag)
            Image(systemName: "arrow.right.circle.fill")
              .foregroundStyle(.blue)
            CurrencyBadge(code: rate.targetCurrency, flag: rate.targetCurrencyFlag)
          }

          Spacer()

          // Main rate
          VStack(alignment: .leading, spacing: 2) {
            Text("1 \(rate.baseCurrency) =")
              .font(.caption)
              .foregroundStyle(.secondary)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
              Text(rate.formattedRate)
                .font(.system(size: 32, weight: .semibold, design: .rounded))

              Text(rate.targetCurrency)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
          }

          Spacer()

          // Change
          if rate.change24h != nil {
            HStack(spacing: 8) {
              HStack(spacing: 4) {
                Image(systemName: rate.isIncreased ? "arrow.up.right" : "arrow.down.right")
                Text(rate.formattedChange)
              }
              .font(.caption)
              .foregroundStyle(rate.isIncreased ? .green : .red)

              Text("(\(rate.formattedChangePercent))")
                .font(.caption)
                .foregroundStyle(rate.isIncreased ? .green : .red)

              Text("24h")
                .font(.caption2)
                .foregroundStyle(.tertiary)
            }
          }
        }

        Divider()

        // Right: Inverse rate and quick conversions
        VStack(alignment: .leading, spacing: 12) {
          // Inverse rate
          VStack(alignment: .leading, spacing: 2) {
            Text("反向汇率")
              .font(.caption2)
              .foregroundStyle(.secondary)

            HStack(spacing: 4) {
              Text("1 \(rate.targetCurrency) =")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text(rate.formattedInverseRate)
                .font(.subheadline)
                .fontWeight(.medium)
              Text(rate.baseCurrency)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          Divider()

          // Quick conversions
          VStack(alignment: .leading, spacing: 6) {
            Text("快速换算")
              .font(.caption2)
              .foregroundStyle(.secondary)

            ConversionRow(
              amount: 100,
              from: rate.baseCurrency,
              to: rate.targetCurrency,
              rate: rate.rate
            )

            ConversionRow(
              amount: 1000,
              from: rate.baseCurrency,
              to: rate.targetCurrency,
              rate: rate.rate
            )
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding()
    } else {
      EmptyExchangeRateView()
    }
  }
}

// MARK: - Circular Exchange Rate View (Lock Screen)

struct CircularExchangeRateView: View {
  let exchangeRate: WidgetExchangeRateData?

  var body: some View {
    if let rate = exchangeRate {
      ZStack {
        AccessoryWidgetBackground()

        VStack(spacing: 2) {
          Text("\(rate.baseCurrency)/\(rate.targetCurrency)")
            .font(.system(size: 9))

          Text(String(format: "%.2f", rate.rate))
            .font(.system(.body, design: .rounded, weight: .semibold))

          if rate.change24h != nil {
            Image(systemName: rate.isIncreased ? "arrow.up" : "arrow.down")
              .font(.system(size: 8))
              .foregroundStyle(rate.isIncreased ? .green : .red)
          }
        }
      }
    } else {
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "dollarsign.circle")
          .font(.title2)
      }
    }
  }
}

// MARK: - Rectangular Exchange Rate View (Lock Screen)

struct RectangularExchangeRateView: View {
  let exchangeRate: WidgetExchangeRateData?

  var body: some View {
    if let rate = exchangeRate {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text("\(rate.baseCurrency) → \(rate.targetCurrency)")
            .font(.headline)

          HStack(spacing: 4) {
            Text("1 = \(rate.formattedRate)")
              .font(.caption)

            if rate.change24h != nil {
              HStack(spacing: 2) {
                Image(systemName: rate.isIncreased ? "arrow.up" : "arrow.down")
                Text(rate.formattedChangePercent)
              }
              .font(.caption2)
              .foregroundStyle(rate.isIncreased ? .green : .red)
            }
          }
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 0) {
          Text(rate.formattedRate)
            .font(.system(.title2, design: .rounded, weight: .medium))
        }
      }
    } else {
      HStack {
        Image(systemName: "dollarsign.circle")
        Text("暂无汇率数据")
          .font(.caption)
      }
    }
  }
}

// MARK: - Inline Exchange Rate View (Lock Screen)

struct InlineExchangeRateView: View {
  let exchangeRate: WidgetExchangeRateData?

  var body: some View {
    if let rate = exchangeRate {
      Label {
        Text("\(rate.baseCurrency)/\(rate.targetCurrency): \(rate.formattedRate)")
      } icon: {
        Image(systemName: "dollarsign.arrow.circlepath")
      }
    } else {
      Label("暂无汇率", systemImage: "dollarsign.circle")
    }
  }
}

// MARK: - Empty View

struct EmptyExchangeRateView: View {
  var body: some View {
    VStack(spacing: 12) {
      Image(systemName: "dollarsign.circle")
        .font(.largeTitle)
        .foregroundStyle(.secondary)

      Text("暂无汇率数据")
        .font(.subheadline)
        .foregroundStyle(.secondary)

      Text("打开 Sunpebble Trips 设置目的地货币")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// MARK: - Helper Views

struct CurrencyBadge: View {
  let code: String
  let flag: String

  var body: some View {
    HStack(spacing: 4) {
      Text(flag)
        .font(.caption)
      Text(code)
        .font(.caption)
        .fontWeight(.semibold)
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(.quaternary)
    .clipShape(Capsule())
  }
}

struct ConversionRow: View {
  let amount: Double
  let from: String
  let to: String
  let rate: Double

  var body: some View {
    HStack {
      Text("\(Int(amount)) \(from)")
        .font(.caption)
        .foregroundStyle(.secondary)

      Text("=")
        .font(.caption2)
        .foregroundStyle(.tertiary)

      Text(String(format: "%.2f", amount * rate))
        .font(.caption)
        .fontWeight(.medium)

      Text(to)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }
}

// MARK: - Widget Definition

struct ExchangeRateWidget: Widget {
  let kind: String = "ExchangeRateWidget"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: ExchangeRateProvider()) { entry in
      ExchangeRateWidgetEntryView(entry: entry)
        .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("汇率换算")
    .description("显示目的地货币汇率")
    .supportedFamilies([
      .systemSmall,
      .systemMedium,
      .accessoryCircular,
      .accessoryRectangular,
      .accessoryInline
    ])
  }
}

// MARK: - Preview

#Preview("Small", as: .systemSmall) {
  ExchangeRateWidget()
} timeline: {
  ExchangeRateEntry(date: .now, exchangeRate: .sample, configuration: ConfigurationAppIntent())
  ExchangeRateEntry(date: .now, exchangeRate: nil, configuration: ConfigurationAppIntent())
}

#Preview("Medium", as: .systemMedium) {
  ExchangeRateWidget()
} timeline: {
  ExchangeRateEntry(date: .now, exchangeRate: .sample, configuration: ConfigurationAppIntent())
}
