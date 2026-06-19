import SwiftUI

// MARK: - Language Settings Sheet

struct LanguageSettingsSheet: View {
  @Environment(\.localizationManager) private var localizationManager

  var body: some View {
    List {
      // MARK: - Language Preview
      Section {
        LanguagePreviewCard()
          .listRowInsets(EdgeInsets())
          .listRowBackground(Color.clear)
      }

      // MARK: - Language Options
      Section("language.select".localized) {
        ForEach(AppLanguage.allCases) { language in
          LanguageRow(
            language: language,
            isSelected: localizationManager.currentLanguage == language
          ) {
            localizationManager.setLanguage(language)
          }
        }
      }

      // MARK: - Description
      Section {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          Label("language.about".localized, systemImage: "info.circle")
            .font(.subheadline)
            .fontWeight(.medium)

          Text("language.about_description".localized)
            .font(.caption)
            .foregroundStyle(.secondary)

          Text("language.restart_hint".localized)
            .font(.caption)
            .foregroundStyle(.orange)
            .padding(.top, DesignTokens.Spacing.xxs)
        }
        .padding(.vertical, DesignTokens.Spacing.xs)
      }
    }
    .navigationTitle("language.title".localized)
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Language Preview Card

struct LanguagePreviewCard: View {
  @Environment(\.localizationManager) private var localizationManager

  var body: some View {
    GlassEffectContainer {
      HStack(spacing: DesignTokens.Spacing.md) {
        // Chinese preview
        LanguageMiniPreview(
          title: "中文",
          languageCode: "zh",
          isActive: localizationManager.effectiveLanguage == .chinese
        )

        // English preview
        LanguageMiniPreview(
          title: "EN",
          languageCode: "en",
          isActive: localizationManager.effectiveLanguage == .english
        )
      }
      .padding(DesignTokens.Spacing.md)
    }
  }
}

// MARK: - Language Mini Preview

struct LanguageMiniPreview: View {
  let title: String
  let languageCode: String
  let isActive: Bool

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.xs) {
      // Preview window
      VStack(spacing: 6) {
        // Header with language icon
        HStack {
          ZStack {
            Circle()
              .fill(isActive ? DesignTokens.Colors.accent : Color.gray.opacity(0.3))
              .frame(width: 28, height: 28)

            Text(title)
              .font(.caption2)
              .fontWeight(.bold)
              .foregroundStyle(.white)
          }

          Spacer()

          if isActive {
            Image(systemName: "checkmark.circle.fill")
              .font(.caption)
              .foregroundStyle(.green)
          }
        }
        .padding(.horizontal, 10)
        .padding(.top, 10)

        // Sample text
        VStack(alignment: .leading, spacing: 4) {
          RoundedRectangle(cornerRadius: 3)
            .fill(Color.primary.opacity(0.3))
            .frame(height: 8)

          RoundedRectangle(cornerRadius: 3)
            .fill(Color.primary.opacity(0.2))
            .frame(width: 60, height: 6)
        }
        .padding(.horizontal, 10)
        .padding(.bottom, 10)
      }
      .frame(maxWidth: .infinity)
      .cardSurface(tint: isActive ? Color.accentColor.opacity(0.3) : nil)

      // Label
      Text(languageCode == "zh" ? "简体中文" : "English")
        .font(.caption)
        .fontWeight(isActive ? .semibold : .regular)
        .foregroundStyle(isActive ? .primary : .secondary)
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Language Row

struct LanguageRow: View {
  let language: AppLanguage
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        // Icon
        ZStack {
          Circle()
            .fill(language.iconColor.opacity(0.15))
            .frame(width: 36, height: 36)

          Image(systemName: language.icon)
            .font(.body)
            .foregroundStyle(language.iconColor)
        }

        // Text
        VStack(alignment: .leading, spacing: 2) {
          Text(language.nativeName)
            .font(.body)
            .foregroundStyle(.primary)

          Text(languageDescription)
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

  private var languageDescription: String {
    switch language {
    case .system:
      return "language.system_description".localized
    case .chinese:
      return "language.chinese_description".localized
    case .english:
      return "language.english_description".localized
    }
  }
}

// MARK: - Preview

#Preview {
  LanguageSettingsSheet()
    .environment(LocalizationManager.shared)
}
