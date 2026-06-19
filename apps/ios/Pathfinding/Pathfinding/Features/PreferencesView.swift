import SwiftUI

/// User preferences settings view
struct PreferencesView: View {
  @State private var preferenceStore = PreferenceStore.shared
  @State private var showResetConfirmation = false
  @State private var isResetting = false

  var body: some View {
    List {
      // MARK: - Preference Summary
      if let preferences = preferenceStore.preferences {
        Section {
          PreferenceSummaryCard(preferences: preferences)
            .listRowInsets(EdgeInsets())
            .listRowBackground(Color.clear)
        }
      }

      // MARK: - Top Categories
      if !preferenceStore.topCategories.isEmpty {
        Section {
          ForEach(preferenceStore.topCategories) { categoryScore in
            if let category = categoryScore.preferenceCategory {
              CategoryScoreRow(category: category, score: categoryScore.normalized)
            }
          }
        } header: {
          Text("preferences.learned_interests".localized)
        } footer: {
          Text("preferences.learned_interests_footer".localized)
        }
      }

      // MARK: - Explicit Preferences
      Section {
        NavigationLink {
          CategorySelectionView()
        } label: {
          HStack {
            Image(systemName: "heart.fill")
              .foregroundStyle(.pink)
              .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
              Text("preferences.favorite_categories".localized)

              if let prefs = preferenceStore.preferences {
                Text(prefs.explicitPreferences.isEmpty
                  ? "preferences.not_set".localized
                  : prefs.explicitPreferences.map { $0.displayName }.joined(separator: ", "))
                  .font(.caption)
                  .foregroundStyle(.secondary)
                  .lineLimit(1)
              }
            }
          }
        }
      } header: {
        Text("preferences.your_preferences".localized)
      }

      // MARK: - Travel Style
      Section {
        NavigationLink {
          SingleSelectionView(
            title: "preferences.travel_style".localized,
            options: TravelStyle.allCases,
            isSelected: { $0 == preferenceStore.preferences?.travelStyle },
            onSelect: { style in
              Task { _ = await preferenceStore.updatePreferences(travelStyle: style) }
            },
            icon: { $0.icon },
            label: { $0.displayName },
            description: { $0.description },
            tintColor: DesignTokens.Colors.accent
          )
        } label: {
          PreferenceRow(
            icon: preferenceStore.preferences?.travelStyle.icon ?? "scale.3d",
            title: "preferences.style".localized,
            value: preferenceStore.preferences?.travelStyle.displayName ?? "preferences.not_set".localized,
            iconColor: .indigo
          )
        }

        NavigationLink {
          SingleSelectionView(
            title: "preferences.budget".localized,
            options: BudgetLevel.allCases,
            isSelected: { $0 == preferenceStore.preferences?.budgetLevel },
            onSelect: { level in
              Task { _ = await preferenceStore.updatePreferences(budgetLevel: level) }
            },
            icon: { $0.icon },
            label: { $0.displayName },
            description: { $0.description },
            tintColor: .green
          )
        } label: {
          PreferenceRow(
            icon: preferenceStore.preferences?.budgetLevel.icon ?? "dollarsign.circle",
            title: "preferences.budget".localized,
            value: preferenceStore.preferences?.budgetLevel.displayName ?? "preferences.not_set".localized,
            iconColor: .green
          )
        }

        NavigationLink {
          SingleSelectionView(
            title: "preferences.pace".localized,
            options: PacePreference.allCases,
            isSelected: { $0 == preferenceStore.preferences?.pacePreference },
            onSelect: { pace in
              Task { _ = await preferenceStore.updatePreferences(pacePreference: pace) }
            },
            icon: { $0.icon },
            label: { $0.displayName },
            description: { $0.description },
            tintColor: .orange
          )
        } label: {
          PreferenceRow(
            icon: preferenceStore.preferences?.pacePreference.icon ?? "figure.walk",
            title: "preferences.pace".localized,
            value: preferenceStore.preferences?.pacePreference.displayName ?? "preferences.not_set".localized,
            iconColor: .orange
          )
        }
      } header: {
        Text("preferences.travel_style".localized)
      }

      // MARK: - Additional Preferences
      Section {
        Toggle(isOn: Binding(
          get: { preferenceStore.preferences?.preferLocalFood ?? true },
          set: { newValue in
            Task {
              await preferenceStore.updatePreferences(preferLocalFood: newValue)
            }
          }
        )) {
          Label("preferences.local_food".localized, systemImage: "fork.knife")
        }

        Toggle(isOn: Binding(
          get: { preferenceStore.preferences?.preferOffBeatPlaces ?? false },
          set: { newValue in
            Task {
              await preferenceStore.updatePreferences(preferOffBeatPlaces: newValue)
            }
          }
        )) {
          Label("preferences.off_beat".localized, systemImage: "mappin.and.ellipse")
        }

        Toggle(isOn: Binding(
          get: { preferenceStore.preferences?.accessibilityNeeds ?? false },
          set: { newValue in
            Task {
              await preferenceStore.updatePreferences(accessibilityNeeds: newValue)
            }
          }
        )) {
          Label("preferences.accessibility".localized, systemImage: "figure.roll")
        }
      } header: {
        Text("preferences.additional".localized)
      }

      // MARK: - Reset Section
      Section {
        Button(role: .destructive) {
          showResetConfirmation = true
        } label: {
          HStack {
            if isResetting {
              ProgressView()
                .frame(width: 28)
            } else {
              Image(systemName: "arrow.counterclockwise")
                .frame(width: 28)
            }

            Text("preferences.reset".localized)
          }
        }
        .disabled(isResetting)
      } footer: {
        Text("preferences.reset_footer".localized)
      }
    }
    .navigationTitle("preferences.title".localized)
    .refreshable {
      await preferenceStore.loadAllData()
    }
    .task {
      await preferenceStore.loadAllData()
    }
    .alert("preferences.reset_confirm_title".localized, isPresented: $showResetConfirmation) {
      Button("preferences.cancel".localized, role: .cancel) {}
      Button("preferences.reset".localized, role: .destructive) {
        Task {
          isResetting = true
          _ = await preferenceStore.resetPreferences()
          isResetting = false
        }
      }
    } message: {
      Text("preferences.reset_confirm_message".localized)
    }
  }
}

