import SwiftUI

// MARK: - Theme Settings Sheet

struct ThemeSettingsSheet: View {
  @Environment(ThemeManager.self) private var themeManager

  private let columns = [
    GridItem(.adaptive(minimum: 44), spacing: 4)
  ]

  var body: some View {
    List {
      // MARK: - Theme Mode Picker
      Section("theme.select".localized) {
        Picker(
          "theme.mode".localized,
          selection: Binding(
            get: { themeManager.currentMode },
            set: { themeManager.setTheme($0) }
          )
        ) {
          ForEach(ThemeMode.allCases) { mode in
            Text(mode.displayName).tag(mode)
          }
        }
        .pickerStyle(.inline)
      }

      // MARK: - Accent Color Picker
      Section("theme.accent".localized) {
        GlassEffectContainer {
          LazyVGrid(columns: columns, spacing: 4) {
            ForEach(AccentColorOption.allCases) { option in
              Circle()
                .fill(option.color)
                .frame(width: 28, height: 28)
                .padding(6)
                .glassEffect(
                  .regular
                    .tint(option == themeManager.accentColor ? option.color : .clear)
                    .interactive(),
                  in: .circle
                )
                .overlay {
                  if option == themeManager.accentColor {
                    Image(systemName: "checkmark")
                      .font(.caption.bold())
                      .foregroundStyle(.white)
                  }
                }
                .onTapGesture {
                  themeManager.setAccentColor(option)
                }
                .accessibilityLabel(option.displayName)
            }
          }
          .padding(8)
        }
        .listRowInsets(EdgeInsets())
        .listRowBackground(Color.clear)
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
