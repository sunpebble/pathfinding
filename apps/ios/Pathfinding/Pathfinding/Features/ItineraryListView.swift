import MapKit
import SwiftUI

struct ItineraryListView: View {
  private var store: ItineraryStore { ItineraryStore.shared }
  @State private var showCreateSheet = false
  @State private var showVoiceItinerary = false
  @State private var showAIPlanner = false

  var body: some View {
    NavigationStack {
      Group {
        if store.itineraries.isEmpty {
          emptyView
        } else {
          itineraryList
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(DesignTokens.Colors.background)
      .navigationTitle("itinerary.title".localized)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) { itineraryActionsMenu }
        ToolbarSpacer(.fixed, placement: .topBarTrailing)
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showCreateSheet = true
          } label: {
            Image(systemName: "plus")
          }
          .accessibilityLabel("itinerary.create.accessibility".localized)
          .accessibilityHint("itinerary.create.hint".localized)
        }
      }
      .sheet(isPresented: $showCreateSheet) {
        CreateItinerarySheet { itinerary in
          store.add(itinerary)
        }
      }
      .fullScreenCover(isPresented: $showVoiceItinerary) {
        VoiceItineraryView()
      }
      .sheet(isPresented: $showAIPlanner) {
        AIPlannerSheet { itinerary in
          store.add(itinerary)
        }
      }
      .navigationDestination(for: SavedItinerary.self) { itinerary in
        ItineraryDetailView(itinerary: itinerary)
      }
      .onAppear {
        logMemoryUsage(context: "ItineraryListView.onAppear")
      }
      .onDisappear {
        logMemoryUsage(context: "ItineraryListView.onDisappear")
      }
    }
  }

  // MARK: - Toolbar Actions Menu

  private var itineraryActionsMenu: some View {
    Menu {
      Button {
        showAIPlanner = true
      } label: {
        Label("itinerary.menu.ai_planner".localized, systemImage: "sparkles")
      }

      Button {
        showVoiceItinerary = true
      } label: {
        Label("itinerary.menu.voice_input".localized, systemImage: "mic.fill")
      }

      Button {
        showCreateSheet = true
      } label: {
        Label("itinerary.create".localized, systemImage: "plus")
      }
    } label: {
      Image(systemName: "ellipsis.circle")
        .symbolRenderingMode(.hierarchical)
    }
    .accessibilityLabel("itinerary.menu.more".localized)
    .accessibilityHint("itinerary.menu.more_hint".localized)
  }

  // MARK: - Memory Monitoring

  private func logMemoryUsage(context: String) {
    #if DEBUG
    if let usage = MemoryManager.shared.currentMemoryUsage() {
      let formatted = MemoryManager.shared.formatBytes(usage.used)
      NSLog("[\(context)] Memory: \(formatted) (\(String(format: "%.1f", usage.usagePercentage))%)")

      if MemoryManager.shared.isMemoryPressureHigh() {
        NSLog("[\(context)] ⚠️ High memory pressure detected!")
      }
    }
    #endif
  }

  // MARK: - Empty View

  private var emptyView: some View {
    ContentUnavailableView {
      Label("itinerary.empty".localized, systemImage: "map")
    } description: {
      Text("itinerary.empty_description".localized)
    } actions: {
      Button("itinerary.empty.ai".localized) { showAIPlanner = true }
        .buttonStyle(.sunpebblePrimary)
    }
  }

  // MARK: - Itinerary List

  private var itineraryList: some View {
    List {
      ForEach(store.itineraries) { itinerary in
        NavigationLink(value: itinerary) {
          ItineraryCard(itinerary: itinerary)
        }
        .buttonStyle(.plain)
        .listRowInsets(EdgeInsets(
          top: DesignTokens.Spacing.xs,
          leading: DesignTokens.Spacing.md,
          bottom: DesignTokens.Spacing.xs,
          trailing: DesignTokens.Spacing.md
        ))
        .listRowSeparator(.hidden)
        .listRowBackground(Color.clear)
      }
      .onDelete { offsets in
        store.delete(at: offsets)
      }
    }
    .listStyle(.insetGrouped)
    .scrollContentBackground(.hidden)
  }
}

// MARK: - Itinerary Card

struct ItineraryCard: View {
  let itinerary: SavedItinerary

  // MARK: - Computed Properties (Cached)

  /// Total number of POIs across all days - computed once
  private var totalPOICount: Int {
    itinerary.days.reduce(0) { $0 + $1.pois.count }
  }

  /// Number of days in the itinerary
  private var daysCount: Int {
    itinerary.days.count
  }

  // MARK: - Body

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        // Cover image or gradient
        coverImageView

