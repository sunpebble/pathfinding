import ARKit
import RealityKit
import SwiftUI

// MARK: - AR Navigation View

struct ARNavigationView: View {
  let route: ARNavigationRoute
  @Environment(\.dismiss) private var dismiss
  @State private var arManager = ARNavigationManager.shared
  @State private var showPoiList = false
  @State private var showSettings = false
  @State private var showPhotoGallery = false
  @State private var capturedPhoto: ARPhoto?
  @State private var showCaptureFlash = false

  var body: some View {
    ZStack {
      // AR Scene
      ARViewContainer(arManager: arManager)
        .ignoresSafeArea()

      // Capture flash effect
      if showCaptureFlash {
        Color.white
          .ignoresSafeArea()
          .transition(.opacity)
      }

      // UI Overlays
      VStack(spacing: 0) {
        // Top bar
        topBar

        Spacer()

        // POI overlays
        poiOverlaysView

        Spacer()

        // Bottom controls
        bottomControls
      }

      // Tracking status overlay
      if case .limited(let reason) = arManager.state {
        trackingLimitedOverlay(reason: reason)
      }

      // Error overlay
      if case .error(let message) = arManager.state {
        errorOverlay(message: message)
      }
    }
    .onAppear {
      arManager.startNavigation(with: route)
    }
    .onDisappear {
      arManager.stopNavigation()
    }
    .sheet(isPresented: $showPoiList) {
      ARPoiListSheet(pois: arManager.pois, currentIndex: route.currentIndex) { index in
        arManager.selectPoi(at: index)
        showPoiList = false
      }
    }
    .sheet(isPresented: $showSettings) {
      ARSettingsSheet(settings: $arManager.settings)
    }
    .sheet(isPresented: $showPhotoGallery) {
      ARPhotoGallerySheet(photos: arManager.capturedPhotos)
    }
    .sheet(item: $capturedPhoto) { photo in
      ARPhotoCapturedSheet(photo: photo)
    }
  }

  // MARK: - Top Bar

  private var topBar: some View {
    HStack {
      // Close button
      Button {
        dismiss()
      } label: {
        Image(systemName: "xmark")
          .font(.title3)
          .fontWeight(.semibold)
          .foregroundStyle(.white)
          .padding(12)
          .background(Circle().fill(.ultraThinMaterial))
      }

      Spacer()

      // Route info
      VStack(spacing: 2) {
        Text(route.name)
          .font(.headline)
          .foregroundStyle(.white)

        if let target = arManager.route?.currentTarget {
          Text("前往: \(target.name)")
            .font(.caption)
            .foregroundStyle(.white.opacity(0.8))
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 8)
      .background(Capsule().fill(.ultraThinMaterial))

      Spacer()

      // Settings button
      Button {
        showSettings = true
      } label: {
        Image(systemName: "gearshape")
          .font(.title3)
          .foregroundStyle(.white)
          .padding(12)
          .background(Circle().fill(.ultraThinMaterial))
      }
    }
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.top, DesignTokens.Spacing.sm)
  }

  // MARK: - POI Overlays

  private var poiOverlaysView: some View {
    GeometryReader { geometry in
      ForEach(arManager.pois.filter { $0.isVisible }) { poi in
        ARPoiOverlay(
          poi: poi,
          isCurrentTarget: poi.id == arManager.route?.currentTarget?.id,
          showDistance: arManager.settings.showDistanceLabels,
          showArrow: arManager.settings.showDirectionArrows
        )
        .position(
          x: calculateScreenX(for: poi, in: geometry.size),
          y: calculateScreenY(for: poi, in: geometry.size)
        )
        .opacity(arManager.settings.overlayOpacity)
      }
    }
  }

