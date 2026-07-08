import SwiftUI

// MARK: - Copyable Source Abstraction

/// A normalized POI used by the copy UI. Only its existence (for counting)
/// matters to the shared layout, so this is intentionally minimal.
struct CopyablePoi: Identifiable, Hashable {
  let id: String
}

/// A day that can participate in a copy. Concrete days (`AiDay`,
/// `APIItineraryDay`) expose their POIs through `poiIDs`; the normalized
/// `pois` list is derived from it. `pois` is provided as a protocol-extension
/// default so it never collides with a conformer's differently-typed stored
/// `pois` property.
protocol CopyableDay {
  var dayNumber: Int { get }
  /// Stable identifiers of the POIs in this day. Drives the normalized `pois`.
  var poiIDs: [String] { get }
  var pois: [CopyablePoi] { get }
}

extension CopyableDay {
  var pois: [CopyablePoi] { poiIDs.map { CopyablePoi(id: $0) } }
}

/// The day-level option a copy action receives: full copy (`nil`) or the
/// 1-based day numbers selected for a partial copy.
typealias CopySelection = [Int]?

/// Abstraction over the three copyable sources so a single generic
/// `CopyItinerarySheet` can render the shared form, day selection, preview,
/// counts, and copy action. Per-source differences (editable title, extra
/// basic-info rows, attribution, navigation strings, alert wording, and the
/// local-vs-API copy backend) are expressed as protocol requirements so the
/// three flows behave exactly as before.
///
/// `days` is provided as a protocol-extension default derived from `rawDays`,
/// which lets sources that already own a (possibly optional) stored `days`
/// property conform without an invalid redeclaration.
///
/// The protocol itself is nonisolated so the read-only count/UI accessors are
/// usable from anywhere (including synchronous test autoclosures); only
/// `performCopy` is `@MainActor` because it touches the MainActor-isolated
/// `ItineraryStore`.
protocol CopyableSource {
  associatedtype Day: CopyableDay

  /// Raw days for this source; `nil`/empty when there is no day breakdown.
  var rawDays: [Day]? { get }

  /// Normalized, non-optional day list used by the shared UI.
  var days: [Day] { get }

  /// Number of days available to copy.
  var dayCount: Int { get }

  /// Total number of POIs across all days.
  var poiCount: Int { get }

  /// Title shown in the preview and used as the default copy name.
  var title: String { get }

  // MARK: Per-source UI configuration

  /// Navigation bar title for the sheet.
  var navigationTitle: String { get }

  /// Whether the user can edit the new itinerary's name (TextField shown).
  var allowsTitleEditing: Bool { get }

  /// Default value pre-filled into the title field when editing is allowed.
  var defaultEditableTitle: String { get }

  /// Placeholder text for the title field when editing is allowed.
  var titleFieldPlaceholder: String { get }

  /// Header for the basic info section.
  var basicInfoHeader: String { get }

  /// Label for the "keep browsing / continue" success alert button.
  var continueButtonTitle: String { get }

  /// Body text of the success alert.
  var successMessage: String { get }

  /// Whether copy failures should surface an error alert (API-backed sources).
  var reportsCopyErrors: Bool { get }

  /// Extra rows rendered at the top of the basic info section (author, city…).
  @ViewBuilder var basicInfoExtraContent: AnyView { get }

  /// Optional attribution section rendered after the preview (API sources).
  @ViewBuilder var attributionSection: AnyView { get }

  // MARK: Copy action

  /// Perform the copy. `selection` is `nil` for a full copy or the sorted set
  /// of 1-based day numbers for a partial copy. `newTitle` is `nil` when the
  /// source does not allow title editing or the field was left blank.
  @MainActor
  func performCopy(
    selection: CopySelection,
    newStartDate: Date,
    newTitle: String?
  ) async throws -> SavedItinerary
}

