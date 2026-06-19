import SwiftUI

enum MediaMode: String, CaseIterable {
  case images = "图片"
  case map = "地图"
}

// MARK: - Day Colors

/// Shared day-color palette used across the blog detail media + map views.
enum BlogDetailDayColors {
  static let palette: [Color] = [
    DesignTokens.Colors.info,     // Day 1
    DesignTokens.Colors.warning,  // Day 2
    DesignTokens.Colors.success,  // Day 3
    DesignTokens.Colors.aiPurple, // Day 4
    .pink,                        // Day 5
    .teal,                        // Day 6
    DesignTokens.Colors.error,    // Day 7+
  ]

  static func color(forDay dayNumber: Int) -> Color {
    let index = min(dayNumber - 1, palette.count - 1)
    return palette[max(0, index)]
  }
}
