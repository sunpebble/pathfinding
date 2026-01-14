import MapKit
import SwiftUI

// MARK: - Safety Rating View

struct SafetyRatingView: View {
  let destinationName: String
  @State private var safetyInfo: DestinationSafetyInfo?
  @State private var isLoading = true
  @State private var errorMessage: String?
  @State private var selectedTab: SafetyTab = .overview

  enum SafetyTab: String, CaseIterable {
    case overview = "overview"
    case alerts = "alerts"
    case zones = "zones"
    case incidents = "incidents"

    var displayName: String {
      switch self {
      case .overview: return "概览"
      case .alerts: return "警告"
      case .zones: return "危险区域"
      case .incidents: return "事件报告"
      }
    }

    var icon: String {
      switch self {
      case .overview: return "shield.fill"
      case .alerts: return "exclamationmark.triangle.fill"
      case .zones: return "mappin.and.ellipse"
      case .incidents: return "doc.text.fill"
      }
    }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        if isLoading {
          loadingView
        } else if let error = errorMessage {
          errorView(error)
        } else if let info = safetyInfo {
          // Tab selector
          tabSelector

          switch selectedTab {
          case .overview:
            overviewSection(info)
          case .alerts:
            alertsSection(info.alerts)
          case .zones:
            dangerZonesSection(info.dangerZones)
          case .incidents:
            incidentsSection(info.recentIncidents)
          }
        }
      }
      .padding(DesignTokens.Spacing.lg)
    }
    .navigationTitle("安全信息")
    .navigationBarTitleDisplayMode(.large)
    .task {
      await loadSafetyInfo()
    }
  }

  // MARK: - Tab Selector

  private var tabSelector: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(SafetyTab.allCases, id: \.self) { tab in
          Button {
            withAnimation(.spring(response: 0.3)) {
              selectedTab = tab
            }
          } label: {
            HStack(spacing: 6) {
              Image(systemName: tab.icon)
                .font(.caption)
              Text(tab.displayName)
                .font(.subheadline)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
              Capsule()
                .fill(selectedTab == tab ? Color.accentColor : Color(.systemGray5))
            )
            .foregroundStyle(selectedTab == tab ? .white : .primary)
          }
          .buttonStyle(.plain)
        }
      }
    }
    .scrollClipDisabled()
  }

  // MARK: - Loading View

  private var loadingView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ProgressView()
        .scaleEffect(1.5)
      Text("加载安全信息...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 100)
  }

  // MARK: - Error View

  private func errorView(_ error: String) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.largeTitle)
        .foregroundStyle(.orange)
      Text("加载失败")
        .font(.headline)
      Text(error)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Button("重试") {
        Task { await loadSafetyInfo() }
      }
      .buttonStyle(.borderedProminent)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 100)
  }

  // MARK: - Overview Section

  private func overviewSection(_ info: DestinationSafetyInfo) -> some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      // Safety Rating Card
      if let rating = info.rating {
        safetyRatingCard(rating)
      } else {
        noRatingCard
      }

      // Quick Stats
      quickStatsSection(info)

      // Category Ratings
      if let rating = info.rating {
        categoryRatingsSection(rating)
      }

      // Emergency Numbers
      if let rating = info.rating, let emergency = rating.emergencyNumbers {
        emergencyNumbersSection(emergency)
      }

      // General Tips
      if let rating = info.rating, !rating.generalTips.isEmpty {
        generalTipsSection(rating.generalTips)
      }
    }
  }

  // MARK: - Safety Rating Card

  private func safetyRatingCard(_ rating: SafetyRating) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(rating.destinationName)
            .font(.title2)
            .fontWeight(.bold)
          if let nameEn = rating.destinationNameEn {
            Text(nameEn)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Overall Rating Badge
        VStack {
          Text(String(format: "%.1f", rating.overallRating))
            .font(.system(size: 32, weight: .bold))
            .foregroundStyle(colorForRating(rating.overallRating))
          Text(rating.safetyLevel.displayName)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      Divider()

      // Summary
      Text(rating.summary)
        .font(.body)
        .foregroundStyle(.secondary)
        .frame(maxWidth: .infinity, alignment: .leading)

      // Source and verification
      HStack {
        Image(systemName: "checkmark.seal.fill")
          .foregroundStyle(.green)
        Text("来源: \(rating.source)")
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Text(formattedDate(rating.lastVerifiedAt))
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
    )
  }

  private var noRatingCard: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "shield.slash.fill")
        .font(.largeTitle)
        .foregroundStyle(.secondary)
      Text("暂无安全评级")
        .font(.headline)
      Text("该目的地尚未有安全评级数据")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(DesignTokens.Spacing.xl)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemGray6))
    )
  }

  // MARK: - Quick Stats Section

  private func quickStatsSection(_ info: DestinationSafetyInfo) -> some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      quickStatCard(
        icon: "exclamationmark.triangle.fill",
        value: "\(info.alerts.count)",
        label: "活跃警告",
        color: info.hasCriticalAlerts ? .red : (info.hasActiveAlerts ? .orange : .green)
      )

      quickStatCard(
        icon: "mappin.circle.fill",
        value: "\(info.dangerZoneCount)",
        label: "危险区域",
        color: info.dangerZoneCount > 0 ? .orange : .green
      )

      quickStatCard(
        icon: "doc.text.fill",
        value: "\(info.recentIncidents.count)",
        label: "近期事件",
        color: info.recentIncidents.count > 5 ? .orange : .blue
      )
    }
  }

  private func quickStatCard(icon: String, value: String, label: String, color: Color) -> some View
  {
    VStack(spacing: 8) {
      Image(systemName: icon)
        .font(.title2)
        .foregroundStyle(color)
      Text(value)
        .font(.title3)
        .fontWeight(.bold)
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(color.opacity(0.1))
    )
  }

  // MARK: - Category Ratings Section

  private func categoryRatingsSection(_ rating: SafetyRating) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Text("分类评级")
        .font(.headline)

      VStack(spacing: DesignTokens.Spacing.sm) {
        categoryRatingRow(icon: "shield.fill", label: "治安安全", rating: rating.crimeRating)
        categoryRatingRow(icon: "cross.fill", label: "医疗健康", rating: rating.healthRating)
        categoryRatingRow(
          icon: "cloud.bolt.fill", label: "自然灾害", rating: rating.naturalDisasterRating)
        categoryRatingRow(icon: "car.fill", label: "交通安全", rating: rating.transportRating)
        if let womenRating = rating.womenSafetyRating {
          categoryRatingRow(icon: "person.fill", label: "女性安全", rating: womenRating)
        }
        if let lgbtqRating = rating.lgbtqSafetyRating {
          categoryRatingRow(icon: "heart.fill", label: "LGBTQ+安全", rating: lgbtqRating)
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

  private func categoryRatingRow(icon: String, label: String, rating: Double) -> some View {
    HStack {
      Image(systemName: icon)
        .frame(width: 24)
        .foregroundStyle(colorForRating(rating))
      Text(label)
        .font(.subheadline)

      Spacer()

      // Rating bar
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          RoundedRectangle(cornerRadius: 4)
            .fill(Color(.systemGray5))
          RoundedRectangle(cornerRadius: 4)
            .fill(colorForRating(rating))
            .frame(width: geo.size.width * (rating / 5.0))
        }
      }
      .frame(width: 100, height: 8)

      Text(String(format: "%.1f", rating))
        .font(.caption)
        .fontWeight(.semibold)
        .foregroundStyle(colorForRating(rating))
        .frame(width: 30, alignment: .trailing)
    }
  }

  // MARK: - Emergency Numbers Section

  private func emergencyNumbersSection(_ emergency: EmergencyNumbers) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("紧急电话", systemImage: "phone.fill")
        .font(.headline)
        .foregroundStyle(.red)

      HStack(spacing: DesignTokens.Spacing.sm) {
        if let police = emergency.police {
          emergencyButton(icon: "shield.fill", label: "报警", number: police, color: .blue)
        }
        if let ambulance = emergency.ambulance {
          emergencyButton(icon: "cross.fill", label: "急救", number: ambulance, color: .red)
        }
        if let fire = emergency.fire {
          emergencyButton(icon: "flame.fill", label: "消防", number: fire, color: .orange)
        }
      }

      if let hotline = emergency.touristHotline {
        HStack {
          Image(systemName: "person.wave.2.fill")
            .foregroundStyle(.purple)
          Text("旅游热线: \(hotline)")
            .font(.subheadline)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.red.opacity(0.05))
    )
  }

  private func emergencyButton(icon: String, label: String, number: String, color: Color)
    -> some View
  {
    Button {
      if let url = URL(string: "tel:\(number)") {
        UIApplication.shared.open(url)
      }
    } label: {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.title3)
        Text(label)
          .font(.caption2)
        Text(number)
          .font(.caption)
          .fontWeight(.bold)
      }
      .frame(maxWidth: .infinity)
      .padding(DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(color.opacity(0.1))
      )
      .foregroundStyle(color)
    }
    .buttonStyle(.plain)
  }

  // MARK: - General Tips Section

  private func generalTipsSection(_ tips: [String]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("安全提示", systemImage: "lightbulb.fill")
        .font(.headline)
        .foregroundStyle(.orange)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        ForEach(Array(tips.enumerated()), id: \.offset) { _, tip in
          HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
              .foregroundStyle(.green)
              .font(.subheadline)
            Text(tip)
              .font(.subheadline)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.orange.opacity(0.05))
    )
  }

  // MARK: - Alerts Section

  private func alertsSection(_ alerts: [SafetyAlert]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      if alerts.isEmpty {
        emptyStateView(
          icon: "checkmark.shield.fill",
          title: "暂无活跃警告",
          subtitle: "当前目的地没有旅行警告"
        )
      } else {
        ForEach(alerts) { alert in
          alertCard(alert)
        }
      }
    }
  }

  private func alertCard(_ alert: SafetyAlert) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Header
      HStack {
        Image(systemName: alert.alertType.icon)
          .foregroundStyle(severityColor(alert.severity))
        Text(alert.alertType.displayName)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Text(alert.severity.displayName)
          .font(.caption)
          .padding(.horizontal, 8)
          .padding(.vertical, 2)
          .background(
            Capsule()
              .fill(severityColor(alert.severity).opacity(0.1))
          )
          .foregroundStyle(severityColor(alert.severity))
      }

      Text(alert.title)
        .font(.headline)

      Text(alert.description)
        .font(.subheadline)
        .foregroundStyle(.secondary)

      // Recommendations
      if !alert.recommendations.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          Text("建议措施:")
            .font(.caption)
            .fontWeight(.semibold)
          ForEach(Array(alert.recommendations.prefix(3).enumerated()), id: \.offset) { _, rec in
            Text("- \(rec)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
        .padding(.top, 4)
      }

      // Source and date
      HStack {
        Text("来源: \(alert.source)")
          .font(.caption2)
          .foregroundStyle(.tertiary)
        Spacer()
        Text(formattedDate(alert.startDate))
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
    )
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(severityColor(alert.severity).opacity(0.3), lineWidth: 1)
    )
  }

  // MARK: - Danger Zones Section

  private func dangerZonesSection(_ zones: [DangerZone]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      if zones.isEmpty {
        emptyStateView(
          icon: "map.fill",
          title: "暂无危险区域",
          subtitle: "当前目的地没有标记的危险区域"
        )
      } else {
        // Map preview
        dangerZonesMap(zones)

        // Zone list
        ForEach(zones) { zone in
          dangerZoneCard(zone)
        }
      }
    }
  }

  private func dangerZonesMap(_ zones: [DangerZone]) -> some View {
    Map {
      ForEach(zones) { zone in
        Annotation(zone.zoneName, coordinate: CLLocationCoordinate2D(
          latitude: zone.latitude,
          longitude: zone.longitude
        )) {
          ZStack {
            Circle()
              .fill(dangerLevelColor(zone.dangerLevel).opacity(0.3))
              .frame(width: 40, height: 40)
            Image(systemName: zone.dangerLevel.icon)
              .foregroundStyle(dangerLevelColor(zone.dangerLevel))
          }
        }
      }
    }
    .frame(height: 200)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }

  private func dangerZoneCard(_ zone: DangerZone) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Header
      HStack {
        Image(systemName: zone.dangerLevel.icon)
          .foregroundStyle(dangerLevelColor(zone.dangerLevel))
        Text(zone.zoneName)
          .font(.headline)
        Spacer()
        Text(zone.dangerLevel.displayName)
          .font(.caption)
          .padding(.horizontal, 8)
          .padding(.vertical, 2)
          .background(
            Capsule()
              .fill(dangerLevelColor(zone.dangerLevel).opacity(0.1))
          )
          .foregroundStyle(dangerLevelColor(zone.dangerLevel))
      }

      // Danger types
      HStack {
        ForEach(zone.dangerTypes.prefix(3), id: \.self) { type in
          Text(type.displayName)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(
              Capsule()
                .fill(Color(.systemGray5))
            )
        }
      }

      Text(zone.description)
        .font(.subheadline)
        .foregroundStyle(.secondary)

      // Precautions
      if !zone.precautions.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          Text("注意事项:")
            .font(.caption)
            .fontWeight(.semibold)
          ForEach(Array(zone.precautions.prefix(3).enumerated()), id: \.offset) { _, precaution in
            Text("- \(precaution)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }

      // Distance if available
      if let distance = zone.distance {
        HStack {
          Image(systemName: "location.fill")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(String(format: "距离 %.1f 公里", distance))
            .font(.caption)
            .foregroundStyle(.secondary)
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

  // MARK: - Incidents Section

  private func incidentsSection(_ incidents: [SafetyIncidentReport]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      if incidents.isEmpty {
        emptyStateView(
          icon: "doc.text.fill",
          title: "暂无事件报告",
          subtitle: "当前目的地没有近期安全事件报告"
        )
      } else {
        ForEach(incidents) { incident in
          incidentCard(incident)
        }
      }
    }
  }

  private func incidentCard(_ incident: SafetyIncidentReport) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Header
      HStack {
        Image(systemName: incident.incidentType.icon)
          .foregroundStyle(incidentSeverityColor(incident.severity))
        Text(incident.incidentType.displayName)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Text(incident.severity.displayName)
          .font(.caption)
          .padding(.horizontal, 8)
          .padding(.vertical, 2)
          .background(
            Capsule()
              .fill(incidentSeverityColor(incident.severity).opacity(0.1))
          )
          .foregroundStyle(incidentSeverityColor(incident.severity))
      }

      Text(incident.title)
        .font(.headline)

      Text(incident.description)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .lineLimit(3)

      // Location
      if let location = incident.specificLocation {
        HStack {
          Image(systemName: "mappin")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(location)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      // Footer
      HStack {
        Text(formattedDate(incident.incidentDate))
          .font(.caption2)
          .foregroundStyle(.tertiary)
        Spacer()
        HStack(spacing: 4) {
          Image(systemName: "hand.thumbsup.fill")
            .font(.caption2)
          Text("\(incident.helpfulCount)")
            .font(.caption2)
        }
        .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
    )
  }

  // MARK: - Empty State View

  private func emptyStateView(icon: String, title: String, subtitle: String) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: icon)
        .font(.largeTitle)
        .foregroundStyle(.green)
      Text(title)
        .font(.headline)
      Text(subtitle)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xl)
  }

  // MARK: - Helper Functions

  private func loadSafetyInfo() async {
    isLoading = true
    errorMessage = nil

    // Simulated data for preview - in production, call API
    // let client = await APIClient.shared
    // let info = try await client.fetchSafetyInfo(destination: destinationName)

    // For now, create sample data
    await MainActor.run {
      safetyInfo = createSampleData()
      isLoading = false
    }
  }

  private func colorForRating(_ rating: Double) -> Color {
    switch rating {
    case 4.5...: return .green
    case 3.5..<4.5: return .blue
    case 2.5..<3.5: return .yellow
    case 1.5..<2.5: return .orange
    default: return .red
    }
  }

  private func severityColor(_ severity: SafetyAlertSeverity) -> Color {
    switch severity {
    case .info: return .blue
    case .low: return .green
    case .medium: return .yellow
    case .high: return .orange
    case .critical: return .red
    }
  }

  private func dangerLevelColor(_ level: DangerLevel) -> Color {
    switch level {
    case .caution: return .yellow
    case .avoidNight: return .purple
    case .avoidAlone: return .orange
    case .highRisk, .noGo: return .red
    }
  }

  private func incidentSeverityColor(_ severity: IncidentSeverity) -> Color {
    switch severity {
    case .minor: return .yellow
    case .moderate: return .orange
    case .severe, .critical: return .red
    }
  }

  private func formattedDate(_ timestamp: TimeInterval) -> String {
    let date = Date(timeIntervalSince1970: timestamp / 1000)
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .none
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: date)
  }

  private func createSampleData() -> DestinationSafetyInfo {
    let rating = SafetyRating(
      id: "1",
      destinationName: destinationName,
      destinationNameEn: "Tokyo",
      countryCode: "JP",
      cityId: nil,
      overallRating: 4.5,
      crimeRating: 4.8,
      healthRating: 4.5,
      naturalDisasterRating: 3.5,
      transportRating: 4.7,
      womenSafetyRating: 4.6,
      lgbtqSafetyRating: 4.0,
      summary: "东京是世界上最安全的大城市之一，犯罪率极低，公共交通便利安全。需注意地震等自然灾害风险。",
      summaryEn: "Tokyo is one of the safest major cities in the world.",
      generalTips: [
        "携带护照复印件，原件存放在安全处",
        "注意地震避难指示，熟悉酒店疏散路线",
        "乘坐电车时注意扒手，尤其在拥挤时段",
        "夜间避免独自前往偏僻地区",
      ],
      emergencyNumbers: EmergencyNumbers(
        police: "110",
        ambulance: "119",
        fire: "119",
        touristHotline: "0570-064-100"
      ),
      source: "日本国家旅游局",
      sourceUrl: nil,
      lastVerifiedAt: Date().timeIntervalSince1970 * 1000,
      createdAt: Date().timeIntervalSince1970 * 1000,
      updatedAt: Date().timeIntervalSince1970 * 1000
    )

    return DestinationSafetyInfo(
      rating: rating,
      alerts: [],
      dangerZones: [],
      recentIncidents: [],
      hasActiveAlerts: false,
      hasCriticalAlerts: false,
      dangerZoneCount: 0
    )
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    SafetyRatingView(destinationName: "东京")
  }
}