extension CopyableSource {
  var days: [Day] { rawDays ?? [] }
  var dayCount: Int { days.count }
  var poiCount: Int { days.reduce(0) { $0 + $1.pois.count } }

  // Defaults so sources only override what differs.
  var allowsTitleEditing: Bool { false }
  var defaultEditableTitle: String { title }
  var titleFieldPlaceholder: String { "create_trip.name_placeholder".localized }
  var continueButtonTitle: String { "itinerary.continue_browsing".localized }
  var successMessage: String { "copyitinerary.saved_message".localized }
  var reportsCopyErrors: Bool { false }
  var basicInfoExtraContent: AnyView { AnyView(EmptyView()) }
  var attributionSection: AnyView { AnyView(EmptyView()) }
}

// MARK: - Day Conformances

extension AiDay: CopyableDay {
  var poiIDs: [String] { pois.map(\.id) }
}

// MARK: - Source Conformances

extension SavedItinerary: CopyableSource {
  var rawDays: [AiDay]? { days }

  var navigationTitle: String { "itinerary.copy".localized }
  var allowsTitleEditing: Bool { true }
  var defaultEditableTitle: String { "copyitinerary.default_copy_title".localized(title) }
  var titleFieldPlaceholder: String { "create_trip.name_placeholder".localized }
  var basicInfoHeader: String { "create_trip.section.basic".localized }
  var continueButtonTitle: String { "copyitinerary.continue".localized }
  var successMessage: String { "copyitinerary.copied_message".localized }

  @MainActor
  func performCopy(
    selection: CopySelection,
    newStartDate: Date,
    newTitle: String?
  ) async throws -> SavedItinerary {
    let store = ItineraryStore.shared
    if let selectedDays = selection, !selectedDays.isEmpty {
      return store.copyItineraryPartial(
        self,
        selectedDays: selectedDays,
        newStartDate: newStartDate,
        newTitle: newTitle
      )
    }
    return store.copyItinerary(self, newStartDate: newStartDate)
  }
}

// MARK: - Generic Copy Itinerary Sheet

