import MapKit
import SwiftUI

// MARK: - Hidden Gem Detail View

struct HiddenGemDetailView: View {
  let gem: HiddenGemPoi
  @State private var store = HiddenGemsStore.shared
  @State private var showingRatingSheet = false
  @State private var currentImageIndex = 0
  @State private var showImageViewer = false
  @State private var cameraPosition: MapCameraPosition

  init(gem: HiddenGemPoi) {
    self.gem = gem
    let coordinate = CLLocationCoordinate2D(latitude: gem.latitude, longitude: gem.longitude)
    _cameraPosition = State(initialValue: .region(MKCoordinateRegion(
      center: coordinate,
      span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )))
  }

  private var displayImages: [String] {
    gem.imageUrls ?? []
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        // Image Gallery
        imageGallery

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Header
          headerSection

          // Popularity & Rating
          statsSection

          // Local Recommendation
          if let localRec = gem.localRecommendation, localRec.isLocalRecommended {
            localRecommendationSection(localRec)
          }

          // Map
          mapSection

          // Ratings List
          ratingsSection
        }
        .padding(DesignTokens.Spacing.lg)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .topBarTrailing) {
        Button {
          showingRatingSheet = true
        } label: {
          Image(systemName: "star.bubble")
        }

        ShareLink(item: gem.name) {
          Image(systemName: "square.and.arrow.up")
        }
      }
    }
    .sheet(isPresented: $showingRatingSheet) {
      RateHiddenGemSheet(gem: gem, store: store)
    }
    .imageViewer(
      images: displayImages,
      isPresented: $showImageViewer,
      selectedIndex: $currentImageIndex
    )
    .task {
      await store.fetchRatings(for: gem.id)
    }
  }

  // MARK: - Image Gallery

  @ViewBuilder
  private var imageGallery: some View {
    if displayImages.isEmpty {
      Rectangle()
        .fill(Color(.systemGray5))
        .aspectRatio(16 / 9, contentMode: .fill)
        .frame(maxWidth: .infinity)
        .overlay {
          Image(systemName: gem.category.icon)
            .font(.largeTitle)
            .foregroundStyle(.secondary)
        }
    } else if displayImages.count == 1 {
      CachedAsyncImage(url: URL(string: displayImages[0])) { image in
        image
          .resizable()
          .aspectRatio(16 / 9, contentMode: .fill)
      } placeholder: {
        Rectangle()
          .fill(Color(.systemGray5))
          .aspectRatio(16 / 9, contentMode: .fill)
          .overlay { ProgressView() }
      }
      .frame(maxWidth: .infinity)
      .clipped()
      .contentShape(Rectangle())
      .onTapGesture {
        showImageViewer = true
      }
    } else {
      ZStack(alignment: .bottom) {
        TabView(selection: $currentImageIndex) {
          ForEach(Array(displayImages.enumerated()), id: \.offset) { index, imageUrl in
            CachedAsyncImage(url: URL(string: imageUrl)) { image in
              image
                .resizable()
                .aspectRatio(contentMode: .fill)
            } placeholder: {
              Rectangle()
                .fill(Color(.systemGray5))
                .overlay { ProgressView() }
            }
            .tag(index)
            .contentShape(Rectangle())
            .onTapGesture {
              currentImageIndex = index
              showImageViewer = true
            }
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .aspectRatio(16 / 9, contentMode: .fill)
        .frame(maxWidth: .infinity)
        .clipped()

        // Page indicator
        HStack(spacing: 6) {
          ForEach(0..<displayImages.count, id: \.self) { index in
            Capsule()
              .fill(index == currentImageIndex ? Color.white : Color.white.opacity(0.5))
              .frame(width: index == currentImageIndex ? 16 : 6, height: 6)
              .animation(.spring(response: 0.3), value: currentImageIndex)
          }
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(Capsule().fill(.black.opacity(0.3)))
        .padding(.bottom, DesignTokens.Spacing.sm)
      }
    }
  }

  // MARK: - Header Section

  private var headerSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      // Category & Popularity badges
      HStack(spacing: DesignTokens.Spacing.xs) {
        Badge(gem.category.displayName, icon: gem.category.icon, style: .info)

        if let level = gem.popularityLevel {
          PopularityBadge(level: level)
        }

        if gem.localRecommendation?.isLocalRecommended == true {
          Badge("本地推荐", icon: "checkmark.seal.fill", style: .success)
        }
      }

      Text(gem.name)
        .font(.title2)
        .fontWeight(.bold)

      if let nameEn = gem.nameEn {
        Text(nameEn)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      if let address = gem.address {
        Label(address, systemImage: "mappin.circle.fill")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
  }

  // MARK: - Stats Section

  private var statsSection: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Hidden Gem Rating
      if let rating = gem.hiddenGemRating {
        VStack(spacing: 4) {
          HStack(spacing: 4) {
            Image(systemName: "star.fill")
              .foregroundStyle(.orange)
            Text(String(format: "%.1f", rating))
              .fontWeight(.semibold)
          }
          .font(.title3)

          Text("\(gem.hiddenGemRatingCount ?? 0) 评价")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.sm)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
      }

      // Hidden Gem Score
      if let score = gem.hiddenGemScore {
        VStack(spacing: 4) {
          HStack(spacing: 4) {
            Image(systemName: "sparkles")
              .foregroundStyle(.purple)
            Text(String(format: "%.0f", score))
              .fontWeight(.semibold)
          }
          .font(.title3)

          Text("小众指数")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.sm)
        .background(Color.purple.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
      }

      // Price Level
      if let priceLevel = gem.priceLevel {
        VStack(spacing: 4) {
          HStack(spacing: 2) {
            ForEach(0..<priceLevel, id: \.self) { _ in
              Image(systemName: "yensign")
                .foregroundStyle(.green)
            }
          }
          .font(.title3)

          Text("价格水平")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.sm)
        .background(Color.green.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
      }
    }
  }

  // MARK: - Local Recommendation Section

  private func localRecommendationSection(_ localRec: LocalRecommendation) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("本地人推荐", systemImage: "person.crop.circle.badge.checkmark")
        .font(.headline)
        .foregroundStyle(.green)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        if let tips = localRec.localTips {
          HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "lightbulb.fill")
              .foregroundStyle(.orange)
            Text(tips)
              .font(.subheadline)
          }
        }

        if let bestTime = localRec.bestTimeToVisit {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "clock.fill")
              .foregroundStyle(.blue)
            Text("最佳时间: \(bestTime)")
              .font(.subheadline)
          }
        }

        if let secrets = localRec.localSecrets, !secrets.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
            HStack(spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "key.fill")
                .foregroundStyle(.purple)
              Text("本地秘密:")
                .font(.subheadline)
                .fontWeight(.medium)
            }

            ForEach(secrets, id: \.self) { secret in
              HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "circle.fill")
                  .font(.system(size: 4))
                  .foregroundStyle(.secondary)
                  .padding(.top, 6)
                Text(secret)
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }
            }
          }
        }

        if let recommendedBy = localRec.recommendedBy {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "person.fill")
              .foregroundStyle(.teal)
            Text("推荐人: \(recommendedBy)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.green.opacity(0.08))
    )
  }

  // MARK: - Map Section

  private var mapSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("位置", systemImage: "map")
        .font(.headline)

      Map(position: $cameraPosition) {
        Marker(gem.name, coordinate: CLLocationCoordinate2D(
          latitude: gem.latitude,
          longitude: gem.longitude
        ))
        .tint(popularityColor(gem.popularityLevel))
      }
      .frame(height: 200)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

      // Open in Maps button
      Button {
        openInMaps()
      } label: {
        Label("在地图中打开", systemImage: "arrow.up.right.square")
          .font(.subheadline)
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.bordered)
    }
  }

  // MARK: - Ratings Section

  private var ratingsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Label("用户评价", systemImage: "star.bubble")
          .font(.headline)

        Spacer()

        Button {
          showingRatingSheet = true
        } label: {
          Label("写评价", systemImage: "square.and.pencil")
            .font(.subheadline)
        }
      }

      if store.isLoadingRatings {
        HStack {
          Spacer()
          ProgressView()
          Spacer()
        }
        .padding()
      } else if store.selectedPoiRatings.isEmpty {
        VStack(spacing: DesignTokens.Spacing.sm) {
          Image(systemName: "star.slash")
            .font(.largeTitle)
            .foregroundStyle(.secondary)
          Text("暂无评价")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text("成为第一个评价的人吧")
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(DesignTokens.Spacing.xl)
      } else {
        VStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(store.selectedPoiRatings) { rating in
            RatingRow(rating: rating)
          }
        }
      }
    }
  }

  // MARK: - Helpers

  private func popularityColor(_ level: PopularityLevel?) -> Color {
    guard let level = level else { return .blue }
    switch level {
    case .hidden: return .green
    case .emerging: return .teal
    case .moderate: return .blue
    case .popular: return .orange
    case .crowded: return .red
    }
  }

  private func openInMaps() {
    let coordinate = CLLocationCoordinate2D(latitude: gem.latitude, longitude: gem.longitude)
    let placemark = MKPlacemark(coordinate: coordinate)
    let mapItem = MKMapItem(placemark: placemark)
    mapItem.name = gem.name
    mapItem.openInMaps(launchOptions: [
      MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDefault
    ])
  }
}