// MARK: - Preference Summary Card

struct PreferenceSummaryCard: View {
  let preferences: UserPreferences

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("preferences.your_profile".localized)
            .font(.headline)

          Text(preferences.isLearned
            ? "preferences.profile_learned".localized
            : "preferences.profile_learning".localized)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        // Interaction count badge
        HStack(spacing: 4) {
          Image(systemName: "chart.line.uptrend.xyaxis")
            .font(.caption)
          Text("\(preferences.totalInteractions)")
            .font(.caption)
            .fontWeight(.medium)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(.tertiarySystemBackground))
        .clipShape(Capsule())
      }

      // Top categories preview
      if !preferences.topCategories.isEmpty {
        HStack(spacing: DesignTokens.Spacing.xs) {
          ForEach(preferences.topCategories.prefix(4), id: \.rawValue) { category in
            CategoryBadge(category: category)
          }

          if preferences.topCategories.count > 4 {
            Text("+\(preferences.topCategories.count - 4)")
              .font(.caption)
              .foregroundStyle(.secondary)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(Color(.tertiarySystemBackground))
              .clipShape(Capsule())
          }
        }
      }

      // Style summary
      HStack(spacing: DesignTokens.Spacing.md) {
        StyleBadge(
          icon: preferences.travelStyle.icon,
          label: preferences.travelStyle.displayName,
          color: .indigo
        )

        StyleBadge(
          icon: preferences.budgetLevel.icon,
          label: preferences.budgetLevel.displayName,
          color: .green
        )

        StyleBadge(
          icon: preferences.pacePreference.icon,
          label: preferences.pacePreference.displayName,
          color: .orange
        )
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.vertical, DesignTokens.Spacing.xs)
  }
}

// MARK: - Category Badge

struct CategoryBadge: View {
  let category: PreferenceCategory

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: category.icon)
        .font(.caption2)
      Text(category.displayName)
        .font(.caption)
    }
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .background(category.color.opacity(0.15))
    .foregroundStyle(category.color)
    .clipShape(Capsule())
  }
}

