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
      ZStack {
        // Explorer background
        ExplorerPageBackground(style: .list, accentColor: .blue)

        Group {
          if store.itineraries.isEmpty {
            emptyView
          } else {
            itineraryList
          }
        }
      }
      .navigationTitle("我的行程")
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
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
              showDiscovery = true
            } label: {
              Label("发现公共行程", systemImage: "globe")
            }
          } label: {
            Image(systemName: "ellipsis.circle")
              .symbolRenderingMode(.hierarchical)
          }
          .accessibilityLabel("更多操作")
          .accessibilityHint("打开菜单，包含 AI 规划、语音输入和发现公共行程")
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showCreateSheet = true
          } label: {
            Image(systemName: "plus.circle.fill")
              .symbolRenderingMode(.hierarchical)
          }
          .accessibilityLabel("新建行程")
          .accessibilityHint("创建一个新的旅行行程")
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
        SavedItineraryDetailView(itinerary: itinerary)
      }
      .onAppear {
        logMemoryUsage(context: "ItineraryListView.onAppear")
      }
      .onDisappear {
        logMemoryUsage(context: "ItineraryListView.onDisappear")
      }
    }
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
      Label("暂无行程", systemImage: "map")
    } description: {
      Text("从攻略中导入行程，或创建新行程")
    } actions: {
      VStack(spacing: DesignTokens.Spacing.md) {
        // AI generation button - most prominent
        Button {
          showAIPlanner = true
        } label: {
          Label("AI 生成行程", systemImage: "sparkles")
        }
        .buttonStyle(.primary)

        // Voice creation button
        Button {
          showVoiceItinerary = true
        } label: {
          Label("语音创建", systemImage: "mic.fill")
        }
        .buttonStyle(.secondary)

        HStack(spacing: DesignTokens.Spacing.md) {
          NavigationLink {
            DiscoverView()
          } label: {
            Label("浏览攻略", systemImage: "book")
          }
          .buttonStyle(.secondary)

          Button {
            showCreateSheet = true
          } label: {
            Label("新建行程", systemImage: "plus")
          }
          .buttonStyle(.secondary)
        }

        // Discover public itineraries
        Button {
          showDiscovery = true
        } label: {
          Label("发现公开行程", systemImage: "globe")
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
      }
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
    .listStyle(.plain)
    .background(Color(.systemGroupedBackground))
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
    .subtleCardStyle(radius: DesignTokens.Radius.md)
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

// MARK: - Saved Itinerary Detail View

struct SavedItineraryDetailView: View {
  let itinerary: SavedItinerary
  @State private var localDays: [AiDay] = []
  @State private var localTitle: String = ""
  @State private var selectedDayIndex: Int? = nil
  @State private var cameraPosition: MapCameraPosition = .automatic
  @State private var selectedPoiId: String? = nil
  @State private var showCopySheet = false

  @Environment(AppState.self) private var appState
  private var store: ItineraryStore { ItineraryStore.shared }
  
  var allPois: [AiPoi] {
    let days = localDays.isEmpty ? itinerary.days : localDays
    return days.flatMap { $0.pois }
  }
  
  var annotations: [SavedPoiAnnotation] {
    allPois.compactMap { poi in
      guard let lat = poi.latitude, let lng = poi.longitude, lat != 0 && lng != 0 else { return nil }
      return SavedPoiAnnotation(poi: poi, coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng))
    }
  }
  
  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        // Map Header - Optimized for large itineraries
        OptimizedMapView(
          annotations: annotations,
          cameraPosition: $cameraPosition,
          selectedPoiId: selectedPoiId
        ) { poiId in
          // Handle annotation tap
          withAnimation {
            selectedPoiId = poiId
            if let poi = allPois.first(where: { $0.id == poiId }),
               let lat = poi.latitude, let lng = poi.longitude, lat != 0 && lng != 0 {
              cameraPosition = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
              ))
            }
          }
        }
        .frame(height: 350)
        .clipShape(RoundedRectangle(cornerRadius: 0))
        
        VStack(alignment: .leading, spacing: 16) {
          // Editable Title
          TextField("行程标题", text: $localTitle, axis: .vertical)
            .font(.title2)
            .fontWeight(.bold)
            .lineLimit(nil)
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemBackground))
            .overlay(
              RoundedRectangle(cornerRadius: 8)
                .stroke(Color.clear, lineWidth: 0)
            )
            .submitLabel(.done)
            .onSubmit {
              saveChanges()
            }
            .onChange(of: localTitle) { _, _ in
              saveChanges()
            }

          // Original Author Badge (for copied itineraries)
          if let originalAuthor = itinerary.originalAuthor {
            HStack {
              OriginalAuthorBadge(author: originalAuthor)
              Spacer()
            }
            .padding(.horizontal)
          }

          // Copy Stats (for API-synced itineraries)
          if let apiId = itinerary.apiItineraryId {
            HStack {
              CopyStatsView(itineraryId: apiId)
              Spacer()
            }
            .padding(.horizontal)
          }

          // Timeline
          if !localDays.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
              Label("行程安排", systemImage: "map")
                .font(.headline)
                .padding(.horizontal)

              LazyVStack(spacing: 12) {
                ForEach(Array(localDays.enumerated()), id: \.element.id) { index, day in
                  VStack(alignment: .leading, spacing: 16) {
                    // Day Header (Editable)
                    Button {
                      selectedDayIndex = index
                    } label: {
                      HStack {
                        Text("第 \(day.dayNumber) 天")
                          .font(.headline)
                          .foregroundStyle(.primary)
                        if let theme = day.theme {
                          Text(theme)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "pencil.circle")
                          .font(.title3)
                          .foregroundStyle(.blue)
                      }
                    }
                    .buttonStyle(.plain)

                    // Timeline POIs
                    LazyVStack(alignment: .leading, spacing: 0) {
                      ForEach(Array(day.pois.enumerated()), id: \.element.id) { poiIndex, poi in
                        let isSelected = poi.id == selectedPoiId
                        HStack(alignment: .top, spacing: 12) {
                          // Timeline Indicator
                          VStack(spacing: 0) {
                            Rectangle()
                              .fill(poiIndex == 0 ? Color.clear : Color.gray.opacity(0.3))
                              .frame(width: 2, height: 6)
                            Circle()
                              .fill(isSelected ? Color.red : Color.blue)
                              .frame(width: isSelected ? 12 : 8, height: isSelected ? 12 : 8)
                              .animation(.spring, value: isSelected)
                            Rectangle()
                              .fill(poiIndex == day.pois.count - 1 ? Color.clear : Color.gray.opacity(0.3))
                              .frame(width: 2)
                          }
                          .frame(width: 16)

                          // Content
                          VStack(alignment: .leading, spacing: 4) {
                            HStack(alignment: .firstTextBaseline) {
                              if let time = poi.time {
                                Text(time).font(.caption).monospacedDigit().foregroundStyle(.blue)
                              }
                              Text(poi.name)
                                .font(.subheadline)
                                .fontWeight(isSelected ? .bold : .medium)
                                .foregroundStyle(isSelected ? .red : .primary)
                            }
                            if let desc = poi.description {
                              Text(desc).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            }
                          }
                          .padding(.bottom, 16)
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                          withAnimation {
                            selectedPoiId = poi.id
                            if let lat = poi.latitude, let lng = poi.longitude, lat != 0 && lng != 0 {
                              cameraPosition = .region(MKCoordinateRegion(
                                center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
                              ))
                            }
                          }
                        }
                        .accessibilityElement(children: .combine)
                        .accessibilityLabel("第 \(poiIndex + 1) 站，\(poi.name)")
                        .accessibilityValue(isSelected ? "已选中" : "")
                        .accessibilityHint("双击在地图上定位")
                      }
                    }
                    .padding(.leading, 4)
                  }
                  .padding()
                  .background(Color(.secondarySystemBackground).opacity(0.5))
                  .clipShape(RoundedRectangle(cornerRadius: 16))
                  .padding(.horizontal)
                }
              }
            }
          }
          
          // Tips
          if let tips = itinerary.aiTips, !tips.isEmpty {
             VStack(alignment: .leading, spacing: 8) {
               Label("旅行贴士", systemImage: "lightbulb").font(.headline)
               ForEach(tips, id: \.self) { tip in
                 HStack(alignment: .top) {
                   Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                   Text(tip)
                 }
                 .font(.subheadline)
               }
             }
             .padding()
             .background(.green.opacity(0.1))
             .clipShape(RoundedRectangle(cornerRadius: 12))
             .padding(.horizontal)
          }
        }
        .padding(.vertical)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .ignoresSafeArea(edges: .top)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        HStack(spacing: DesignTokens.Spacing.sm) {
          Button {
            showCopySheet = true
          } label: {
            Image(systemName: "doc.on.doc")
          }

          CalendarSyncToolbarButton(itinerary: itinerary)
        }
      }
    }
    .sheet(isPresented: $showCopySheet) {
      CopyItinerarySheet(itinerary: itinerary) { _ in
        // Copy completed - sheet handles navigation
      }
    }
    .onAppear {
      if localDays.isEmpty {
        localDays = itinerary.days
      }
      if localTitle.isEmpty {
        localTitle = itinerary.title
      }
      updateCamera()
      logMemoryUsage(context: "SavedItineraryDetailView.onAppear", poiCount: allPois.count)
    }
    .onDisappear {
      logMemoryUsage(context: "SavedItineraryDetailView.onDisappear", poiCount: allPois.count)
    }
    .onChange(of: localDays) { _, _ in
       // When days change (e.g. from edit), save immediately
       saveChanges()
       updateCamera()
    }
    // MARK: - Edit Sheet
    .sheet(isPresented: Binding(
      get: { selectedDayIndex != nil },
      set: { if !$0 { selectedDayIndex = nil } }
    ), onDismiss: {
       saveChanges() // Ensure saved on dismiss
    }) {
      if let index = selectedDayIndex, localDays.indices.contains(index) {
        NavigationStack {
          List {
            ForEach($localDays[index].pois) { $poi in
              NavigationLink {
                PoiEditView(poi: $poi)
              } label: {
                VStack(alignment: .leading, spacing: 4) {
                  HStack {
                    Text(poi.name).font(.headline)
                    if let type = poi.type {
                      Text(type).font(.caption).padding(.horizontal, 6).padding(.vertical, 2).background(
                        .blue.opacity(0.1)
                      ).clipShape(Capsule())
                    }
                  }
                  if let time = poi.time {
                    Text("⏰ \(time)").font(.caption).foregroundStyle(.blue)
                  }
                  if let desc = poi.description {
                    Text(desc).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                  }
                }
                .padding(.vertical, 4)
              }
            }
            .onMove { from, to in
              localDays[index].pois.move(fromOffsets: from, toOffset: to)
            }
            .onDelete { offsets in
              localDays[index].pois.remove(atOffsets: offsets)
            }
          }
          .navigationTitle("第 \(localDays[index].dayNumber) 天 - 编辑")
          .navigationBarTitleDisplayMode(.inline)
          .toolbar {
            ToolbarItem(placement: .topBarTrailing) { EditButton() }
            ToolbarItem(placement: .topBarLeading) { Button("完成") { selectedDayIndex = nil } }
          }
        }
        .presentationDetents([.medium, .large])
      } else {
        ContentUnavailableView("无数据", systemImage: "exclamationmark.triangle")
      }
    }
  }
  
  private func saveChanges() {
    var updated = itinerary
    updated.title = localTitle
    updated.days = localDays
    store.update(updated)
  }
  
  private func updateCamera() {
    let ValidAnnotations = annotations
    guard !ValidAnnotations.isEmpty else { return }

    let coords = ValidAnnotations.map(\.coordinate)
    let minLat = coords.map(\.latitude).min()!
    let maxLat = coords.map(\.latitude).max()!
    let minLng = coords.map(\.longitude).min()!
    let maxLng = coords.map(\.longitude).max()!

    let center = CLLocationCoordinate2D(
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2
    )

    let latDelta = max((maxLat - minLat) * 1.5, 0.01)
    let lngDelta = max((maxLng - minLng) * 1.5, 0.01)

    withAnimation {
      cameraPosition = .region(MKCoordinateRegion(
        center: center,
        span: MKCoordinateSpan(latitudeDelta: latDelta, longitudeDelta: lngDelta)
      ))
    }
  }

  // MARK: - Memory Monitoring

  private func logMemoryUsage(context: String, poiCount: Int) {
    #if DEBUG
    if let usage = MemoryManager.shared.currentMemoryUsage() {
      let formatted = MemoryManager.shared.formatBytes(usage.used)
      NSLog("[\(context)] Memory: \(formatted) (\(String(format: "%.1f", usage.usagePercentage))%) | POIs: \(poiCount)")

      if MemoryManager.shared.isMemoryPressureHigh() {
        NSLog("[\(context)] ⚠️ High memory pressure detected!")
      }
    }
    #endif
  }
}

struct SavedPoiAnnotation: Identifiable {
  let id = UUID()
  let poi: AiPoi
  let coordinate: CLLocationCoordinate2D
}

#Preview { ItineraryListView() }