  /// Calculate screen X position for POI
  private func calculateScreenX(for poi: ARPoi, in size: CGSize) -> CGFloat {
    // Normalize bearing relative to device heading
    let relativeBearing = (poi.bearing - arManager.deviceHeading + 360)
      .truncatingRemainder(dividingBy: 360)

    // Map to screen position (center = straight ahead)
    // FOV is approximately 60 degrees for typical phone camera
    let fov = 60.0
    let halfFov = fov / 2

    // If bearing is within FOV, calculate position
    if relativeBearing < halfFov {
      // Right side of center
      let ratio = relativeBearing / halfFov
      return size.width / 2 + (size.width / 2 * ratio)
    } else if relativeBearing > 360 - halfFov {
      // Left side of center
      let adjustedBearing = 360 - relativeBearing
      let ratio = adjustedBearing / halfFov
      return size.width / 2 - (size.width / 2 * ratio)
    } else if relativeBearing < 180 {
      // Off screen right
      return size.width + 100
    } else {
      // Off screen left
      return -100
    }
  }

  /// Calculate screen Y position for POI
  private func calculateScreenY(for poi: ARPoi, in size: CGSize) -> CGFloat {
    // Closer POIs appear lower on screen (nearer to horizon line)
    // Farther POIs appear higher
    let maxDistance = arManager.settings.maxPoiDistance
    let normalizedDistance = min(poi.distance / maxDistance, 1.0)

    // Map to screen Y (bottom third to middle)
    let minY = size.height * 0.3
    let maxY = size.height * 0.7
    return maxY - (normalizedDistance * (maxY - minY))
  }

  // MARK: - Bottom Controls

  private var bottomControls: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Current target info
      if let target = arManager.route?.currentTarget,
         let poi = arManager.pois.first(where: { $0.id == target.id })
      {
        ARTargetInfoCard(poi: poi)
      }

      // Control buttons
      HStack(spacing: DesignTokens.Spacing.xl) {
        // Previous POI
        Button {
          _ = arManager.moveToPreviousPoi()
        } label: {
          Image(systemName: "chevron.left")
            .font(.title2)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .frame(width: 56, height: 56)
            .background(Circle().fill(.ultraThinMaterial))
        }
        .disabled(arManager.route?.currentIndex == 0)
        .opacity((arManager.route?.currentIndex ?? 0) == 0 ? 0.5 : 1)

        // Capture button
        Button {
          capturePhoto()
        } label: {
          ZStack {
            Circle()
              .stroke(.white, lineWidth: 4)
              .frame(width: 72, height: 72)

            Circle()
              .fill(.white)
              .frame(width: 60, height: 60)
          }
        }

        // Next POI
        Button {
          _ = arManager.moveToNextPoi()
        } label: {
          Image(systemName: "chevron.right")
            .font(.title2)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .frame(width: 56, height: 56)
            .background(Circle().fill(.ultraThinMaterial))
        }
        .disabled((arManager.route?.currentIndex ?? 0) >= (arManager.route?.pois.count ?? 1) - 1)
        .opacity(
          (arManager.route?.currentIndex ?? 0) >= (arManager.route?.pois.count ?? 1) - 1 ? 0.5 : 1)
      }

