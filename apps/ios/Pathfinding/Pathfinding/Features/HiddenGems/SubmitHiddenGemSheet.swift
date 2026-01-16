import CoreLocation
import MapKit
import SwiftUI

// MARK: - Submit Hidden Gem Sheet

struct SubmitHiddenGemSheet: View {
  let store: HiddenGemsStore
  @Environment(\.dismiss) private var dismiss

  // Basic Info
  @State private var name: String = ""
  @State private var nameEn: String = ""
  @State private var category: PoiCategory = .attraction
  @State private var description: String = ""

  // Location
  @State private var address: String = ""
  @State private var latitude: Double = 0
  @State private var longitude: Double = 0
  @State private var showingLocationPicker = false
  @State private var selectedCoordinate: CLLocationCoordinate2D?

  // Local Tips
  @State private var localTips: String = ""
  @State private var bestTimeToVisit: String = ""
  @State private var priceRange: String = ""
  @State private var howDiscovered: String = ""
  @State private var avoidTimes: String = ""

  // Local Secrets
  @State private var localSecrets: [String] = []
  @State private var newSecret: String = ""

  // State
  @State private var isSubmitting = false
  @State private var showingError = false
  @State private var errorMessage = ""

  // City ID (would normally come from user's selected city)
  private let cityId = "default"

