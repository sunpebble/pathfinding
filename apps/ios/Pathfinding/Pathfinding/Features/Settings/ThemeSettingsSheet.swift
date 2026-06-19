import SwiftUI

// MARK: - Theme Settings Sheet

struct ThemeSettingsSheet: View {
  @Environment(ThemeManager.self) private var themeManager
  @Environment(\.colorScheme) private var colorScheme

  var body: some View {
    List {
      // MARK: - Theme Preview
      Section {
        ThemePreviewCard(colorScheme: colorScheme)
          .listRowInsets(EdgeInsets())
          .listRowBackground(Color.clear)
      }

      // MARK: - Theme Options
      Section("theme.select".localized) {
        ForEach(ThemeMode.allCases) { mode in
          ThemeModeRow(
            mode: mode,
            isSelected: themeManager.currentMode == mode
          ) {
            themeManager.setTheme(mode)
          }
        }
      }

      // MARK: - Description
      Section {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          Label("theme.about".localized, systemImage: "info.circle")
            .font(.subheadline)
            .fontWeight(.medium)

          Text("theme.about_description".localized)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, DesignTokens.Spacing.xs)
      }
    }
    .navigationTitle("theme.title".localized)
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Theme Preview Card

struct ThemePreviewCard: View {
  let colorScheme: ColorScheme

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Light mode preview
      ThemeMiniPreview(
        title: "theme.preview.light".localized,
        isDark: false,
        isActive: colorScheme == .light
      )

      // Dark mode preview
      ThemeMiniPreview(
        title: "theme.preview.dark".localized,
        isDark: true,
        isActive: colorScheme == .dark
      )
    }
    .padding(DesignTokens.Spacing.md)
  }
}

// MARK: - Theme Mini Preview

struct ThemeMiniPreview: View {
  let title: String
  let isDark: Bool
  let isActive: Bool

  private var backgroundColor: Color {
    isDark ? Color(white: 0.1) : Color(white: 0.98)
  }

  private var cardColor: Color {
    isDark ? Color(white: 0.2) : .white
  }

  private var textColor: Color {
    isDark ? .white : .black
  }

  private var secondaryTextColor: Color {
    isDark ? Color(white: 0.6) : Color(white: 0.4)
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.xs) {
      // Preview window
      VStack(spacing: 6) {
        // Header bar
        HStack {
          Circle()
            .fill(isDark ? DesignTokens.Colors.accent.opacity(0.8) : DesignTokens.Colors.accent)
            .frame(width: 20, height: 20)

          VStack(alignment: .leading, spacing: 2) {
            RoundedRectangle(cornerRadius: 2)
              .fill(textColor.opacity(0.8))
              .frame(width: 50, height: 6)

            RoundedRectangle(cornerRadius: 2)
              .fill(secondaryTextColor.opacity(0.5))
              .frame(width: 30, height: 4)
          }

          Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.top, 8)

        // Content cards
        VStack(spacing: 4) {
          RoundedRectangle(cornerRadius: 4)
            .fill(cardColor)
            .frame(height: 24)
            .shadow(color: .black.opacity(isDark ? 0.3 : 0.1), radius: 2, y: 1)

          RoundedRectangle(cornerRadius: 4)
            .fill(cardColor)
            .frame(height: 24)
            .shadow(color: .black.opacity(isDark ? 0.3 : 0.1), radius: 2, y: 1)
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 8)
      }
      .frame(maxWidth: .infinity)
      .background(backgroundColor)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .overlay(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
          .stroke(isActive ? Color.accentColor : Color.clear, lineWidth: 2)
      )
      .shadow(color: .black.opacity(0.1), radius: 4, y: 2)

      // Label
      Text(title)
        .font(.caption)
        .fontWeight(isActive ? .semibold : .regular)
        .foregroundStyle(isActive ? .primary : .secondary)

      // Active indicator
      if isActive {
        Image(systemName: "checkmark.circle.fill")
          .font(.caption)
          .foregroundStyle(.green)
      } else {
        Circle()
          .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
          .frame(width: 14, height: 14)
      }
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Theme Mode Row

struct ThemeModeRow: View {
  let mode: ThemeMode
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Icon
        ZStack {
          Circle()
            .fill(mode.iconColor.opacity(0.15))
            .frame(width: 36, height: 36)

          Image(systemName: mode.icon)
            .font(.body)
            .foregroundStyle(mode.iconColor)
        }

        // Text
        VStack(alignment: .leading, spacing: 2) {
          Text(mode.displayName)
            .font(.body)
            .foregroundStyle(.primary)

          Text(modeDescription)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Selection indicator
        if isSelected {
          Image(systemName: "checkmark.circle.fill")
            .font(.title3)
            .foregroundStyle(.green)
            .transition(.scale.combined(with: .opacity))
        }
      }
      .padding(.vertical, DesignTokens.Spacing.xxs)
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
  }

  private var modeDescription: String {
    switch mode {
    case .system:
      return "theme.system_description".localized
    case .light:
      return "theme.light_description".localized
    case .dark:
      return "theme.dark_description".localized
    }
  }
}
