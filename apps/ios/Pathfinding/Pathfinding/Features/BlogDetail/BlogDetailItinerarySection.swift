import SwiftUI

/// Itinerary day list, travel tips, and import CTA for the blog detail screen.
struct BlogDetailItinerarySection: View {
  let guide: BlogPost
  @Binding var selectedDay: AiDay?
  let onImport: () -> Void

  var body: some View {
    // Itinerary Days
    if let days = guide.aiDays, !days.isEmpty {
      itinerarySection(days)
    }

    // Tips
    if let tips = guide.aiTips, !tips.isEmpty {
      tipsSection(tips)
    }

    // Import Button
    if guide.aiDays != nil {
      importButton
    }
  }

  // MARK: - Itinerary Section

  private func itinerarySection(_ days: [AiDay]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("行程安排", systemImage: "map")
        .font(.headline)

      VStack(spacing: DesignTokens.Spacing.xs) {
        ForEach(days) { day in
          Button {
            selectedDay = day
          } label: {
            DayCard(day: day)
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  // MARK: - Tips Section

  private func tipsSection(_ tips: [String]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("旅行贴士", systemImage: "lightbulb.fill")
        .font(.headline)
        .foregroundStyle(.orange)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        ForEach(Array(tips.enumerated()), id: \.offset) { _, tip in
          HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
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
        .fill(DesignTokens.Colors.warning.opacity(0.08))
    )
  }

  // MARK: - Import Button

  private var importButton: some View {
    Button {
      onImport()
    } label: {
      HStack {
        Image(systemName: "square.and.arrow.down")
        Text("导入行程到我的旅程")
      }
      .font(.headline)
      .frame(maxWidth: .infinity)
      .padding(.vertical, DesignTokens.Spacing.md)
    }
    .buttonStyle(.borderedProminent)
    .tint(DesignTokens.Colors.accent)
  }
}