      // Additional controls
      HStack(spacing: DesignTokens.Spacing.lg) {
        // POI list
        Button {
          showPoiList = true
        } label: {
          VStack(spacing: 4) {
            Image(systemName: "list.bullet")
              .font(.title3)
            Text("景点列表")
              .font(.caption2)
          }
          .foregroundStyle(.white)
        }

        Spacer()

        // Progress indicator
        VStack(spacing: 4) {
          Text("\((arManager.route?.currentIndex ?? 0) + 1)/\(arManager.route?.pois.count ?? 0)")
            .font(.headline)
          Text("进度")
            .font(.caption2)
        }
        .foregroundStyle(.white)

        Spacer()

        // Photo gallery
        Button {
          showPhotoGallery = true
        } label: {
          VStack(spacing: 4) {
            ZStack(alignment: .topTrailing) {
              Image(systemName: "photo.on.rectangle")
                .font(.title3)

              if !arManager.capturedPhotos.isEmpty {
                Text("\(arManager.capturedPhotos.count)")
                  .font(.caption2)
                  .fontWeight(.bold)
                  .foregroundStyle(.white)
                  .padding(4)
                  .background(Circle().fill(.red))
                  .offset(x: 8, y: -8)
              }
            }
            Text("照片")
              .font(.caption2)
          }
          .foregroundStyle(.white)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.xl)
    }
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.bottom, DesignTokens.Spacing.lg)
  }

  // MARK: - Tracking Limited Overlay

  private func trackingLimitedOverlay(reason: TrackingLimitedReason) -> some View {
    VStack {
      Spacer()

      HStack {
        Image(systemName: "exclamationmark.triangle.fill")
          .foregroundStyle(.yellow)
        Text(reason.rawValue)
          .font(.subheadline)
          .foregroundStyle(.white)
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 10)
      .background(Capsule().fill(.black.opacity(0.7)))

      Spacer()
        .frame(height: 200)
    }
  }

  // MARK: - Error Overlay

  private func errorOverlay(message: String) -> some View {
    VStack {
      Spacer()

      VStack(spacing: 12) {
        Image(systemName: "xmark.circle.fill")
          .font(.largeTitle)
          .foregroundStyle(.red)

        Text(message)
          .font(.subheadline)
          .foregroundStyle(.white)
          .multilineTextAlignment(.center)

        Button("重试") {
          arManager.startNavigation(with: route)
        }
        .buttonStyle(.borderedProminent)
      }
      .padding(24)
      .background(RoundedRectangle(cornerRadius: 16).fill(.black.opacity(0.8)))

      Spacer()
    }
    .padding()
  }

  // MARK: - Photo Capture

  private func capturePhoto() {
    // Flash effect
    withAnimation(.easeIn(duration: 0.1)) {
      showCaptureFlash = true
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
      withAnimation(.easeOut(duration: 0.2)) {
        showCaptureFlash = false
      }
    }

    // Capture
    if let photo = arManager.capturePhoto() {
      capturedPhoto = photo
    }

    // Haptic feedback
    let generator = UIImpactFeedbackGenerator(style: .medium)
    generator.impactOccurred()
  }
}

// MARK: - AR View Container

struct ARViewContainer: UIViewRepresentable {
  let arManager: ARNavigationManager

  func makeUIView(context: Context) -> ARView {
    let arView = ARView(frame: .zero)
    arView.automaticallyConfigureSession = false

    // Configure AR session through manager
    arManager.configureARSession(arView.session)

    return arView
  }

  func updateUIView(_ uiView: ARView, context: Context) {
    // Update handled by ARNavigationManager
  }
}

// MARK: - AR POI Overlay

struct ARPoiOverlay: View {
  let poi: ARPoi
  let isCurrentTarget: Bool
  let showDistance: Bool
  let showArrow: Bool

  var body: some View {
    VStack(spacing: 4) {
      // Direction arrow
      if showArrow {
        Image(systemName: "arrowtriangle.down.fill")
          .font(.caption)
          .foregroundStyle(isCurrentTarget ? .yellow : .white)
      }

      // POI card
      HStack(spacing: 8) {
        // Icon
        Image(systemName: poi.typeIcon)
          .font(.caption)
          .foregroundStyle(.white)
          .frame(width: 24, height: 24)
          .background(Circle().fill(colorForType(poi.type)))

        VStack(alignment: .leading, spacing: 2) {
          Text(poi.name)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .lineLimit(1)

          if showDistance {
            Text(poi.formattedDistance)
              .font(.caption2)
              .foregroundStyle(.white.opacity(0.8))
          }
        }
      }
      .padding(.horizontal, 10)
      .padding(.vertical, 6)
      .background(
        RoundedRectangle(cornerRadius: 8)
          .fill(.ultraThinMaterial)
          .overlay(
            RoundedRectangle(cornerRadius: 8)
              .stroke(isCurrentTarget ? Color.yellow : Color.clear, lineWidth: 2)
          )
      )
    }
    .scaleEffect(isCurrentTarget ? 1.1 : 1.0)
    .animation(.spring(response: 0.3), value: isCurrentTarget)
  }