        // Itinerary info
        itineraryInfoView

        Spacer()
        // already draws the system disclosure indicator (was doubled up).
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .cardSurface()
  }

  // MARK: - Subviews

  @ViewBuilder
  private var coverImageView: some View {
    if let coverUrl = itinerary.coverImage, let url = URL(string: coverUrl) {
      CachedAsyncImage(url: url) { image in
        image
          .resizable()
          .aspectRatio(contentMode: .fill)
      } placeholder: {
        ZStack {
          RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous)
            .fill(DesignTokens.Colors.backgroundSecondary)
          ProgressView()
        }
      }
      .frame(width: 60, height: 60)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous))
    } else {
      // Brand mark: ink rounded square + sun map icon (aligns to design trip-mark)
      ZStack {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md, style: .continuous)
          .fill(Sunpebble.ink)
          .frame(width: 60, height: 60)

        Image(systemName: "map.fill")
          .font(.title2)
          .foregroundStyle(DesignTokens.Colors.accent)
      }
    }
  }

  private var itineraryInfoView: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: DesignTokens.Spacing.xs) {
        Text(itinerary.title)
          .font(.system(.headline, design: .serif))
          .bold()
          .foregroundStyle(DesignTokens.Colors.textPrimary)
          .lineLimit(1)

        // Copied badge
        if itinerary.isCopied {
          Image(systemName: "doc.on.doc.fill")
            .font(.caption2)
            .foregroundStyle(DesignTokens.Colors.accent)
        }
      }

      if let dest = itinerary.destination {
        Text(dest)
          .font(.subheadline)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
      }

      // Original author attribution
      if let author = itinerary.originalAuthor?.displayName {
        Text("itinerary.from_author".localized(author))
          .font(.caption2)
          .foregroundStyle(DesignTokens.Colors.textSecondary)
      }

      HStack(spacing: DesignTokens.Spacing.sm) {
        Label("itinerary.days".localized(daysCount), systemImage: "calendar")
        Label("itinerary.poi_count".localized(totalPOICount), systemImage: "mappin")
      }
      .font(.caption)
      .foregroundStyle(DesignTokens.Colors.textSecondary)
    }
  }
}

// MARK: - Create Itinerary Sheet

struct CreateItinerarySheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var destination = ""
  @State private var startDate = Date()
  @State private var endDate = Date().addingTimeInterval(3 * 24 * 60 * 60)
  @State private var hasAttemptedSubmit = false

  let onCreate: (SavedItinerary) -> Void

  private let titleMaxLength = 30

  private var isDateRangeValid: Bool {
    endDate >= startDate
  }

  private var isTitleEmpty: Bool {
    title.trimmingCharacters(in: .whitespaces).isEmpty
  }

  private var isFormValid: Bool {
    !isTitleEmpty && isDateRangeValid
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("create_trip.section.basic".localized) {
          TextField("create_trip.name_placeholder".localized, text: $title)
            .onChange(of: title) { _, newValue in
              if newValue.count > titleMaxLength {
                title = String(newValue.prefix(titleMaxLength))
              }
            }
          HStack {
            if hasAttemptedSubmit && isTitleEmpty {
              Text("create_trip.name_required".localized)
                .font(.caption)
                .foregroundStyle(.red)
            }
            Spacer()
            Text("\(title.count)/\(titleMaxLength)")
              .font(.caption)
              .foregroundStyle(title.count > titleMaxLength * 9 / 10 ? (title.count >= titleMaxLength ? .red : .orange) : .secondary)
          }
          TextField("create_trip.destination_placeholder".localized, text: $destination)
        }

        Section("create_trip.section.schedule".localized) {
          DatePicker("itinerary.start_date".localized, selection: $startDate, displayedComponents: .date)
          DatePicker("itinerary.end_date".localized, selection: $endDate, displayedComponents: .date)
          if !isDateRangeValid {
            Text("create_trip.date_error".localized)
              .font(.caption)
              .foregroundStyle(.red)
          }
        }
      }
      .sunpebbleCanvas()
      .navigationTitle("create_trip.title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("common.cancel".localized) { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.create".localized) {
            hasAttemptedSubmit = true
            guard isFormValid else { return }
            let daysInfo = Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 1
            let itinerary = SavedItinerary(
              title: title.isEmpty ? "create_trip.default_title".localized : title,
              destination: destination.isEmpty ? nil : destination,
              daysCount: max(1, daysInfo + 1)
            )
            onCreate(itinerary)
            dismiss()
          }
          .fontWeight(.semibold)
          .disabled(!isFormValid)
        }
      }
    }
  }
}

#Preview { ItineraryListView() }
