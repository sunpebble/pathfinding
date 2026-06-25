import MapKit
import SwiftUI

// MARK: - Itinerary Detail View

struct ItineraryDetailView: View {
  let itinerary: SavedItinerary

  // MARK: - Navigation Destinations

  enum Destination: Hashable {
    case analysis
    case budget
  }

  /// Returns the destinations reachable from this itinerary.
  /// `.analysis` requires a backend id; `.budget` is always available.
  var availableDestinations: [Destination] {
    var result: [Destination] = []
    if itinerary.apiItineraryId != nil { result.append(.analysis) }
    result.append(.budget)
    return result
  }

  @State private var localDays: [AiDay] = []
  @State private var localTitle: String = ""
  @State private var selectedDayIndex: Int? = nil
  @State private var cameraPosition: MapCameraPosition = .automatic
  @State private var selectedPoiId: String? = nil
  @State private var showCopySheet = false
  @State private var activeDestination: Destination?

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
        MapHeader(
          annotations: annotations,
          allPois: allPois,
          cameraPosition: $cameraPosition,
          selectedPoiId: $selectedPoiId
        )

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
            TimelineSection(
              localDays: $localDays,
              selectedDayIndex: $selectedDayIndex,
              selectedPoiId: $selectedPoiId,
              cameraPosition: $cameraPosition
            )
          }

          // Tips
          if let tips = itinerary.aiTips, !tips.isEmpty {
            TipsCard(tips: tips)
          }
        }
        .padding(.vertical)
      }
    }
    .scrollEdgeEffectStyle(.soft, for: .top)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          showCopySheet = true
        } label: {
          Image(systemName: "doc.on.doc")
        }
        .accessibilityLabel("复制行程")
      }

      ToolbarSpacer(.fixed, placement: .topBarTrailing)

      ToolbarItem(placement: .topBarTrailing) {
        Menu {
          if availableDestinations.contains(.analysis) {
            Button {
              activeDestination = .analysis
            } label: {
              Label("行程分析", systemImage: "chart.bar.xaxis")
            }
          }
          if availableDestinations.contains(.budget) {
            Button {
              activeDestination = .budget
            } label: {
              Label("预算管理", systemImage: "creditcard")
            }
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
        .accessibilityLabel("更多功能")
      }
    }
    .navigationDestination(item: $activeDestination) { destination in
      switch destination {
      case .analysis:
        ItineraryAnalysisView(
          itineraryId: itinerary.apiItineraryId ?? "",
          itineraryTitle: itinerary.title
        )
      case .budget:
        BudgetOverviewView(
          itineraryId: itinerary.id.uuidString,
          itineraryTitle: itinerary.title
        )
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
      logMemoryUsage(context: "ItineraryDetailView.onAppear", poiCount: allPois.count)
    }
    .onDisappear {
      saveChanges()
      logMemoryUsage(context: "ItineraryDetailView.onDisappear", poiCount: allPois.count)
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
      DayEditSheet(localDays: $localDays, selectedDayIndex: $selectedDayIndex)
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

// MARK: - Preview

#Preview {
  let sampleItinerary = SavedItinerary(
    title: "示例行程",
    destination: "北京",
    daysCount: 2
  )

  return NavigationStack {
    ItineraryDetailView(itinerary: sampleItinerary)
  }
  .environment(AppState())
}
