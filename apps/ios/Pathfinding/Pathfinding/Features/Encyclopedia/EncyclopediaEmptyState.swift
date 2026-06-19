import SwiftUI

// MARK: - Encyclopedia Empty State

struct EncyclopediaEmptyState: View {
  let icon: String
  let title: String
  let subtitle: String

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: icon)
        .font(.largeTitle)
        .foregroundStyle(.secondary)
      Text(title)
        .font(.headline)
      Text(subtitle)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xl)
  }
}
