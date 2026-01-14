import SwiftUI

// MARK: - Filter Sheet

struct FilterSheet: View {
  let store: HiddenGemsStore
  @Environment(\.dismiss) private var dismiss

  @State private var selectedCategory: PoiCategory?
  @State private var selectedPopularityLevel: PopularityLevel?
  @State private var onlyLocalRecommended: Bool = false

  init(store: HiddenGemsStore) {
    self.store = store
    _selectedCategory = State(initialValue: store.selectedCategory)
    _selectedPopularityLevel = State(initialValue: store.selectedPopularityLevel)
    _onlyLocalRecommended = State(initialValue: store.onlyLocalRecommended)
  }

  var body: some View {
    NavigationStack {
      Form {
        // Category Section
        Section {
          categoryPicker
        } header: {
          Text("分类")
        } footer: {
          Text("选择要筛选的景点类型")
        }

        // Popularity Level Section
        Section {
          popularityPicker
        } header: {
          Text("热门程度")
        } footer: {
          Text("根据景点的知名度筛选")
        }

        // Local Recommendation Section
        Section {
          Toggle(isOn: $onlyLocalRecommended) {
            Label {
              VStack(alignment: .leading, spacing: 2) {
                Text("仅显示本地推荐")
                Text("由当地人推荐的小众景点")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            } icon: {
              Image(systemName: "checkmark.seal.fill")
                .foregroundStyle(.green)
            }
          }
        }

        // Reset Section
        Section {
          Button(role: .destructive) {
            resetFilters()
          } label: {
            Label("重置所有筛选", systemImage: "arrow.counterclockwise")
              .frame(maxWidth: .infinity)
          }
        }
      }
      .navigationTitle("筛选")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("应用") {
            applyFilters()
          }
          .fontWeight(.semibold)
        }
      }
    }
  }

  // MARK: - Category Picker

  private var categoryPicker: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // All categories option
      FilterOptionRow(
        title: "全部分类",
        icon: "square.grid.2x2",
        color: .gray,
        isSelected: selectedCategory == nil
      ) {
        withAnimation {
          selectedCategory = nil
        }
      }

      Divider()

      // Category options
      ForEach(PoiCategory.allCases, id: \.self) { category in
        FilterOptionRow(
          title: category.displayName,
          icon: category.icon,
          color: categoryColor(category),
          isSelected: selectedCategory == category
        ) {
          withAnimation {
            selectedCategory = category
          }
        }
      }
    }
  }

  // MARK: - Popularity Picker

  private var popularityPicker: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // All levels option
      FilterOptionRow(
        title: "全部程度",
        icon: "chart.bar",
        color: .gray,
        isSelected: selectedPopularityLevel == nil
      ) {
        withAnimation {
          selectedPopularityLevel = nil
        }
      }

      Divider()

      // Popularity level options
      ForEach(PopularityLevel.allCases, id: \.self) { level in
        FilterOptionRow(
          title: level.displayName,
          icon: level.icon,
          color: popularityColor(level),
          isSelected: selectedPopularityLevel == level,
          subtitle: popularityDescription(level)
        ) {
          withAnimation {
            selectedPopularityLevel = level
          }
        }
      }
    }
  }

  // MARK: - Helpers

  private func categoryColor(_ category: PoiCategory) -> Color {
    switch category {
    case .attraction: return .orange
    case .restaurant: return .red
    case .hotel: return .blue
    case .shopping: return .purple
    case .other: return .gray
    }
  }

  private func popularityColor(_ level: PopularityLevel) -> Color {
    switch level {
    case .hidden: return .green
    case .emerging: return .teal
    case .moderate: return .blue
    case .popular: return .orange
    case .crowded: return .red
    }
  }

  private func popularityDescription(_ level: PopularityLevel) -> String {
    switch level {
    case .hidden: return "鲜为人知的秘密景点"
    case .emerging: return "逐渐被发现的新兴景点"
    case .moderate: return "有一定知名度"
    case .popular: return "广为人知的热门景点"
    case .crowded: return "游���众多，需要排队"
    }
  }

  private func resetFilters() {
    withAnimation {
      selectedCategory = nil
      selectedPopularityLevel = nil
      onlyLocalRecommended = false
    }
  }

  private func applyFilters() {
    store.selectedCategory = selectedCategory
    store.selectedPopularityLevel = selectedPopularityLevel
    store.onlyLocalRecommended = onlyLocalRecommended

    Task {
      await store.fetchHiddenGems()
    }

    dismiss()
  }
}

// MARK: - Filter Option Row

struct FilterOptionRow: View {
  let title: String
  let icon: String
  let color: Color
  let isSelected: Bool
  var subtitle: String? = nil
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Icon
        Image(systemName: icon)
          .font(.body)
          .foregroundStyle(color)
          .frame(width: 24)

        // Text
        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .font(.body)
            .foregroundStyle(.primary)

          if let subtitle = subtitle {
            Text(subtitle)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Selection indicator
        if isSelected {
          Image(systemName: "checkmark.circle.fill")
            .foregroundStyle(.accentColor)
            .symbolEffect(.bounce, value: isSelected)
        }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Preview

#Preview {
  FilterSheet(store: HiddenGemsStore.shared)
}
