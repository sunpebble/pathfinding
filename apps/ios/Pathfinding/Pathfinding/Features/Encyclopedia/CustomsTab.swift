import SwiftUI

// MARK: - Customs Tab

struct CustomsTab: View {
  let encyclopedia: CityEncyclopedia

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      if encyclopedia.customs.isEmpty {
        EncyclopediaEmptyState(
          icon: "person.2.fill",
          title: "暂无风俗信息",
          subtitle: "该城市尚未添加风俗禁忌数据"
        )
      } else {
        // Taboos (important warnings)
        let taboos = encyclopedia.tabooCustems
        if !taboos.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Label("禁忌事项", systemImage: "exclamationmark.triangle.fill")
              .font(.headline)
              .foregroundStyle(.red)

            ForEach(taboos) { custom in
              customCard(custom, isTaboo: true)
            }
          }
          .padding(DesignTokens.Spacing.md)
          .cardSurface(tint: .red.opacity(0.15))
        }

        // Normal customs by category
        let normalCustoms = encyclopedia.normalCustoms
        let customsByCategory = Dictionary(grouping: normalCustoms, by: { $0.category })

        ForEach(CustomCategory.allCases, id: \.self) { category in
          if let customs = customsByCategory[category], !customs.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
              Label(category.displayName, systemImage: category.icon)
                .font(.headline)

              ForEach(customs) { custom in
                customCard(custom, isTaboo: false)
              }
            }
            .padding(DesignTokens.Spacing.md)
            .cardSurface()
          }
        }
      }
    }
  }

  private func customCard(_ custom: LocalCustom, isTaboo: Bool) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: custom.category.icon)
          .foregroundStyle(isTaboo ? .red : .blue)
        Text(custom.title)
          .font(.subheadline)
          .fontWeight(.semibold)

        Spacer()

        // Importance badge
        Text(custom.importance.displayName)
          .font(.caption2)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .background(
            Capsule()
              .fill(importanceColor(custom.importance).opacity(0.1))
          )
          .foregroundStyle(importanceColor(custom.importance))
      }

      Text(custom.description)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(DesignTokens.Spacing.md)
  }

  // MARK: - Helper Functions

  private func importanceColor(_ importance: CustomImportance) -> Color {
    switch importance {
    case .low: return .green
    case .medium: return .orange
    case .high: return .red
    }
  }
}
