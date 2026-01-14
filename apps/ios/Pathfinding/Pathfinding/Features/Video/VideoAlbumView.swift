import SwiftUI

/// Main view for browsing and managing video albums
struct VideoAlbumListView: View {
  @State private var albumStore = VideoAlbumStore.shared
  @State private var videoManager = VideoRecordingManager.shared

  @State private var showingCreateAlbum = false
  @State private var selectedAlbum: VideoAlbum?
  @State private var showingDeleteConfirmation = false
  @State private var albumToDelete: VideoAlbum?

  var body: some View {
    NavigationStack {
      Group {
        if albumStore.albums.isEmpty {
          emptyState
        } else {
          albumList
        }
      }
      .navigationTitle("视频相册")
      .toolbar {
        ToolbarItem(placement: .primaryAction) {
          Button {
            showingCreateAlbum = true
          } label: {
            Image(systemName: "plus")
          }
        }

        ToolbarItem(placement: .secondaryAction) {
          Button {
            albumStore.createAutoAlbums()
          } label: {
            Label("自动创建相册", systemImage: "wand.and.stars")
          }
        }
      }
      .sheet(isPresented: $showingCreateAlbum) {
        CreateAlbumSheet { name, description in
          albumStore.createAlbum(name: name, description: description)
        }
      }
      .navigationDestination(item: $selectedAlbum) { album in
        VideoAlbumDetailView(album: album)
      }
      .confirmationDialog(
        "删除相册",
        isPresented: $showingDeleteConfirmation,
        titleVisibility: .visible
      ) {
        Button("删除", role: .destructive) {
          if let album = albumToDelete {
            albumStore.deleteAlbum(album)
          }
        }
        Button("取消", role: .cancel) {}
      } message: {
        Text("删除相册不会删除其中的视频。")
      }
    }
  }

  // MARK: - Empty State

  private var emptyState: some View {
    ContentUnavailableView {
      Label("暂无相册", systemImage: "rectangle.stack.fill")
    } description: {
      Text("创建相册来整理你的旅行视频")
    } actions: {
      Button {
        showingCreateAlbum = true
      } label: {
        Text("创建相册")
      }
      .buttonStyle(.borderedProminent)
    }
  }

  // MARK: - Album List

  private var albumList: some View {
    ScrollView {
      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 160), spacing: 16)],
        spacing: 16
      ) {
        ForEach(albumStore.albums) { album in
          AlbumCard(album: album) {
            selectedAlbum = album
          }
          .contextMenu {
            Button {
              selectedAlbum = album
            } label: {
              Label("打开", systemImage: "folder")
            }

            Button {
              albumToDelete = album
              showingDeleteConfirmation = true
            } label: {
              Label("删除", systemImage: "trash")
            }
          }
        }
      }
      .padding()
    }
  }
}

// MARK: - Album Card

struct AlbumCard: View {
  let album: VideoAlbum
  let onTap: () -> Void

  @State private var albumStore = VideoAlbumStore.shared

  var body: some View {
    Button(action: onTap) {
      VStack(alignment: .leading, spacing: 8) {
        // Cover image
        coverImage
          .aspectRatio(4 / 3, contentMode: .fill)
          .clipShape(RoundedRectangle(cornerRadius: 12))

        // Info
        VStack(alignment: .leading, spacing: 4) {
          Text(album.name)
            .font(.headline)
            .foregroundStyle(.primary)
            .lineLimit(1)

          HStack {
            Text("\(album.videoCount) 个视频")
              .font(.caption)
              .foregroundStyle(.secondary)

            Spacer()

            Text(album.formattedDate)
              .font(.caption2)
              .foregroundStyle(.tertiary)
          }
        }
      }
    }
    .buttonStyle(.plain)
  }

  @ViewBuilder
  private var coverImage: some View {
    if let coverVideo = albumStore.coverVideo(for: album),
       let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: coverVideo),
       let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
      Image(uiImage: uiImage)
        .resizable()
        .scaledToFill()
    } else {
      ZStack {
        Color.gray.opacity(0.2)
        Image(systemName: "rectangle.stack.fill")
          .font(.largeTitle)
          .foregroundStyle(.tertiary)
      }
    }
  }
}

// MARK: - Create Album Sheet

struct CreateAlbumSheet: View {
  @Environment(\.dismiss) private var dismiss