  var body: some View {
    NavigationStack {
      Form {
        // Basic Info Section
        basicInfoSection

        // Location Section
        locationSection

        // Local Tips Section
        localTipsSection

        // Local Secrets Section
        localSecretsSection

        // Discovery Info Section
        discoveryInfoSection
      }
      .navigationTitle("分享隐藏景点")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("提交") {
            submitHiddenGem()
          }
          .disabled(!isFormValid || isSubmitting)
          .fontWeight(.semibold)
        }
      }
      .disabled(isSubmitting)
      .overlay {
        if isSubmitting {
          Color.black.opacity(0.3)
            .ignoresSafeArea()
            .overlay {
              ProgressView("提交中...")
                .padding()
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
        }
      }
      .alert("提交失败", isPresented: $showingError) {
        Button("确定", role: .cancel) {}
      } message: {
        Text(errorMessage)
      }
      .sheet(isPresented: $showingLocationPicker) {
        LocationPickerSheet(
          selectedCoordinate: $selectedCoordinate,
          address: $address
        )
      }
      .onChange(of: selectedCoordinate?.latitude) { _, _ in
        if let coord = selectedCoordinate {
          latitude = coord.latitude
          longitude = coord.longitude
        }
      }
      .onChange(of: selectedCoordinate?.longitude) { _, _ in
        if let coord = selectedCoordinate {
          latitude = coord.latitude
          longitude = coord.longitude
        }
      }
    }
  }

  // MARK: - Form Validation

  private var isFormValid: Bool {
    !name.isEmpty &&
    !description.isEmpty &&
    latitude != 0 &&
    longitude != 0
  }

  // MARK: - Basic Info Section

  private var basicInfoSection: some View {
    Section {
      TextField("景点名称 *", text: $name)

      TextField("英文名称 (可选)", text: $nameEn)

      Picker("分类", selection: $category) {
        ForEach(PoiCategory.allCases, id: \.self) { cat in
          Label(cat.displayName, systemImage: cat.icon)
            .tag(cat)
        }
      }

      TextField("描述 *", text: $description, axis: .vertical)
        .lineLimit(3...6)
    } header: {
      Text("基本信息")
    } footer: {
      Text("带 * 的为必填项")
    }
  }

  // MARK: - Location Section

  private var locationSection: some View {
    Section {
      Button {
        showingLocationPicker = true
      } label: {
        HStack {
          Label("选择位置", systemImage: "mappin.circle")
          Spacer()
          if latitude != 0 && longitude != 0 {
            Image(systemName: "checkmark.circle.fill")
              .foregroundStyle(.green)
          } else {
            Image(systemName: "chevron.right")
              .foregroundStyle(.secondary)
          }
        }
      }
      .foregroundStyle(.primary)

      if latitude != 0 && longitude != 0 {
        // Mini map preview
        Map(position: .constant(.region(MKCoordinateRegion(
          center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
          span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )))) {
          Marker("", coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude))
        }
        .frame(height: 120)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .allowsHitTesting(false)

        Text("坐标: \(String(format: "%.4f", latitude)), \(String(format: "%.4f", longitude))")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      TextField("详细地址", text: $address)
    } header: {
      Text("位置信息")
    } footer: {
      Text("点击选择位置以在地图上标记景点")
    }
  }

  // MARK: - Local Tips Section

  private var localTipsSection: some View {
    Section {
      TextField("本地小贴士", text: $localTips, axis: .vertical)
        .lineLimit(2...4)

      TextField("最佳游览时间", text: $bestTimeToVisit)

      TextField("价格范围", text: $priceRange)

      TextField("避开的时间", text: $avoidTimes)
    } header: {
      Text("本地人建议")
    } footer: {
      Text("分享你作为本地人的独特见解")
    }
  }

  // MARK: - Local Secrets Section

  private var localSecretsSection: some View {
    Section {
      ForEach(localSecrets, id: \.self) { secret in
        HStack {
          Image(systemName: "key.fill")
            .foregroundStyle(.purple)
          Text(secret)
          Spacer()
          Button {
            withAnimation {
              localSecrets.removeAll { $0 == secret }
            }
          } label: {
            Image(systemName: "xmark.circle.fill")
              .foregroundStyle(.secondary)
          }
        }
      }

      HStack {
        TextField("添加本地秘密...", text: $newSecret)

        Button {
          addSecret()
        } label: {
          Image(systemName: "plus.circle.fill")
            .foregroundStyle(Color.accentColor)
        }
        .disabled(newSecret.isEmpty)
      }
    } header: {
      Text("本地秘密")
    } footer: {
      Text("分享只有本地人才知道的秘密")
    }
  }

  // MARK: - Discovery Info Section

  private var discoveryInfoSection: some View {
    Section {
      TextField("你是如何发现这个地方的?", text: $howDiscovered, axis: .vertical)
        .lineLimit(2...4)
    } header: {
      Text("发现故事")
    }
  }

  // MARK: - Actions

  private func addSecret() {
    guard !newSecret.isEmpty else { return }
    withAnimation {
      localSecrets.append(newSecret)
      newSecret = ""
    }
  }

  private func submitHiddenGem() {
    isSubmitting = true

    let request = SubmitHiddenGemRequest(
      name: name,
      nameEn: nameEn.isEmpty ? nil : nameEn,
      category: category,
      cityId: cityId,
      address: address.isEmpty ? nil : address,
      latitude: latitude,
      longitude: longitude,
      description: description,
      localTips: localTips.isEmpty ? nil : localTips,
      bestTimeToVisit: bestTimeToVisit.isEmpty ? nil : bestTimeToVisit,
      priceRange: priceRange.isEmpty ? nil : priceRange,
      imageUrls: nil,
      howDiscovered: howDiscovered.isEmpty ? nil : howDiscovered,
      localSecrets: localSecrets.isEmpty ? nil : localSecrets,
      avoidTimes: avoidTimes.isEmpty ? nil : avoidTimes
    )

    Task {
      if let _ = await store.submitHiddenGem(request) {
        isSubmitting = false
        dismiss()
      } else {
        isSubmitting = false
        errorMessage = store.error?.localizedDescription ?? "提交失败，请稍后重试"
        showingError = true
      }
    }
  }
}

// MARK: - Location Picker Sheet

struct LocationPickerSheet: View {
  @Binding var selectedCoordinate: CLLocationCoordinate2D?
  @Binding var address: String
  @Environment(\.dismiss) private var dismiss

  @State private var cameraPosition: MapCameraPosition = .region(MKCoordinateRegion(
    center: CLLocationCoordinate2D(latitude: 31.2304, longitude: 121.4737), // Default to Shanghai
    span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
  ))
  @State private var searchText: String = ""
  @State private var searchResults: [MKMapItem] = []
  @State private var isSearching = false
  @State private var markerCoordinate: CLLocationCoordinate2D?

