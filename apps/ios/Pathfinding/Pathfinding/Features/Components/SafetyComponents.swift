import SwiftUI

// MARK: - Safety Badge

/// Compact safety rating badge for use in lists and cards
struct SafetyBadge: View {
  let rating: Double
  let size: BadgeSize

  enum BadgeSize {
    case small
    case medium
    case large

    var fontSize: Font {
      switch self {
      case .small: return .caption2
      case .medium: return .caption
      case .large: return .subheadline
      }
    }

    var iconSize: Font {
      switch self {
      case .small: return .caption2
      case .medium: return .caption
      case .large: return .subheadline
      }
    }

    var padding: CGFloat {
      switch self {
      case .small: return 4
      case .medium: return 6
      case .large: return 8
      }
    }
  }

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: iconForRating)
        .font(size.iconSize)
      Text(String(format: "%.1f", rating))
        .font(size.fontSize)
        .fontWeight(.semibold)
    }
    .padding(.horizontal, size.padding)
    .padding(.vertical, size.padding / 2)
    .background(
      Capsule()
        .fill(colorForRating.opacity(0.15))
    )
    .foregroundStyle(colorForRating)
  }

  private var iconForRating: String {
    switch rating {
    case 4.5...: return "checkmark.shield.fill"
    case 3.5..<4.5: return "shield.fill"
    case 2.5..<3.5: return "exclamationmark.shield.fill"
    default: return "xmark.shield.fill"
    }
  }

  private var colorForRating: Color {
    switch rating {
    case 4.5...: return .green
    case 3.5..<4.5: return .blue
    case 2.5..<3.5: return .yellow
    case 1.5..<2.5: return .orange
    default: return .red
    }
  }
}

// MARK: - Safety Alert Banner

/// Banner to display active safety alerts
struct SafetyAlertBanner: View {
  let alerts: [SafetyAlert]
  let onTap: () -> Void

  var body: some View {
    if let criticalAlert = alerts.first(where: { $0.severity == .critical }) {
      alertBanner(alert: criticalAlert, isCritical: true)
    } else if let highAlert = alerts.first(where: { $0.severity == .high }) {
      alertBanner(alert: highAlert, isCritical: false)
    } else if let firstAlert = alerts.first {
      alertBanner(alert: firstAlert, isCritical: false)
    }
  }

  private func alertBanner(alert: SafetyAlert, isCritical: Bool) -> some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        Image(systemName: isCritical ? "exclamationmark.triangle.fill" : alert.alertType.icon)
          .font(.title3)

        VStack(alignment: .leading, spacing: 2) {
          Text(alert.title)
            .font(.subheadline)
            .fontWeight(.semibold)
            .lineLimit(1)
          Text(alert.alertType.displayName)
            .font(.caption)
            .opacity(0.8)
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .opacity(0.6)
      }
      .padding(DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isCritical ? Color.red : severityColor(alert.severity))
      )
      .foregroundStyle(.white)
    }
    .buttonStyle(.plain)
  }

  private func severityColor(_ severity: SafetyAlertSeverity) -> Color {
    switch severity {
    case .critical: return .red
    case .high: return .orange
    case .medium: return .yellow
    case .low: return .green
    case .info: return .blue
    }
  }
}

// MARK: - Danger Zone Warning Card

/// Compact warning card for nearby danger zones
struct DangerZoneWarningCard: View {
  let zone: DangerZone
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Icon
        ZStack {
          Circle()
            .fill(dangerLevelColor.opacity(0.15))
            .frame(width: 40, height: 40)
          Image(systemName: zone.dangerLevel.icon)
            .foregroundStyle(dangerLevelColor)
        }

