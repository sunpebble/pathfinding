import SwiftUI

/// Main view for browsing all recorded travel videos
struct VideoGalleryView: View {
  @State private var videoManager = VideoRecordingManager.shared
  @State private var albumStore = VideoAlbumStore.shared

  // View state
  @State private var selectedTab = 0
  @State private var sortOrder: VideoSortOrder = .newest
  @State private var filterCategory: VideoCategory?
  @State private var searchText = ""
  @State private var viewMode: VideoViewMode = .grid

  // Navigation
  @State private var selectedVideo: TravelVideo?
  @State private var showingRecording = false
  @State private var showingAlbums = false

  private var filteredVideos: [TravelVideo] {
    var videos = videoManager.videos

    // Search filter
    if !searchText.isEmpty {
      videos = videos.filter { video in
        video.title.localizedCaseInsensitiveContains(searchText) ||
        video.tags.contains { $0.localizedCaseInsensitiveContains(searchText) } ||
        (video.description?.localizedCaseInsensitiveContains(searchText) ?? false)
      }
    }

    // Category filter
    if let category = filterCategory {
      videos = videos.filter { $0.category == category }
    }

    // Sort
    switch sortOrder {
    case .newest:
      videos.sort { $0.createdAt > $1.createdAt }
    case .oldest:
      videos.sort { $0.createdAt < $1.createdAt }
    case .longest:
      videos.sort { $0.duration > $1.duration }
    case .shortest:
      videos.sort { $0.duration < $1.duration }
    case .largest:
      videos.sort { $0.fileSize > $1.fileSize }
    case .mostViewed:
      videos.sort { $0.viewsCount > $1.viewsCount }
    }

    return videos
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Category picker
        categoryPicker

        // Content
        if videoManager.videos.isEmpty {
          emptyState
        } else if filteredVideos.isEmpty {
          noResultsView
        } else {
          videoContent
        }
      }
      .navigationTitle("我的视频")
      .searchable(text: $searchText, prompt: "搜索视频")
      .toolbar {
        ToolbarItemGroup(placement: .primaryAction) {
          Menu {
            Picker("排序", selection: $sortOrder) {
              ForEach(VideoSortOrder.allCases, id: \.self) { order in
                Label(order.displayName, systemImage: order.icon)
                  .tag(order)
              }
            }

            Divider()

            Picker("视图", selection: $viewMode) {
              Label("网格", systemImage: "square.grid.2x2")
                .tag(VideoViewMode.grid)
              Label("列表", systemImage: "list.bullet")
                .tag(VideoViewMode.list)
            }
          } label: {
            Image(systemName: "arrow.up.arrow.down")
          }

          Button {
            showingAlbums = true
          } label: {
            Image(systemName: "rectangle.stack")
          }

          Button {
            showingRecording = true
          } label: {
            Image(systemName: "video.badge.plus")
          }
        }
      }
      .sheet(item: $selectedVideo) { video in
        VideoPlayerView(video: video)
      }
      .fullScreenCover(isPresented: $showingRecording) {
        VideoRecordingView()
      }
      .sheet(isPresented: $showingAlbums) {
        VideoAlbumListView()
      }
    }
  }

  // MARK: - Category Picker

  private var categoryPicker: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 8) {
        CategoryChip(
          title: "全部",
          icon: "film",
          isSelected: filterCategory == nil
        ) {
          filterCategory = nil
        }

        ForEach(VideoCategory.allCases, id: \.self) { category in
          CategoryChip(
            title: category.displayName,
            icon: category.icon,
            isSelected: filterCategory == category
          ) {
            if filterCategory == category {
              filterCategory = nil
            } else {
              filterCategory = category
            }
          }
        }
      }
      .padding(.horizontal)
      .padding(.vertical, 8)
    }
    .background(Color(.systemBackground))
  }

  // MARK: - Empty State

  private var emptyState: some View {
    ContentUnavailableView {
      Label("暂无视频", systemImage: "video.slash")
    } description: {
      Text("开始录制你的旅行视频")
    } actions: {
      Button {
        showingRecording = true
      } label: {
        Label("录制视频", systemImage: "video")
      }
      .buttonStyle(.borderedProminent)
    }
  }

  // MARK: - No Results

  private var noResultsView: some View {
    ContentUnavailableView.search(text: searchText)
  }

  // MARK: - Video Content

  @ViewBuilder
  private var videoContent: some View {
    switch viewMode {
    case .grid:
      videoGrid
    case .list:
      videoList
    }
  }

  private var videoGrid: some View {
    ScrollView {
      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 160), spacing: 12)],
        spacing: 12
      ) {
        ForEach(filteredVideos) { video in
          VideoGridCard(video: video) {
            selectedVideo = video
          }
        }
      }
      .padding()
    }
  }

  private var videoList: some View {
    List(filteredVideos) { video in
      VideoListRow(video: video)
        .contentShape(Rectangle())
        .onTapGesture {
          selectedVideo = video
        }
    }
    .listStyle(.plain)
  }
}