// MARK: - Popularity Badge

struct PopularityBadge: View {
  let level: PopularityLevel

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: level.icon)
      Text(level.displayName)
    }
    .font(.caption2)
    .fontWeight(.semibold)
    .foregroundStyle(.white)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(color.gradient)
    .clipShape(Capsule())
  }

  private var color: Color {
    switch level {
    case .hidden: return .green
    case .emerging: return .teal
    case .moderate: return .blue
    case .popular: return .orange
    case .crowded: return .red
    }
  }
}

// MARK: - Rating Row

struct RatingRow: View {
  let rating: HiddenGemRating

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      HStack {
        // Stars
        HStack(spacing: 2) {
          ForEach(0..<5, id: \.self) { index in
            Image(systemName: index < rating.rating ? "star.fill" : "star")
              .font(.caption)
              .foregroundStyle(index < rating.rating ? .orange : .secondary)
          }
        }

        Spacer()

        // Date
        Text(formatDate(rating.createdAt))
          .font(.caption)
          .foregroundStyle(.tertiary)
      }

      if let review = rating.review, !review.isEmpty {
        Text(review)
          .font(.subheadline)
          .foregroundStyle(.primary)
      }

      HStack(spacing: DesignTokens.Spacing.sm) {
        if let visitDate = rating.visitDate {
          Label(visitDate, systemImage: "calendar")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        if rating.wouldRecommend {
          Label("推荐", systemImage: "hand.thumbsup.fill")
            .font(.caption)
            .foregroundStyle(.green)
        }
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.sm)
  }