/// Sheet for copying any `CopyableSource` with options for date selection and
/// partial copy.
struct CopyItinerarySheet<Source: CopyableSource>: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(AppState.self) private var appState

  let source: Source
  let onCopyComplete: (SavedItinerary) -> Void

  @State private var newStartDate = Date()
  @State private var newTitle: String = ""
  @State private var isPartialCopy = false
  @State private var selectedDays: Set<Int> = []
  @State private var isCopying = false
  @State private var showSuccess = false
  @State private var errorMessage: String?
  @State private var showError = false

  private var days: [Source.Day] { source.days }

  var body: some View {
    NavigationStack {
      Form {
        // MARK: - Basic Info Section
        Section {
          source.basicInfoExtraContent

          if source.allowsTitleEditing {
            TextField(source.titleFieldPlaceholder, text: $newTitle)
              .onAppear {
                newTitle = source.defaultEditableTitle
              }
          }

          DatePicker(
            "itinerary.start_date".localized,
            selection: $newStartDate,
            displayedComponents: .date
          )
        } header: {
          Text(source.basicInfoHeader)
        }

        // MARK: - Copy Mode Section
        if !days.isEmpty {
          Section {
            Toggle("copyitinerary.copy_partial_toggle".localized, isOn: $isPartialCopy.animation())

            if isPartialCopy {
              daySelectionView
            }
          } header: {
            Text("copyitinerary.copy_options".localized)
          } footer: {
            if isPartialCopy {
              Text("copyitinerary.copy_partial_footer".localized)
            } else {
              Text("copyitinerary.copy_all_footer".localized(days.count))
            }
          }
        }

        // MARK: - Preview Section
        Section {
          copyPreviewView
        } header: {
          Text("copyitinerary.preview".localized)
        }

        // MARK: - Per-source Attribution Section
        source.attributionSection
      }
      .sunpebbleCanvas()
      .navigationTitle(source.navigationTitle)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("common.cancel".localized) {
            dismiss()
          }
          .disabled(isCopying)
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            performCopy()
          } label: {
            if isCopying {
              ProgressView()
            } else {
              Text("common.copy".localized)
                .fontWeight(.semibold)
            }
          }
          .disabled(isCopying || (isPartialCopy && selectedDays.isEmpty))
        }
      }
      .alert("copyitinerary.success_title".localized, isPresented: $showSuccess) {
        Button("itinerary.view_itinerary".localized) {
          appState.selectedTab = .itinerary
          dismiss()
        }
        Button(source.continueButtonTitle, role: .cancel) {
          dismiss()
        }
      } message: {
        Text(source.successMessage)
      }
      .alert("copyitinerary.error_title".localized, isPresented: $showError) {
        Button("common.ok".localized, role: .cancel) {}
      } message: {
        Text(errorMessage ?? "copyitinerary.error_unknown".localized)
      }
    }
  }

  // MARK: - Day Selection View

  private var daySelectionView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text("copyitinerary.select_days".localized)
          .font(.subheadline)
          .foregroundStyle(.secondary)

        Spacer()

        Button(selectedDays.count == days.count ? "copyitinerary.deselect_all".localized : "copyitinerary.select_all".localized) {
          if selectedDays.count == days.count {
            selectedDays.removeAll()
          } else {
            selectedDays = Set(days.map(\.dayNumber))
          }
        }
        .font(.caption)
      }

      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 70))],
        spacing: DesignTokens.Spacing.sm
      ) {
        ForEach(days, id: \.dayNumber) { day in
          DaySelectionChip(
            dayNumber: day.dayNumber,
            poiCount: day.pois.count,
            isSelected: selectedDays.contains(day.dayNumber)
          ) {
            if selectedDays.contains(day.dayNumber) {
              selectedDays.remove(day.dayNumber)
            } else {
              selectedDays.insert(day.dayNumber)
            }
          }
        }
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Copy Preview View

  private var copyPreviewView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "doc.on.doc.fill")
          .foregroundStyle(DesignTokens.Colors.accent)
        Text(previewTitle)
          .font(.headline)
          .lineLimit(1)
      }

      HStack(spacing: DesignTokens.Spacing.md) {
        Label {
          Text(formattedDate(newStartDate))
        } icon: {
          Image(systemName: "calendar")
            .foregroundStyle(.orange)
        }

        Label {
          Text("copyitinerary.days_count".localized(daysToBecopied))
        } icon: {
          Image(systemName: "clock")
            .foregroundStyle(.green)
        }

        Label {
          Text("copyitinerary.pois_count".localized(poisToBeCopied))
        } icon: {
          Image(systemName: "mappin")
            .foregroundStyle(.red)
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Computed Properties

  /// Preview title mirrors each source's original behavior: editable sources
  /// fall back to their default name when the field is blank; non-editable
  /// sources always show the source title.
  private var previewTitle: String {
    guard source.allowsTitleEditing else { return source.title }
    return newTitle.isEmpty ? source.defaultEditableTitle : newTitle
  }

  private var daysToBecopied: Int {
    if isPartialCopy {
      return selectedDays.count
    }
    return days.count
  }

  private var poisToBeCopied: Int {
    if isPartialCopy {
      return days
        .filter { selectedDays.contains($0.dayNumber) }
        .reduce(0) { $0 + $1.pois.count }
    }
    return days.reduce(0) { $0 + $1.pois.count }
  }

  // MARK: - Helper Methods

  private func formattedDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "copyitinerary.date_format".localized
    return formatter.string(from: date)
  }

  private func performCopy() {
    isCopying = true

    Task { @MainActor in
      let selection: CopySelection = isPartialCopy && !selectedDays.isEmpty
        ? Array(selectedDays).sorted()
        : nil
      let resolvedTitle = source.allowsTitleEditing && !newTitle.isEmpty ? newTitle : nil

      do {
        let newItinerary = try await source.performCopy(
          selection: selection,
          newStartDate: newStartDate,
          newTitle: resolvedTitle
        )

        isCopying = false
        showSuccess = true
        onCopyComplete(newItinerary)
      } catch {
        isCopying = false
        if source.reportsCopyErrors {
          errorMessage = error.localizedDescription
          showError = true
        }
      }
    }
  }
}

