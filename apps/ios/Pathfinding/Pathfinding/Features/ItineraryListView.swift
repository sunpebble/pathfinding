import MapKit
import SwiftUI

struct ItineraryListView: View {
  private var store: ItineraryStore { ItineraryStore.shared }
  @State private var showCreateSheet = false
  @State private var showVoiceItinerary = false
  @State private var showDiscovery = false
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
      .sheet(isPresented: $showDiscovery) {
        PublicItineraryDiscoveryView()
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
        Label("AI 规划", systemImage: "sparkles")
      }

      Button {
        showVoiceItinerary = true
      } label: {
        Label("语音输入", systemImage: "mic.fill")
      }

      Button {
        showCreateSheet = true
      } label: {
        Label("itinerary.create".localized, systemImage: "plus")
      }

      Button {
        showDiscovery = true
      } label: {
        Label("发现公共行程", systemImage: "globe")
      }
    } label: {
      Image(systemName: "ellipsis.circle")
        .symbolRenderingMode(.hierarchical)
    }
    .accessibilityLabel("更多操作")
    .accessibilityHint("打开菜单，包含 AI 规划、语音输入、创建行程和发现公共行程")
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
        .buttonStyle(.glassProminent)
      Button("itinerary.empty.browse".localized) { showDiscovery = true }
        .buttonStyle(.glass)
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

  /// Gradient colors for cover placeholder
  private var gradientColors: [Color] {
    [.indigo, .purple]
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

        // Chevron indicator
        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(DesignTokens.Spacing.sm)
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
          RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
            .fill(Color.gray.opacity(0.2))
          ProgressView()
        }
      }
      .frame(width: 60, height: 60)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
    } else {
      ZStack {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
          .fill(
            LinearGradient(
              colors: gradientColors,
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 60, height: 60)

        Image(systemName: "map.fill")
          .font(.title2)
          .foregroundStyle(.white.opacity(0.9))
      }
    }
  }

  private var itineraryInfoView: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(spacing: DesignTokens.Spacing.xs) {
        Text(itinerary.title)
          .font(.headline)
          .lineLimit(1)

        // Copied badge
        if itinerary.isCopied {
          Image(systemName: "doc.on.doc.fill")
            .font(.caption2)
            .foregroundStyle(.blue.opacity(0.8))
        }
      }

      if let dest = itinerary.destination {
        Text(dest)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      // Original author attribution
      if let author = itinerary.originalAuthor?.displayName {
        Text("来自 \(author)")
          .font(.caption2)
          .foregroundStyle(.blue.opacity(0.7))
      }

      HStack(spacing: DesignTokens.Spacing.sm) {
        Label("\(daysCount)天", systemImage: "calendar")
        Label("\(totalPOICount)景点", systemImage: "mappin")
      }
      .font(.caption)
      .foregroundStyle(.tertiary)
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
        Section("基本信息") {
          TextField("行程名称", text: $title)
            .onChange(of: title) { _, newValue in
              if newValue.count > titleMaxLength {
                title = String(newValue.prefix(titleMaxLength))
              }
            }
          HStack {
            if hasAttemptedSubmit && isTitleEmpty {
              Text("请输入行程名称")
                .font(.caption)
                .foregroundStyle(.red)
            }
            Spacer()
            Text("\(title.count)/\(titleMaxLength)")
              .font(.caption)
              .foregroundStyle(title.count > titleMaxLength * 9 / 10 ? (title.count >= titleMaxLength ? .red : .orange) : .secondary)
          }
          TextField("目的地", text: $destination)
        }

        Section("时间安排") {
          DatePicker("开始日期", selection: $startDate, displayedComponents: .date)
          DatePicker("结束日期", selection: $endDate, displayedComponents: .date)
          if !isDateRangeValid {
            Text("结束日期不能早于开始日期")
              .font(.caption)
              .foregroundStyle(.red)
          }
        }
      }
      .navigationTitle("新建行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("创建") {
            hasAttemptedSubmit = true
            guard isFormValid else { return }
            let daysInfo = Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 1
            let itinerary = SavedItinerary(
              title: title.isEmpty ? "我的行程" : title,
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