  private func colorForType(_ type: String?) -> Color {
    switch type?.lowercased() {
    case "景点", "attraction": return .orange
    case "餐厅", "restaurant", "美食", "food": return .red
    case "酒店", "hotel", "住宿", "accommodation": return .blue
    case "交通", "transport", "transportation": return .green
    case "购物", "shopping": return .purple
    default: return .indigo
    }
  }
}

// MARK: - AR Target Info Card

struct ARTargetInfoCard: View {
  let poi: ARPoi

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Direction indicator
      VStack(spacing: 4) {
        Image(systemName: "location.north.fill")
          .font(.title2)
          .rotationEffect(.degrees(poi.bearing))

        Text(poi.cardinalDirection)
          .font(.caption2)
          .fontWeight(.medium)
      }
      .foregroundStyle(.white)
      .frame(width: 50)

      // POI info
      VStack(alignment: .leading, spacing: 4) {
        Text(poi.name)
          .font(.headline)
          .foregroundStyle(.white)
          .lineLimit(1)

        if let type = poi.type {
          Text(type)
            .font(.caption)
            .foregroundStyle(.white.opacity(0.7))
        }
      }

      Spacer()

      // Distance
      VStack(alignment: .trailing, spacing: 4) {
        Text(poi.formattedDistance)
          .font(.title3)
          .fontWeight(.bold)
          .foregroundStyle(.white)

        Text("距离")
          .font(.caption2)
          .foregroundStyle(.white.opacity(0.7))
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(RoundedRectangle(cornerRadius: DesignTokens.Radius.md).fill(.ultraThinMaterial))
  }
}

// MARK: - AR POI List Sheet

struct ARPoiListSheet: View {
  let pois: [ARPoi]
  let currentIndex: Int
  let onSelect: (Int) -> Void

  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      List {
        ForEach(Array(pois.enumerated()), id: \.element.id) { index, poi in
          poiRow(index: index, poi: poi)
        }
      }
      .navigationTitle("景点列表")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
    }
    .presentationDetents([.medium, .large])
  }

  private func poiRow(index: Int, poi: ARPoi) -> some View {
    Button {
      onSelect(index)
    } label: {
      HStack(spacing: DesignTokens.Spacing.md) {
        // Index
        ZStack {
          Circle()
            .fill(index == currentIndex ? Color.accentColor : Color(.systemGray4))
            .frame(width: 32, height: 32)

          Text("\(index + 1)")
            .font(.subheadline)
            .fontWeight(.bold)
            .foregroundStyle(index == currentIndex ? .white : .primary)
        }

        // Info
        VStack(alignment: .leading, spacing: 4) {
          Text(poi.name)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.primary)

          HStack {
            if let type = poi.type {
              Text(type)
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Text(poi.formattedDistance)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        if index == currentIndex {
          Image(systemName: "checkmark.circle.fill")
            .foregroundStyle(Color.accentColor)
        }
      }
    }
  }
}

// MARK: - AR Settings Sheet

struct ARSettingsSheet: View {
  @Binding var settings: ARNavigationSettings
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      List {
        Section("显示设置") {
          Toggle("显示距离标签", isOn: $settings.showDistanceLabels)
          Toggle("显示方向箭头", isOn: $settings.showDirectionArrows)

          HStack {
            Text("覆盖层透明度")
            Slider(value: $settings.overlayOpacity, in: 0.5...1.0)
          }
        }

        Section("导航设置") {
          HStack {
            Text("最大显示距离")
            Spacer()
            Picker("", selection: $settings.maxPoiDistance) {
              Text("200米").tag(200.0)
              Text("500米").tag(500.0)
              Text("1公里").tag(1000.0)
              Text("2公里").tag(2000.0)
            }
            .pickerStyle(.menu)
          }

          HStack {
            Text("到达判定距离")
            Spacer()
            Picker("", selection: $settings.arrivalThreshold) {
              Text("10米").tag(10.0)
              Text("20米").tag(20.0)
              Text("50米").tag(50.0)
            }
            .pickerStyle(.menu)
          }

          Toggle("到达后自动切换", isOn: $settings.autoAdvance)
        }

        Section("反馈设置") {
          Toggle("震动反馈", isOn: $settings.hapticFeedback)
        }
      }
      .navigationTitle("AR 设置")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
    }
    .presentationDetents([.medium])
  }
}