  var body: some View {
    NavigationStack {
      ZStack {
        // Map
        Map(position: $cameraPosition) {
          if let coord = markerCoordinate {
            Marker("选中位置", coordinate: coord)
              .tint(.red)
          }
        }
        .onTapGesture { position in
          // Note: This won't work directly - need MapReader for coordinate conversion
          // For now, users can search or use current location
        }
        .ignoresSafeArea(edges: .bottom)

        // Center crosshair
        VStack {
          Spacer()
          Image(systemName: "plus")
            .font(.title2)
            .foregroundStyle(.red)
            .padding(8)
            .background(Circle().fill(.white.opacity(0.8)))
          Spacer()
        }

        // Search overlay
        VStack {
          // Search bar
          HStack {
            Image(systemName: "magnifyingglass")
              .foregroundStyle(.secondary)
            TextField("搜索地点...", text: $searchText)
              .onSubmit {
                searchLocation()
              }
            if !searchText.isEmpty {
              Button {
                searchText = ""
                searchResults = []
              } label: {
                Image(systemName: "xmark.circle.fill")
                  .foregroundStyle(.secondary)
              }
            }
          }
          .padding(DesignTokens.Spacing.sm)
          .background(.regularMaterial)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
          .padding()

          // Search results
          if !searchResults.isEmpty {
            ScrollView {
              VStack(spacing: 0) {
                ForEach(searchResults, id: \.self) { item in
                  Button {
                    selectMapItem(item)
                  } label: {
                    HStack {
                      Image(systemName: "mappin.circle.fill")
                        .foregroundStyle(.red)
                      VStack(alignment: .leading) {
                        Text(item.name ?? "未知地点")
                          .font(.subheadline)
                          .foregroundStyle(.primary)
                        if let address = item.placemark.title {
                          Text(address)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        }
                      }
                      Spacer()
                    }
                    .padding(DesignTokens.Spacing.sm)
                  }
                  Divider()
                }
              }
              .background(.regularMaterial)
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .frame(maxHeight: 200)
            .padding(.horizontal)
          }

          Spacer()

          // Confirm button
          Button {
            confirmLocation()
          } label: {
            Text("确认位置")
              .font(.headline)
              .frame(maxWidth: .infinity)
              .padding()
          }
          .buttonStyle(.borderedProminent)
          .padding()
        }
      }
      .navigationTitle("选择位置")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            useCurrentLocation()
          } label: {
            Image(systemName: "location.fill")
          }
        }
      }
    }
  }

  private func searchLocation() {
    guard !searchText.isEmpty else { return }
    isSearching = true

    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = searchText
    request.region = MKCoordinateRegion(
      center: CLLocationCoordinate2D(latitude: 31.2304, longitude: 121.4737),
      span: MKCoordinateSpan(latitudeDelta: 1, longitudeDelta: 1)
    )

    let search = MKLocalSearch(request: request)
    search.start { response, error in
      isSearching = false
      if let response = response {
        searchResults = response.mapItems
      }
    }
  }

  private func selectMapItem(_ item: MKMapItem) {
    let coordinate = item.placemark.coordinate
    markerCoordinate = coordinate
    cameraPosition = .region(MKCoordinateRegion(
      center: coordinate,
      span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    ))
    address = item.placemark.title ?? ""
    searchResults = []
    searchText = item.name ?? ""
  }

  private func useCurrentLocation() {
    // In a real app, would use CLLocationManager
    // For now, just center on a default location
  }

  private func confirmLocation() {
    if let coord = markerCoordinate {
      selectedCoordinate = coord
    } else {
      // Use map center
      // Note: Would need MapReader to get actual center coordinate
      // For now, use marker if set
    }
    dismiss()
  }
}

// MARK: - Preview

#Preview {
  SubmitHiddenGemSheet(store: HiddenGemsStore.shared)
}