// MARK: - Category Chip

struct CategoryChip: View {
  let title: String
  let icon: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: 4) {
        Image(systemName: icon)
          .font(.caption)
        Text(title)
          .font(.subheadline)
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .background(isSelected ? Color.blue : Color(.systemGray5))
      .foregroundStyle(isSelected ? .white : .primary)
      .clipShape(Capsule())
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Video Grid Card

struct VideoGridCard: View {
  let video: TravelVideo
  let onTap: () -> Void

  @State private var showingEditor = false

  var body: some View {
    Button(action: onTap) {
      VStack(alignment: .leading, spacing: 8) {
        // Thumbnail
        thumbnailView
          .aspectRatio(9 / 16, contentMode: .fill)
          .clipShape(RoundedRectangle(cornerRadius: 12))

        // Info
        VStack(alignment: .leading, spacing: 4) {
          Text(video.title)
            .font(.subheadline.weight(.medium))
            .foregroundStyle(.primary)
            .lineLimit(1)

          HStack {
            Label(video.formattedDuration, systemImage: "clock")
            Spacer()
            Label(video.category.displayName, systemImage: video.category.icon)
          }
          .font(.caption2)
          .foregroundStyle(.secondary)
        }
      }
    }
    .buttonStyle(.plain)
    .contextMenu {
      Button {
        showingEditor = true
      } label: {
        Label("编辑", systemImage: "slider.horizontal.3")
      }

      Button {
        // Share action handled in sheet
      } label: {
        Label("分享", systemImage: "square.and.arrow.up")
      }

      Divider()

      Button(role: .destructive) {
        VideoRecordingManager.shared.deleteVideo(video)
      } label: {
        Label("删除", systemImage: "trash")
      }
    }
    .sheet(isPresented: $showingEditor) {
      VideoEditorView(video: video)
    }
  }

  @ViewBuilder
  private var thumbnailView: some View {
    ZStack(alignment: .bottomTrailing) {
      if let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video),
         let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
        Image(uiImage: uiImage)
          .resizable()
          .scaledToFill()
      } else {
        ZStack {
          Color.gray.opacity(0.3)
          Image(systemName: "video.fill")
            .font(.largeTitle)
            .foregroundStyle(.tertiary)
        }
      }

      // Duration badge
      Text(video.formattedDuration)
        .font(.caption2.monospacedDigit())
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .padding(6)

      // Play icon overlay
      Image(systemName: "play.fill")
        .font(.title)
        .foregroundStyle(.white)
        .shadow(radius: 4)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
}

// MARK: - Video List Row

struct VideoListRow: View {
  let video: TravelVideo

  var body: some View {
    HStack(spacing: 12) {
      // Thumbnail
      thumbnailView
        .frame(width: 100, height: 75)
        .clipShape(RoundedRectangle(cornerRadius: 8))

      // Info
      VStack(alignment: .leading, spacing: 4) {
        Text(video.title)
          .font(.headline)
          .lineLimit(1)

        HStack(spacing: 8) {
          Label(video.formattedDuration, systemImage: "clock")
          Label(video.formattedFileSize, systemImage: "doc")
        }
        .font(.caption)
        .foregroundStyle(.secondary)

        HStack(spacing: 8) {
          Label(video.category.displayName, systemImage: video.category.icon)
          Text(video.shortDate)
        }
        .font(.caption2)
        .foregroundStyle(.tertiary)
      }

      Spacer()

      Image(systemName: "chevron.right")
        .font(.caption)
        .foregroundStyle(.tertiary)
    }
    .padding(.vertical, 4)
  }

  @ViewBuilder
  private var thumbnailView: some View {
    if let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video),
       let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
      Image(uiImage: uiImage)
        .resizable()
        .scaledToFill()
    } else {
      ZStack {
        Color.gray.opacity(0.3)
        Image(systemName: "video.fill")
          .foregroundStyle(.tertiary)
      }
    }
  }
}

// MARK: - Supporting Types

enum VideoSortOrder: String, CaseIterable {
  case newest
  case oldest
  case longest
  case shortest
  case largest
  case mostViewed

  var displayName: String {
    switch self {
    case .newest: return "最新"
    case .oldest: return "最早"
    case .longest: return "最长"
    case .shortest: return "最短"
    case .largest: return "最大"
    case .mostViewed: return "最热"
    }
  }

  var icon: String {
    switch self {
    case .newest: return "clock.arrow.circlepath"
    case .oldest: return "clock"
    case .longest: return "timer"
    case .shortest: return "bolt"
    case .largest: return "doc.fill"
    case .mostViewed: return "eye"
    }
  }
}

enum VideoViewMode: String {
  case grid
  case list
}

// MARK: - Preview

#Preview {
  VideoGalleryView()
}
