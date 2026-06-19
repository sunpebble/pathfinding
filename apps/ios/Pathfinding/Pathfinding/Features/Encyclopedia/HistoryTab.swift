import SwiftUI

// MARK: - History Tab

struct HistoryTab: View {
  let encyclopedia: CityEncyclopedia

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      if let history = encyclopedia.history {
        // Founded year
        if let foundedYear = history.formattedFoundedYear {
          HStack {
            Image(systemName: "building.columns.fill")
              .foregroundStyle(.purple)
            Text("建城时间: \(foundedYear)")
              .font(.headline)
            Spacer()
          }
          .padding(DesignTokens.Spacing.md)
          .cardSurface()
        }

        // Historical names
        if let historicalNames = history.historicalNames, !historicalNames.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("历史名称", systemImage: "scroll.fill")
              .font(.headline)

            FlowLayout(spacing: 8) {
              ForEach(historicalNames, id: \.self) { name in
                Text(name)
                  .font(.caption)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 4)
                  .background(
                    Capsule()
                      .fill(Color(.systemGray5))
                  )
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .cardSurface()
        }

        // Brief history
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Label("城市简史", systemImage: "book.fill")
            .font(.headline)

          Text(history.briefHistory)
            .font(.body)
            .foregroundStyle(.secondary)
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardSurface()

        // Cultural highlights
        if !history.culturalHighlights.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("文化亮点", systemImage: "star.fill")
              .font(.headline)
              .foregroundStyle(.yellow)

            ForEach(Array(history.culturalHighlights.enumerated()), id: \.offset) {
              _, highlight in
              HStack(alignment: .top, spacing: 8) {
                Image(systemName: "sparkle")
                  .foregroundStyle(.yellow)
                  .font(.caption)
                Text(highlight)
                  .font(.subheadline)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .cardSurface()
        }

        // Famous for
        if !history.famousFor.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("闻名之处", systemImage: "trophy.fill")
              .font(.headline)
              .foregroundStyle(.orange)

            FlowLayout(spacing: 8) {
              ForEach(history.famousFor, id: \.self) { item in
                Text(item)
                  .font(.caption)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 6)
                  .background(
                    Capsule()
                      .fill(Color.orange.opacity(0.1))
                  )
                  .foregroundStyle(.orange)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .cardSurface()
        }

        // World Heritage Sites
        if let sites = history.worldHeritageSites, !sites.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("世界遗产", systemImage: "globe.americas.fill")
              .font(.headline)
              .foregroundStyle(.blue)

            ForEach(sites, id: \.self) { site in
              HStack(spacing: 8) {
                Image(systemName: "building.columns.circle.fill")
                  .foregroundStyle(.blue)
                Text(site)
                  .font(.subheadline)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .cardSurface()
        }
      } else {
        EncyclopediaEmptyState(
          icon: "book.closed.fill",
          title: "暂无历史信息",
          subtitle: "该城市尚未添加历史文化数据"
        )
      }
    }
  }
}
