import MapKit
import SwiftUI

struct ItineraryListView: View {
  private var store: ItineraryStore { ItineraryStore.shared }
  @State private var editMode: EditMode = .inactive
  @State private var showCreateSheet = false
  
  var body: some View {
    NavigationStack {
      Group {
        if store.itineraries.isEmpty {
          emptyView
        } else {
          itineraryList
        }
      }
      .navigationTitle("我的行程")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showCreateSheet = true
          } label: {
            Image(systemName: "plus.circle.fill")
              .symbolRenderingMode(.hierarchical)
          }
        }
        if !store.itineraries.isEmpty {
          ToolbarItem(placement: .topBarLeading) {
            EditButton()
          }
        }
      }
      .sheet(isPresented: $showCreateSheet) {
        CreateItinerarySheet { itinerary in
          store.update(itinerary) // Use update (or add logic in store)
        }
      }
      .environment(\.editMode, $editMode)
      .onChange(of: store.itineraries.isEmpty) { _, isEmpty in
        if isEmpty {
          DispatchQueue.main.async {
            editMode = .inactive
          }
        }
      }
    }
  }
  
  // MARK: - Empty View
  
  private var emptyView: some View {
    ContentUnavailableView {
      Label("暂无行程", systemImage: "map")
    } description: {
      Text("从攻略中导入行程，或创建新行程")
    } actions: {
      HStack(spacing: DesignTokens.Spacing.md) {
        NavigationLink {
          BlogListView()
        } label: {
          Label("浏览攻略", systemImage: "book")
        }
        .buttonStyle(.secondary)
        
        Button {
          showCreateSheet = true
        } label: {
          Label("新建行程", systemImage: "plus")
        }
        .buttonStyle(.primary)
      }
    }
  }
  
  // MARK: - Itinerary List
  
  private var itineraryList: some View {
    List {
      ForEach(store.itineraries) { itinerary in
        ZStack {
          NavigationLink(destination: SavedItineraryDetailView(itinerary: itinerary)) {
            EmptyView()
          }.opacity(0)
          
          ItineraryCard(itinerary: itinerary)
        }
        .listRowSeparator(.hidden)
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets(
          top: DesignTokens.Spacing.xxs,
          leading: DesignTokens.Spacing.md,
          bottom: DesignTokens.Spacing.xxs,
          trailing: DesignTokens.Spacing.md
        ))
      }
      .onDelete { indexSet in
        store.delete(at: indexSet)
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(Color(.systemGroupedBackground))
  }
}

// MARK: - Itinerary Card

struct ItineraryCard: View {
  let itinerary: SavedItinerary
  
  var gradientColors: [Color] {
    [.indigo, .purple] // Default or random
  }
  
  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        // Cover image or gradient
        if let coverUrl = itinerary.coverImage, let url = URL(string: coverUrl) {
          AsyncImage(url: url) { image in
            image.resizable().aspectRatio(contentMode: .fill)
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
        
        VStack(alignment: .leading, spacing: 4) {
          Text(itinerary.title)
            .font(.headline)
            .lineLimit(1)
          
          if let dest = itinerary.destination {
             Text(dest)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
          
          HStack(spacing: DesignTokens.Spacing.sm) {
            Label("\(itinerary.days.count)天", systemImage: "calendar")
            let poiCount = itinerary.days.reduce(0) { $0 + $1.pois.count }
            Label("\(poiCount)景点", systemImage: "mappin")
          }
          .font(.caption)
          .foregroundStyle(.tertiary)
        }
        
        Spacer()
        
        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.md)
  }
}

// MARK: - Create Itinerary Sheet

struct CreateItinerarySheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var destination = ""
  @State private var startDate = Date()
  @State private var endDate = Date().addingTimeInterval(3 * 24 * 60 * 60)
  
  let onCreate: (SavedItinerary) -> Void
  
  var body: some View {
    NavigationStack {
      Form {
        Section("基本信息") {
          TextField("行程名称", text: $title)
          TextField("目的地", text: $destination)
        }
        
        Section("时间安排") {
          DatePicker("开始日期", selection: $startDate, displayedComponents: .date)
          DatePicker("结束日期", selection: $endDate, displayedComponents: .date)
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
          .disabled(title.isEmpty)
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
        // Map Header
        Map(position: $cameraPosition) {
          ForEach(Array(annotations.enumerated()), id: \.element.id) { index, annotation in
            let isSelected = annotation.poi.id == selectedPoiId
            Annotation(annotation.poi.name, coordinate: annotation.coordinate) {
              ZStack {
                Circle()
                  .fill(isSelected ? Color.red : colorForType(annotation.poi.type))
                  .frame(width: isSelected ? 40 : 30, height: isSelected ? 40 : 30)
                  .shadow(color: isSelected ? .red.opacity(0.5) : .black.opacity(0.2), radius: isSelected ? 8 : 4)
                  .overlay(
                    Circle().stroke(.white, lineWidth: 2)
                  )
                  .scaleEffect(isSelected ? 1.1 : 1.0)
                  .animation(.spring(response: 0.4, dampingFraction: 0.6), value: isSelected)
                
                Text("\(index + 1)")
                  .font(isSelected ? .body : .caption)
                  .fontWeight(.bold)
                  .foregroundStyle(.white)
              }
              .zIndex(isSelected ? 100 : 1) // Bring selected to front
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

          // Timeline
          if !localDays.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
              Label("行程安排", systemImage: "map")
                .font(.headline)
                .padding(.horizontal)
              
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
                  VStack(alignment: .leading, spacing: 0) {
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
    .onAppear {
      if localDays.isEmpty {
        localDays = itinerary.days
      }
      if localTitle.isEmpty {
        localTitle = itinerary.title
      }
      updateCamera()
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
  
  private func colorForType(_ type: String?) -> Color {
    switch type?.lowercased() {
    case "景点", "attraction": return .orange
    case "餐厅", "restaurant", "美食", "food": return .red
    case "酒店", "hotel", "住宿", "accommodation": return .blue
    case "交通", "transport", "transportation": return .green
    default: return .purple
    }
  }
}

struct SavedPoiAnnotation: Identifiable {
  let id = UUID()
  let poi: AiPoi
  let coordinate: CLLocationCoordinate2D
}

#Preview { ItineraryListView() }