// MARK: - Thin Specializations (preserve original call sites)

extension CopyItinerarySheet where Source == SavedItinerary {
  /// Copy a locally saved itinerary.
  init(itinerary: SavedItinerary, onCopyComplete: @escaping (SavedItinerary) -> Void) {
    self.init(source: itinerary, onCopyComplete: onCopyComplete)
  }
}

// MARK: - Day Selection Chip

struct DaySelectionChip: View {
  let dayNumber: Int
  let poiCount: Int
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(spacing: 2) {
        Text("Day \(dayNumber)")
          .font(.caption)
          .fontWeight(.medium)

        Text("copyitinerary.chip_pois".localized(poiCount))
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .frame(minWidth: 60)
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .glassEffect(
        .regular.tint(isSelected ? .accentColor : .clear).interactive(),
        in: .capsule
      )
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Copy Stats View

/// View to display copy statistics for an itinerary
struct CopyStatsView: View {
  let itineraryId: String

  @State private var stats: ItineraryCopyStats?
  @State private var isLoading = true
  @State private var error: Error?

  var body: some View {
    Group {
      if isLoading {
        HStack(spacing: DesignTokens.Spacing.xs) {
          ProgressView()
            .scaleEffect(0.8)
          Text("common.loading".localized)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      } else if let stats = stats {
        HStack(spacing: DesignTokens.Spacing.sm) {
          Image(systemName: "doc.on.doc")
            .foregroundStyle(DesignTokens.Colors.accent)

          VStack(alignment: .leading, spacing: 2) {
            Text("copyitinerary.copy_count".localized(stats.copyCount))
              .font(.caption)
              .fontWeight(.medium)

            if !stats.recentCopies.isEmpty {
              Text("copyitinerary.recent_copies".localized(stats.recentCopies.count))
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
          }
        }
        .padding(DesignTokens.Spacing.sm)
        .background(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(DesignTokens.Colors.accent.opacity(0.1))
        )
      } else if error != nil {
        EmptyView()
      }
    }
    .task {
      await loadStats()
    }
  }

  private func loadStats() async {
    do {
      stats = try await ItineraryStore.shared.getCopyStats(itineraryId: itineraryId)
      isLoading = false
    } catch {
      self.error = error
      isLoading = false
    }
  }
}

// MARK: - Original Author Badge

/// Badge to display original author info for copied itineraries
struct OriginalAuthorBadge: View {
  let author: SavedItineraryOriginalAuthor

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      if let avatarUrl = author.avatarUrl, let url = URL(string: avatarUrl) {
        CachedAsyncImage(url: url) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Circle()
            .fill(Sunpebble.ink.opacity(0.06))
        }
        .frame(width: 20, height: 20)
        .clipShape(Circle())
      } else {
        Image(systemName: "person.circle.fill")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      if let displayName = author.displayName {
        Text("copyitinerary.from_author".localized(displayName))
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.horizontal, DesignTokens.Spacing.sm)
    .padding(.vertical, DesignTokens.Spacing.xs)
    .background(
      Capsule()
        .fill(Sunpebble.ink.opacity(0.06))
    )
  }
}

// MARK: - Previews

#Preview("Copy Itinerary") {
  CopyItinerarySheet(
    itinerary: SavedItinerary(
      title: "东京5日游",
      destination: "东京",
      daysCount: 5
    )
  ) { _ in }
    .environment(AppState())
}