  private func formatDate(_ timestamp: Double) -> String {
    let date = Date(timeIntervalSince1970: timestamp)
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .none
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: date)
  }
}

// MARK: - Rate Hidden Gem Sheet

struct RateHiddenGemSheet: View {
  let gem: HiddenGemPoi
  let store: HiddenGemsStore
  @Environment(\.dismiss) private var dismiss

  @State private var rating: Int = 0
  @State private var review: String = ""
  @State private var visitDate: Date = Date()
  @State private var wouldRecommend: Bool = true
  @State private var isSubmitting = false

  var body: some View {
    NavigationStack {
      Form {
        Section {
          VStack(spacing: DesignTokens.Spacing.sm) {
            Text("你的评分")
              .font(.headline)

            HStack(spacing: DesignTokens.Spacing.sm) {
              ForEach(1...5, id: \.self) { star in
                Button {
                  withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    rating = star
                  }
                } label: {
                  Image(systemName: star <= rating ? "star.fill" : "star")
                    .font(.title)
                    .foregroundStyle(star <= rating ? .orange : .secondary)
                    .symbolEffect(.bounce, value: rating)
                }
              }
            }
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, DesignTokens.Spacing.sm)
        }

        Section("评价内容") {
          TextField("分享你的体验...", text: $review, axis: .vertical)
            .lineLimit(3...6)
        }

        Section {
          DatePicker("访问日期", selection: $visitDate, displayedComponents: .date)

          Toggle(isOn: $wouldRecommend) {
            Label("推荐给其他人", systemImage: "hand.thumbsup")
          }
        }
      }
      .navigationTitle("评价 \(gem.name)")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("提交") {
            submitRating()
          }
          .disabled(rating == 0 || isSubmitting)
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
    }
  }

  private func submitRating() {
    isSubmitting = true

    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"

    let request = RateHiddenGemRequest(
      rating: rating,
      review: review.isEmpty ? nil : review,
      visitDate: formatter.string(from: visitDate),
      wouldRecommend: wouldRecommend
    )

    Task {
      let success = await store.rateHiddenGem(poiId: gem.id, request: request)
      isSubmitting = false
      if success {
        dismiss()
      }
    }
  }
}

#Preview {
  NavigationStack {
    HiddenGemDetailView(gem: HiddenGemPoi(
      id: "1",
      name: "隐秘咖啡馆",
      nameEn: "Secret Coffee Shop",
      category: .restaurant,
      cityId: "shanghai",
      address: "上海市静安区某某路123号",
      latitude: 31.2304,
      longitude: 121.4737,
      rating: 4.5,
      ratingCount: 100,
      priceLevel: 2,
      imageUrls: nil,
      source: "user",
      isHiddenGem: true,
      hiddenGemScore: 85,
      hiddenGemRating: 4.8,
      hiddenGemRatingCount: 25,
      localRecommendation: LocalRecommendation(
        isLocalRecommended: true,
        localTips: "周末人少，工作日下午最佳",
        bestTimeToVisit: "下午2-5点",
        localSecrets: ["隐藏菜单有特调咖啡", "二楼有露台可以看风景"],
        recommendedBy: "本地咖啡爱好者"
      ),
      popularityLevel: .hidden
    ))
  }
}