// MARK: - AR Photo Gallery Sheet

struct ARPhotoGallerySheet: View {
  let photos: [ARPhoto]
  @Environment(\.dismiss) private var dismiss

  private let columns = [
    GridItem(.flexible(), spacing: 2),
    GridItem(.flexible(), spacing: 2),
    GridItem(.flexible(), spacing: 2),
  ]

  var body: some View {
    NavigationStack {
      Group {
        if photos.isEmpty {
          ContentUnavailableView(
            "暂无照片",
            systemImage: "photo.on.rectangle",
            description: Text("使用快门按钮拍摄 AR 照片")
          )
        } else {
          ScrollView {
            LazyVGrid(columns: columns, spacing: 2) {
              ForEach(photos) { photo in
                if let uiImage = UIImage(data: photo.imageData) {
                  Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(minWidth: 0, maxWidth: .infinity)
                    .aspectRatio(1, contentMode: .fill)
                    .clipped()
                }
              }
            }
          }
        }
      }
      .navigationTitle("AR 照片")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
    }
  }
}

// MARK: - AR Photo Captured Sheet

struct ARPhotoCapturedSheet: View {
  let photo: ARPhoto
  @Environment(\.dismiss) private var dismiss
  @State private var showShareSheet = false

  var body: some View {
    NavigationStack {
      VStack(spacing: DesignTokens.Spacing.lg) {
        if let uiImage = UIImage(data: photo.imageData) {
          Image(uiImage: uiImage)
            .resizable()
            .scaledToFit()
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .shadow(radius: 10)
        }

        if let poiName = photo.poiName {
          VStack(spacing: 4) {
            Text("拍摄于")
              .font(.caption)
              .foregroundStyle(.secondary)
            Text(poiName)
              .font(.headline)
          }
        }

        HStack(spacing: DesignTokens.Spacing.lg) {
          Button {
            saveToPhotoLibrary()
          } label: {
            Label("保存到相册", systemImage: "square.and.arrow.down")
          }
          .buttonStyle(.borderedProminent)

          Button {
            showShareSheet = true
          } label: {
            Label("分享", systemImage: "square.and.arrow.up")
          }
          .buttonStyle(.bordered)
        }
      }
      .padding(DesignTokens.Spacing.lg)
      .navigationTitle("照片已拍摄")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
      .sheet(isPresented: $showShareSheet) {
        if let uiImage = UIImage(data: photo.imageData) {
          ActivityShareSheet(items: [uiImage])
        }
      }
    }
    .presentationDetents([.medium])
  }

  private func saveToPhotoLibrary() {
    guard let uiImage = UIImage(data: photo.imageData) else { return }
    UIImageWriteToSavedPhotosAlbum(uiImage, nil, nil, nil)

    let generator = UINotificationFeedbackGenerator()
    generator.notificationOccurred(.success)
  }
}

// MARK: - Preview

#Preview {
  let testRoute = ARNavigationRoute(
    from: AiDay(
      dayNumber: 1,
      theme: "东京一日游",
      pois: [
        AiPoi(name: "东京塔", type: "景点", description: nil, latitude: 35.6586, longitude: 139.7454, address: nil),
        AiPoi(name: "浅草寺", type: "景点", description: nil, latitude: 35.7148, longitude: 139.7967, address: nil),
        AiPoi(name: "一兰拉面", type: "美食", description: nil, latitude: 35.6938, longitude: 139.7034, address: nil),
      ]
    )
  )

  return ARNavigationView(route: testRoute)
}