  @State private var name = ""
  @State private var description = ""

  let onCreate: (String, String?) -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("相册名称", text: $name)
        }

        Section("描述（可选）") {
          TextField("添加描述", text: $description, axis: .vertical)
            .lineLimit(3...6)
        }
      }
      .navigationTitle("创建相册")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("创建") {
            onCreate(name, description.isEmpty ? nil : description)
            dismiss()
          }
          .disabled(name.isEmpty)
        }
      }
    }
  }
}

// MARK: - Album Detail View

struct VideoAlbumDetailView: View {
  let album: VideoAlbum

  @State private var albumStore = VideoAlbumStore.shared
  @State private var videoManager = VideoRecordingManager.shared

  @State private var showingAddVideos = false
  @State private var showingEditAlbum = false
  @State private var selectedVideo: TravelVideo?
  @State private var isEditing = false

  private var videos: [TravelVideo] {
    albumStore.videos(in: album)
  }

  var body: some View {
    Group {
      if videos.isEmpty {
        emptyState
      } else {
        videoGrid
      }
    }
    .navigationTitle(album.name)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Menu {
          Button {
            showingAddVideos = true
          } label: {
            Label("添加视频", systemImage: "plus")
          }

          Button {
            showingEditAlbum = true
          } label: {
            Label("编辑相册", systemImage: "pencil")
          }

          Button {
            isEditing.toggle()
          } label: {
            Label(isEditing ? "完成" : "管理视频", systemImage: "checkmark.circle")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
      }
    }
    .sheet(isPresented: $showingAddVideos) {
      AddVideosToAlbumSheet(album: album)
    }
    .sheet(isPresented: $showingEditAlbum) {
      EditAlbumSheet(album: album)
    }
    .sheet(item: $selectedVideo) { video in
      VideoPlayerView(video: video)
    }
    .environment(\.editMode, .constant(isEditing ? .active : .inactive))
  }

  // MARK: - Empty State

  private var emptyState: some View {
    ContentUnavailableView {
      Label("暂无视频", systemImage: "video.slash")
    } description: {
      Text("添加视频到这个相册")
    } actions: {
      Button {
        showingAddVideos = true
      } label: {
        Text("添加视频")
      }
      .buttonStyle(.borderedProminent)
    }
  }

  // MARK: - Video Grid

  private var videoGrid: some View {
    ScrollView {
      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 120), spacing: 8)],
        spacing: 8
      ) {
        ForEach(videos) { video in
          VideoThumbnailCard(
            video: video,
            isEditing: isEditing,
            isCover: album.coverVideoId == video.id
          ) {
            if isEditing {
              albumStore.removeVideo(video, from: album)
            } else {
              selectedVideo = video
            }
          } onSetCover: {
            albumStore.setCover(video: video, for: album)
          }
        }
      }
      .padding()
    }
  }
}

// MARK: - Video Thumbnail Card

struct VideoThumbnailCard: View {
  let video: TravelVideo
  let isEditing: Bool
  let isCover: Bool
  let onTap: () -> Void
  let onSetCover: () -> Void

  var body: some View {
    Button(action: onTap) {
      ZStack(alignment: .topTrailing) {
        // Thumbnail
        thumbnailImage
          .aspectRatio(9 / 16, contentMode: .fill)
          .clipShape(RoundedRectangle(cornerRadius: 8))
          .overlay(alignment: .bottomLeading) {
            HStack(spacing: 4) {
              Image(systemName: "play.fill")
                .font(.caption2)
              Text(video.formattedDuration)
                .font(.caption2)
            }
            .padding(4)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 4))
            .padding(4)
          }
          .overlay(alignment: .topLeading) {
            if isCover {
              Text("封面")
                .font(.caption2)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(.blue)
                .foregroundStyle(.white)
                .clipShape(Capsule())
                .padding(4)
            }
          }

        // Edit mode overlay
        if isEditing {
          Button {
            onTap()
          } label: {
            Image(systemName: "minus.circle.fill")
              .font(.title2)
              .foregroundStyle(.white, .red)
          }
          .offset(x: 4, y: -4)
        }
      }
    }
    .buttonStyle(.plain)
    .contextMenu {
      Button(action: onSetCover) {
        Label("设为封面", systemImage: "photo")
      }

      Button(role: .destructive, action: onTap) {
        Label("从相册移除", systemImage: "minus.circle")
      }
    }
  }

  @ViewBuilder
  private var thumbnailImage: some View {
    if let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video),
       let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
      Image(uiImage: uiImage)
        .resizable()
        .scaledToFill()
    } else {
      ZStack {
        Color.gray.opacity(0.3)
        Image(systemName: "video.fill")
          .foregroundStyle(.secondary)
      }
    }
  }
}

