import SwiftUI

// MARK: - Overview Tab

struct OverviewTab: View {
  let city: CityWithEncyclopedia
  let encyclopedia: CityEncyclopedia

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      // City Header Card
      cityHeaderCard(city: city)

      // Basic Info
      if let basicInfo = encyclopedia.basicInfo {
        basicInfoSection(basicInfo)
      }

      // Best Travel Time
      if let travelTime = encyclopedia.bestTravelTime {
        bestTravelTimeSection(travelTime)
      }

      // Quick Facts
      if let practicalInfo = encyclopedia.practicalInfo {
        quickFactsSection(practicalInfo)
      }

      // Last Updated
      HStack {
        Image(systemName: "clock.fill")
          .foregroundStyle(.secondary)
        Text("最后更新: \(encyclopedia.formattedLastUpdated)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }

  // MARK: - City Header Card

  private func cityHeaderCard(city: CityWithEncyclopedia) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // City name and location
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(city.name)
            .font(.title)
            .fontWeight(.bold)
          if let nameEn = city.nameEn {
            Text(nameEn)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Country flag placeholder
        Text(countryFlag(city.countryCode))
          .font(.largeTitle)
      }

      Divider()

      // Location info
      HStack(spacing: DesignTokens.Spacing.lg) {
        VStack {
          Image(systemName: "location.fill")
            .foregroundStyle(.blue)
          Text(String(format: "%.2f, %.2f", city.latitude, city.longitude))
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        VStack {
          Image(systemName: "clock.fill")
            .foregroundStyle(.orange)
          Text(city.timezone)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        if let utcOffset = city.utcOffset {
          VStack {
            Image(systemName: "globe")
              .foregroundStyle(.green)
            Text(formatUtcOffset(utcOffset))
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
    )
  }

  // MARK: - Basic Info Section

  private func basicInfoSection(_ info: CityBasicInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("基本信息", systemImage: "info.circle.fill")
        .font(.headline)
        .foregroundStyle(.blue)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        if let population = info.formattedPopulation {
          infoCard(icon: "person.3.fill", label: "人口", value: population)
        }
        if let area = info.formattedArea {
          infoCard(icon: "map.fill", label: "面积", value: area)
        }
        if let elevation = info.formattedElevation {
          infoCard(icon: "mountain.2.fill", label: "海拔", value: elevation)
        }
        if let climate = info.climate {
          infoCard(icon: "cloud.sun.fill", label: "气候", value: climate)
        }
      }

      // Nicknames
      if let nicknames = info.nicknames, !nicknames.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("别名")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          FlowLayout(spacing: 8) {
            ForEach(nicknames, id: \.self) { nickname in
              Text(nickname)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(
                  Capsule()
                    .fill(Color.blue.opacity(0.1))
                )
                .foregroundStyle(.blue)
            }
          }
        }
      }

      // Motto
      if let motto = info.motto {
        VStack(alignment: .leading, spacing: 4) {
          Text("城市格言")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text("\"\(motto)\"")
            .font(.body)
            .italic()
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
    )
  }

  private func infoCard(icon: String, label: String, value: String) -> some View {
    VStack(spacing: 8) {
      Image(systemName: icon)
        .font(.title2)
        .foregroundStyle(.blue)
      Text(value)
        .font(.subheadline)
        .fontWeight(.semibold)
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(Color.blue.opacity(0.05))
    )
  }

  // MARK: - Best Travel Time Section

  private func bestTravelTimeSection(_ travelTime: BestTravelTime) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("最佳旅行时间", systemImage: "calendar")
        .font(.headline)
        .foregroundStyle(.green)

      // Seasons
      HStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(travelTime.seasons, id: \.self) { season in
          HStack(spacing: 4) {
            Image(systemName: season.icon)
            Text(season.displayName)
          }
          .font(.caption)
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(
            Capsule()
              .fill(Color.green.opacity(0.1))
          )
          .foregroundStyle(.green)
        }
      }

      // Months
      Text("推荐月份: \(travelTime.formattedMonths)")
        .font(.subheadline)

      // Description
      Text(travelTime.description)
        .font(.body)
        .foregroundStyle(.secondary)

      // Weather notes
      if let notes = travelTime.weatherNotes {
        HStack(alignment: .top, spacing: 8) {
          Image(systemName: "cloud.fill")
            .foregroundStyle(.blue)
          Text(notes)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      // Crowd and price level
      HStack(spacing: DesignTokens.Spacing.lg) {
        if let crowdLevel = travelTime.crowdLevel {
          HStack {
            Image(systemName: "person.3.fill")
            Text(crowdLevel.displayName)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        if let priceLevel = travelTime.priceLevel {
          HStack {
            Image(systemName: priceLevel.icon)
            Text(priceLevel.displayName)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.green.opacity(0.05))
    )
  }

  // MARK: - Quick Facts Section

  private func quickFactsSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("快速了解", systemImage: "bolt.fill")
        .font(.headline)
        .foregroundStyle(.orange)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        factCard(icon: "bolt.fill", label: "电压", value: info.voltage)
        factCard(
          icon: "powerplug.fill", label: "插头", value: info.formattedPlugTypes)
        factCard(
          icon: info.waterSafety.icon, label: "饮用水",
          value: info.waterSafety.displayName)
        factCard(
          icon: "dollarsign.circle.fill", label: "货币",
          value: "\(info.currencySymbol) \(info.currency)")
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.orange.opacity(0.05))
    )
  }

  private func factCard(icon: String, label: String, value: String) -> some View {
    HStack {
      Image(systemName: icon)
        .foregroundStyle(.orange)
        .frame(width: 24)
      VStack(alignment: .leading) {
        Text(label)
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(value)
          .font(.subheadline)
          .fontWeight(.medium)
      }
      Spacer()
    }
    .padding(DesignTokens.Spacing.sm)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(Color(.systemBackground))
    )
  }

  // MARK: - Helper Functions

  private func countryFlag(_ countryCode: String) -> String {
    let base: UInt32 = 127397
    var flag = ""
    for scalar in countryCode.uppercased().unicodeScalars {
      if let s = Unicode.Scalar(base + scalar.value) {
        flag.append(String(s))
      }
    }
    return flag
  }

  private func formatUtcOffset(_ minutes: Int) -> String {
    let sign = minutes >= 0 ? "+" : "-"
    let absMinutes = abs(minutes)
    let hours = absMinutes / 60
    let mins = absMinutes % 60
    return mins > 0 ? "UTC\(sign)\(hours):\(String(format: "%02d", mins))" : "UTC\(sign)\(hours)"
  }
}