// MARK: - Style Badge

struct StyleBadge: View {
  let icon: String
  let label: String
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)

      Text(label)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - Category Score Row

struct CategoryScoreRow: View {
  let category: PreferenceCategory
  let score: Double

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: category.icon)
        .font(.title3)
        .foregroundStyle(category.color)
        .frame(width: 28)

      Text(category.displayName)

      Spacer()

      // Score bar
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Capsule()
            .fill(Color(.tertiarySystemBackground))
            .frame(height: 8)

          Capsule()
            .fill(category.color)
            .frame(width: geometry.size.width * score, height: 8)
        }
      }
      .frame(width: 80, height: 8)

      Text("\(Int(score * 100))%")
        .font(.caption)
        .foregroundStyle(.secondary)
        .frame(width: 40, alignment: .trailing)
    }
  }
}

// MARK: - Preference Row

struct PreferenceRow: View {
  let icon: String
  let title: String
  let value: String
  let iconColor: Color

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(iconColor)
        .frame(width: 28)

      Text(title)

      Spacer()

      Text(value)
        .foregroundStyle(.secondary)
    }
  }
}

// MARK: - Category Selection View (multi-select, kept separate)

struct CategorySelectionView: View {
  @State private var preferenceStore = PreferenceStore.shared
  @State private var selectedCategories: Set<PreferenceCategory> = []
  @State private var isSaving = false
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    List {
      Section {
        ForEach(PreferenceCategory.allCases) { category in
          Button {
            if selectedCategories.contains(category) {
              selectedCategories.remove(category)
            } else {
              selectedCategories.insert(category)
            }
          } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
              Image(systemName: category.icon)
                .font(.title3)
                .foregroundStyle(category.color)
                .frame(width: 28)

              VStack(alignment: .leading, spacing: 2) {
                Text(category.displayName)
                  .foregroundStyle(.primary)
              }

              Spacer()

              if selectedCategories.contains(category) {
                Image(systemName: "checkmark.circle.fill")
                  .foregroundStyle(.green)
              }
            }
          }
          .buttonStyle(.plain)
        }
      } footer: {
        Text("preferences.category_selection_footer".localized)
      }
    }
    .navigationTitle("preferences.favorite_categories".localized)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          Task {
            isSaving = true
            _ = await preferenceStore.updatePreferences(
              explicitPreferences: Array(selectedCategories)
            )
            isSaving = false
            dismiss()
          }
        } label: {
          if isSaving {
            ProgressView()
          } else {
            Text("preferences.save".localized)
              .fontWeight(.semibold)
          }
        }
        .disabled(isSaving)
      }
    }
    .onAppear {
      if let prefs = preferenceStore.preferences {
        selectedCategories = Set(prefs.explicitPreferences)
      }
    }
  }
}

// MARK: - Generic Single-Selection View
// Replaces TravelStyleSelectionView / BudgetLevelSelectionView / PacePreferenceSelectionView.
// All three were structurally identical (plain-button rows, checkmark on selected, auto-dismiss).

struct SingleSelectionView<Option: Identifiable & Hashable>: View {
  let title: String
  let options: [Option]
  let isSelected: (Option) -> Bool
  let onSelect: (Option) -> Void
  let icon: (Option) -> String
  let label: (Option) -> String
  let description: (Option) -> String
  let tintColor: Color

  @Environment(\.dismiss) private var dismiss

  var body: some View {
    List {
      Section {
        ForEach(options) { option in
          Button {
            onSelect(option)
            dismiss()
          } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
              Image(systemName: icon(option))
                .font(.title3)
                .foregroundStyle(tintColor)
                .frame(width: 28)

              VStack(alignment: .leading, spacing: 2) {
                Text(label(option))
                  .foregroundStyle(.primary)
                Text(description(option))
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }

              Spacer()

              if isSelected(option) {
                Image(systemName: "checkmark.circle.fill")
                  .foregroundStyle(.green)
              }
            }
          }
          .buttonStyle(.plain)
        }
      }
    }
    .navigationTitle(title)
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Previews

#Preview {
  NavigationStack {
    PreferencesView()
  }
}
