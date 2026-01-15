import MapKit
import SwiftUI

// MARK: - User Submission Detail View

struct UserSubmissionDetailView: View {
  let submission: UserSubmittedPoi
  @State private var store = HiddenGemsStore.shared
  @State private var currentImageIndex = 0
  @State private var showImageViewer = false
  @State private var isVoting = false
  @State private var cameraPosition: MapCameraPosition

  init(submission: UserSubmittedPoi) {
    self.submission = submission
    let coordinate = CLLocationCoordinate2D(latitude: submission.latitude, longitude: submission.longitude)
    _cameraPosition = State(initialValue: .region(MKCoordinateRegion(
      center: coordinate,
      span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )))
  }

  private var displayImages: [String] {
    submission.imageUrls ?? []
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        // Image Gallery
        imageGallery

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Header
          headerSection

          // Status & Stats
          statusSection

          // Description
          descriptionSection

          // Local Tips
          if hasLocalTips {
            localTipsSection
          }

          // Local Secrets
          if let secrets = submission.localSecrets, !secrets.isEmpty {
            localSecretsSection(secrets)
          }

          // Discovery Story
          if let howDiscovered = submission.howDiscovered, !howDiscovered.isEmpty {
            discoverySection(howDiscovered)
          }

          // Map
          mapSection

          // Voting Section
          votingSection

          // Moderator Notes (if rejected)
          if submission.status == .rejected, let notes = submission.moderatorNotes {
            moderatorNotesSection(notes)
          }
        }
        .padding(DesignTokens.Spacing.lg)
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .toolbar(content: {
      ToolbarItem(placement: .topBarTrailing) {
        Button {
          let url = URL(string: "https://pathfinding.app/poi/\(submission.id)")!
          let activityVC = UIActivityViewController(activityItems: [url], applicationActivities: nil)
          if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
             let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
          }
        } label: {
          Image(systemName: "square.and.arrow.up")
        }
      }
    })
    .imageViewer(
      images: displayImages,
      isPresented: $showImageViewer,
      selectedIndex: $currentImageIndex
    )
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
          Image(systemName: submission.category.icon)
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
      // Category badge
      HStack(spacing: DesignTokens.Spacing.xs) {
        Badge(submission.category.displayName, icon: submission.category.icon, style: .info)
        SubmissionStatusBadge(status: submission.status)
      }

      Text(submission.name)
        .font(.title2)
        .fontWeight(.bold)

      if let nameEn = submission.nameEn {
        Text(nameEn)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      if let address = submission.address {
        Label(address, systemImage: "mappin.circle.fill")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      // Submission date
      HStack(spacing: DesignTokens.Spacing.xs) {
        Image(systemName: "clock")
          .foregroundStyle(.secondary)
        Text("提交于 \(formatDate(submission.createdAt))")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }

  // MARK: - Status Section

  private var statusSection: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Upvotes
      VStack(spacing: 4) {
        HStack(spacing: 4) {
          Image(systemName: "arrow.up")
            .foregroundStyle(.green)
          Text("\(submission.upvotes)")
            .fontWeight(.semibold)
        }
        .font(.title3)

        Text("赞同")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
      .padding(DesignTokens.Spacing.sm)
      .background(Color.green.opacity(0.1))
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

      // Downvotes
      VStack(spacing: 4) {
        HStack(spacing: 4) {
          Image(systemName: "arrow.down")
            .foregroundStyle(.red)
          Text("\(submission.downvotes)")
            .fontWeight(.semibold)
        }
        .font(.title3)

        Text("反对")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
      .padding(DesignTokens.Spacing.sm)
      .background(Color.red.opacity(0.1))
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

      // Views
      VStack(spacing: 4) {
        HStack(spacing: 4) {
          Image(systemName: "eye")
            .foregroundStyle(.blue)
          Text("\(submission.viewCount)")
            .fontWeight(.semibold)
        }
        .font(.title3)

        Text("浏览")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
      .padding(DesignTokens.Spacing.sm)
      .background(Color.blue.opacity(0.1))
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }
  }

  // MARK: - Description Section

  private var descriptionSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("描述", systemImage: "text.alignleft")
        .font(.headline)

      Text(submission.description)
        .font(.body)
        .lineSpacing(4)
    }
  }

  // MARK: - Local Tips Section

  private var hasLocalTips: Bool {
    submission.localTips != nil ||
    submission.bestTimeToVisit != nil ||
    submission.priceRange != nil ||
    submission.avoidTimes != nil
  }

  private var localTipsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("本地人建议", systemImage: "lightbulb.fill")
        .font(.headline)
        .foregroundStyle(.orange)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        if let tips = submission.localTips {
          HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "quote.opening")
              .foregroundStyle(.orange)
            Text(tips)
              .font(.subheadline)
          }
        }

        if let bestTime = submission.bestTimeToVisit {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "clock.fill")
              .foregroundStyle(.blue)
            Text("最佳时间: \(bestTime)")
              .font(.subheadline)
          }
        }

        if let priceRange = submission.priceRange {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "yensign.circle.fill")
              .foregroundStyle(.green)
            Text("价格范围: \(priceRange)")
              .font(.subheadline)
          }
        }

        if let avoidTimes = submission.avoidTimes {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
              .foregroundStyle(.red)
            Text("避开时间: \(avoidTimes)")
              .font(.subheadline)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.orange.opacity(0.08))
    )
  }

  // MARK: - Local Secrets Section

  private func localSecretsSection(_ secrets: [String]) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("本地秘密", systemImage: "key.fill")
        .font(.headline)
        .foregroundStyle(.purple)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        ForEach(secrets, id: \.self) { secret in
          HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "sparkle")
              .foregroundStyle(.purple)
              .font(.caption)
            Text(secret)
              .font(.subheadline)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.purple.opacity(0.08))
    )
  }

  // MARK: - Discovery Section

  private func discoverySection(_ howDiscovered: String) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("发现故事", systemImage: "book.fill")
        .font(.headline)
        .foregroundStyle(.teal)

      Text(howDiscovered)
        .font(.subheadline)
        .italic()
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.teal.opacity(0.08))
    )
  }

  // MARK: - Map Section

  private var mapSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("位置", systemImage: "map")
        .font(.headline)

      Map(position: $cameraPosition) {
        Marker(submission.name, coordinate: CLLocationCoordinate2D(
          latitude: submission.latitude,
          longitude: submission.longitude
        ))
        .tint(.red)
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

  // MARK: - Voting Section

  private var votingSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("投票", systemImage: "hand.thumbsup")
        .font(.headline)

      Text("你觉得这个景点值得推荐吗?")
        .font(.subheadline)
        .foregroundStyle(.secondary)

      HStack(spacing: DesignTokens.Spacing.md) {
        // Upvote button
        Button {
          vote(type: "up")
        } label: {
          HStack {
            Image(systemName: "hand.thumbsup.fill")
            Text("值得一去")
          }
          .font(.subheadline)
          .fontWeight(.medium)
          .frame(maxWidth: .infinity)
          .padding(DesignTokens.Spacing.sm)
        }
        .buttonStyle(.bordered)
        .tint(.green)
        .disabled(isVoting)

        // Downvote button
        Button {
          vote(type: "down")
        } label: {
          HStack {
            Image(systemName: "hand.thumbsdown.fill")
            Text("不推荐")
          }
          .font(.subheadline)
          .fontWeight(.medium)
          .frame(maxWidth: .infinity)
          .padding(DesignTokens.Spacing.sm)
        }
        .buttonStyle(.bordered)
        .tint(.red)
        .disabled(isVoting)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .subtleCardStyle(radius: DesignTokens.Radius.md)
  }

  // MARK: - Moderator Notes Section

  private func moderatorNotesSection(_ notes: String) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("审核备注", systemImage: "exclamationmark.bubble.fill")
        .font(.headline)
        .foregroundStyle(.red)

      Text(notes)
        .font(.subheadline)
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.red.opacity(0.08))
    )
  }

  // MARK: - Helpers

  private func formatDate(_ timestamp: Double) -> String {
    let date = Date(timeIntervalSince1970: timestamp)
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .none
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: date)
  }

  private func vote(type: String) {
    isVoting = true
    Task {
      _ = await store.vote(poiId: submission.id, voteType: type)
      isVoting = false
    }
  }

  private func openInMaps() {
    let coordinate = CLLocationCoordinate2D(latitude: submission.latitude, longitude: submission.longitude)
    let placemark = MKPlacemark(coordinate: coordinate)
    let mapItem = MKMapItem(placemark: placemark)
    mapItem.name = submission.name
    mapItem.openInMaps(launchOptions: [
      MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDefault
    ])
  }
}