        VStack(alignment: .leading, spacing: 2) {
          Text(zone.zoneName)
            .font(.subheadline)
            .fontWeight(.medium)
          HStack(spacing: 4) {
            Text(zone.dangerLevel.displayName)
              .font(.caption)
              .foregroundStyle(.secondary)
            if let distance = zone.distance {
              Text("-")
                .font(.caption)
                .foregroundStyle(.tertiary)
              Text(String(format: "%.1f km", distance))
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
      .padding(DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(Color(.systemBackground))
          .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
      )
      .overlay(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .stroke(dangerLevelColor.opacity(0.3), lineWidth: 1)
      )
    }
    .buttonStyle(.plain)
  }

  private var dangerLevelColor: Color {
    switch zone.dangerLevel {
    case .caution: return .yellow
    case .avoidNight: return .purple
    case .avoidAlone: return .orange
    case .highRisk, .noGo: return .red
    }
  }
}

// MARK: - Safety Summary Card

/// Compact safety summary for destination overview
struct SafetySummaryCard: View {
  let rating: SafetyRating?
  let alertCount: Int
  let dangerZoneCount: Int
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.md) {
        // Safety icon and rating
        VStack {
          if let rating = rating {
            ZStack {
              Circle()
                .fill(colorForRating(rating.overallRating).opacity(0.15))
                .frame(width: 50, height: 50)
              VStack(spacing: 0) {
                Image(systemName: rating.safetyLevel.icon)
                  .font(.title3)
                Text(String(format: "%.1f", rating.overallRating))
                  .font(.caption2)
                  .fontWeight(.bold)
              }
              .foregroundStyle(colorForRating(rating.overallRating))
            }
          } else {
            ZStack {
              Circle()
                .fill(Color(.systemGray5))
                .frame(width: 50, height: 50)
              Image(systemName: "shield.slash.fill")
                .foregroundStyle(.secondary)
            }
          }
        }

        VStack(alignment: .leading, spacing: 4) {
          Text("安全信息")
            .font(.subheadline)
            .fontWeight(.semibold)

          if let rating = rating {
            Text(rating.safetyLevel.displayName)
              .font(.caption)
              .foregroundStyle(.secondary)
          } else {
            Text("暂无评级")
              .font(.caption)
              .foregroundStyle(.secondary)
          }

          // Stats row
          HStack(spacing: DesignTokens.Spacing.sm) {
            if alertCount > 0 {
              HStack(spacing: 2) {
                Image(systemName: "exclamationmark.triangle.fill")
                  .font(.caption2)
                  .foregroundStyle(.orange)
                Text("\(alertCount)")
                  .font(.caption2)
              }
            }
            if dangerZoneCount > 0 {
              HStack(spacing: 2) {
                Image(systemName: "mappin.circle.fill")
                  .font(.caption2)
                  .foregroundStyle(.red)
                Text("\(dangerZoneCount)")
                  .font(.caption2)
              }
            }
          }
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
      .padding(DesignTokens.Spacing.md)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
          .fill(Color(.systemBackground))
          .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
      )
    }
    .buttonStyle(.plain)
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
}

// MARK: - Incident Report Card

/// Compact card for displaying an incident report
struct IncidentReportCard: View {
  let incident: SafetyIncidentReport

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Header
      HStack {
        Image(systemName: incident.incidentType.icon)
          .foregroundStyle(incidentSeverityColor)
        Text(incident.incidentType.displayName)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Text(formattedDate)
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }

      Text(incident.title)
        .font(.subheadline)
        .fontWeight(.medium)
        .lineLimit(2)

      Text(incident.description)
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(2)

      // Footer
      HStack {
        if let location = incident.specificLocation {
          HStack(spacing: 2) {
            Image(systemName: "mappin")
              .font(.caption2)
            Text(location)
              .font(.caption2)
          }
          .foregroundStyle(.tertiary)
          .lineLimit(1)
        }

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
    .padding(DesignTokens.Spacing.sm)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
    )
  }

  private var incidentSeverityColor: Color {
    switch incident.severity {
    case .minor: return .yellow
    case .moderate: return .orange
    case .severe, .critical: return .red
    }
  }

  private var formattedDate: String {
    let date = Date(timeIntervalSince1970: incident.incidentDate / 1000)
    let formatter = RelativeDateTimeFormatter()
    formatter.locale = Locale(identifier: "zh_CN")
    formatter.unitsStyle = .abbreviated
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

// MARK: - Previews

#Preview("Safety Badge") {
  VStack(spacing: 20) {
    HStack(spacing: 10) {
      SafetyBadge(rating: 4.8, size: .small)
      SafetyBadge(rating: 4.0, size: .small)
      SafetyBadge(rating: 3.0, size: .small)
      SafetyBadge(rating: 2.0, size: .small)
    }

    HStack(spacing: 10) {
      SafetyBadge(rating: 4.8, size: .medium)
      SafetyBadge(rating: 4.0, size: .medium)
      SafetyBadge(rating: 3.0, size: .medium)
    }

    HStack(spacing: 10) {
      SafetyBadge(rating: 4.8, size: .large)
      SafetyBadge(rating: 2.0, size: .large)
    }
  }
  .padding()
}

#Preview("Safety Summary Card") {
  VStack(spacing: 20) {
    SafetySummaryCard(
      rating: nil,
      alertCount: 0,
      dangerZoneCount: 0,
      onTap: {}
    )

    SafetySummaryCard(
      rating: SafetyRating(
        id: "1",
        destinationName: "东京",
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
        summary: "东京是世界上最安全的大城市之一",
        summaryEn: nil,
        generalTips: [],
        emergencyNumbers: nil,
        source: "official",
        sourceUrl: nil,
        lastVerifiedAt: Date().timeIntervalSince1970 * 1000,
        createdAt: Date().timeIntervalSince1970 * 1000,
        updatedAt: Date().timeIntervalSince1970 * 1000
      ),
      alertCount: 2,
      dangerZoneCount: 3,
      onTap: {}
    )
  }
  .padding()
}