// MARK: - Add Videos Sheet

struct AddVideosToAlbumSheet: View {
  @Environment(\.dismiss) private var dismiss

  let album: VideoAlbum

  @State private var albumStore = VideoAlbumStore.shared
  @State private var videoManager = VideoRecordingManager.shared
  @State private var selectedVideos: Set<UUID> = []

  private var availableVideos: [TravelVideo] {
    let albumVideoIds = Set(album.videoIds)
    return videoManager.videos.filter { !albumVideoIds.contains($0.id) }
  }

  var body: some View {
    NavigationStack {
      Group {
        if availableVideos.isEmpty {
          ContentUnavailableView {
            Label("没有可添加的视频", systemImage: "video.slash")
          } description: {
            Text("所有视频都已在此相册中")
          }
        } else {
          videoSelectionGrid
        }
      }
      .navigationTitle("添加视频")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("添加 (\(selectedVideos.count))") {
            let videosToAdd = availableVideos.filter { selectedVideos.contains($0.id) }
            albumStore.addVideos(videosToAdd, to: album)
            dismiss()
          }
          .disabled(selectedVideos.isEmpty)
        }
      }
    }
  }

  private var videoSelectionGrid: some View {
    ScrollView {
      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 100), spacing: 8)],
        spacing: 8
      ) {
        ForEach(availableVideos) { video in
          SelectableVideoCard(
            video: video,
            isSelected: selectedVideos.contains(video.id)
          ) {
            if selectedVideos.contains(video.id) {
              selectedVideos.remove(video.id)
            } else {
              selectedVideos.insert(video.id)
            }
          }
        }
      }
      .padding()
    }
  }
}

// MARK: - Selectable Video Card

struct SelectableVideoCard: View {
  let video: TravelVideo
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      ZStack(alignment: .topTrailing) {
        thumbnailImage
          .aspectRatio(9 / 16, contentMode: .fill)
          .clipShape(RoundedRectangle(cornerRadius: 8))
          .overlay {
            if isSelected {
              RoundedRectangle(cornerRadius: 8)
                .stroke(.blue, lineWidth: 3)
            }
          }

        Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
          .font(.title2)
          .foregroundStyle(isSelected ? .blue : .white)
          .shadow(radius: 2)
          .padding(4)
      }
    }
    .buttonStyle(.plain)
  }

  @ViewBuilder
  private var thumbnailImage: some View {
    if let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video),
       let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
      Image(uiImage: uiImage)
        .resizable()
        .scaledToFill()
    } else {
      ZStack {
        Color.gray.opacity(0.3)
        Image(systemName: "video.fill")
          .foregroundStyle(.secondary)
      }
    }
  }
}

// MARK: - Edit Album Sheet

struct EditAlbumSheet: View {
  @Environment(\.dismiss) private var dismiss

  let album: VideoAlbum

  @State private var albumStore = VideoAlbumStore.shared
  @State private var name: String
  @State private var description: String

  init(album: VideoAlbum) {
    self.album = album
    _name = State(initialValue: album.name)
    _description = State(initialValue: album.description ?? "")
  }

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("相册名称", text: $name)
        }

        Section("描述") {
          TextField("添加描述", text: $description, axis: .vertical)
            .lineLimit(3...6)
        }

        Section {
          LabeledContent("视频数量", value: "\(album.videoCount)")
          LabeledContent("创建时间", value: album.formattedDate)
        }
      }
      .navigationTitle("编辑相册")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            var updatedAlbum = album
            updatedAlbum.name = name
            updatedAlbum.description = description.isEmpty ? nil : description
            albumStore.updateAlbum(updatedAlbum)
            dismiss()
          }
          .disabled(name.isEmpty)
        }
      }
    }
  }
}

// MARK: - Preview

#Preview {
  VideoAlbumListView()
}