// MARK: - Submission Status Badge

struct SubmissionStatusBadge: View {
  let status: SubmissionStatus

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: status.icon)
      Text(status.displayName)
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
    switch status {
    case .pending: return .orange
    case .approved: return .green
    case .rejected: return .red
    case .merged: return .blue
    }
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    UserSubmissionDetailView(submission: UserSubmittedPoi(
      id: "1",
      userId: "user1",
      name: "隐秘花园咖啡",
      nameEn: "Secret Garden Cafe",
      category: .restaurant,
      cityId: "shanghai",
      address: "上海市静安区某某路123号",
      latitude: 31.2304,
      longitude: 121.4737,
      description: "这是一家藏在老洋房里的咖啡馆，环境非常安静，适合工作和阅读。咖啡品质很高，甜点也很不错。",
      localTips: "周末人比较多，建议工作日下午来",
      bestTimeToVisit: "下午2-5点",
      priceRange: "人均50-80元",
      imageUrls: nil,
      howDiscovered: "偶然路过发现的，被门口的绿植吸引进去",
      localSecrets: ["二楼有个隐藏的露台", "点单时说是老客户可以打9折"],
      avoidTimes: "周末下午",
      status: .approved,
      moderatorNotes: nil,
      reviewedBy: nil,
      reviewedAt: nil,
      mergedPoiId: nil,
      upvotes: 42,
      downvotes: 3,
      viewCount: 256,
      createdAt: Date().timeIntervalSince1970 - 86400 * 7,
      updatedAt: nil
    ))
  }
}
