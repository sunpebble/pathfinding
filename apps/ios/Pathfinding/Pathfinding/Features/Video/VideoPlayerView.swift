import AVFoundation
import SwiftUI

/// Full-screen video player with playback controls
struct VideoPlayerView: View {
  @Environment(\.dismiss) private var dismiss

  let video: TravelVideo

  @State private var player: AVPlayer?
  @State private var isPlaying = false
  @State private var currentTime: TimeInterval = 0
  @State private var duration: TimeInterval = 0
  @State private var isSeeking = false
  @State private var showControls = true
  @State private var controlsTimer: Timer?

  // Sheets
  @State private var showingShareSheet = false
  @State private var showingEditor = false
  @State private var showingInfo = false
  @State private var showingDeleteConfirmation = false

  var body: some View {
    NavigationStack {
      GeometryReader { geometry in
        ZStack {
          Color.black.ignoresSafeArea()

          // Video player
          if let player = player {
            VideoPlayerRepresentable(player: player)
              .aspectRatio(video.aspectRatio, contentMode: .fit)
              .frame(maxWidth: geometry.size.width, maxHeight: geometry.size.height)
          }

          // Controls overlay
          if showControls {
            controlsOverlay
          }
        }
        .onTapGesture {
          withAnimation(.easeInOut(duration: 0.2)) {
            showControls.toggle()
          }
          resetControlsTimer()
        }
      }
      .navigationBarHidden(true)
      .onAppear {
        setupPlayer()
      }
      .onDisappear {
        player?.pause()
        controlsTimer?.invalidate()
      }
      .sheet(isPresented: $showingShareSheet) {
        VideoShareSheet(video: video)
      }
      .sheet(isPresented: $showingEditor) {
        VideoEditorView(video: video)
      }
      .sheet(isPresented: $showingInfo) {
        VideoInfoSheet(video: video)
      }
      .confirmationDialog("删除视频", isPresented: $showingDeleteConfirmation) {
        Button("删除", role: .destructive) {
          VideoRecordingManager.shared.deleteVideo(video)
          dismiss()
        }
        Button("取消", role: .cancel) {}
      } message: {
        Text("此操作不可撤销。")
      }
    }
  }

  // MARK: - Controls Overlay

  private var controlsOverlay: some View {
    VStack {
      // Top bar
      topBar
        .padding(.horizontal)
        .padding(.top, 8)

      Spacer()

      // Center play button
      Button {
        togglePlayback()
      } label: {
        Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
          .font(.system(size: 72))
          .foregroundStyle(.white)
          .shadow(radius: 4)
      }

      Spacer()

      // Bottom controls
      bottomControls
        .padding(.horizontal)
        .padding(.bottom, 16)
    }
    .background(
      LinearGradient(
        colors: [.black.opacity(0.6), .clear, .clear, .black.opacity(0.6)],
        startPoint: .top,
        endPoint: .bottom
      )
      .ignoresSafeArea()
    )
  }

  // MARK: - Top Bar

  private var topBar: some View {
    HStack {
      Button {
        dismiss()
      } label: {
        Image(systemName: "xmark")
          .font(.title2)
          .foregroundStyle(.white)
          .padding(12)
          .background(.ultraThinMaterial, in: Circle())
      }

      Spacer()

      Text(video.title)
        .font(.headline)
        .foregroundStyle(.white)
        .lineLimit(1)

      Spacer()

      Menu {
        Button {
          showingEditor = true
        } label: {
          Label("编辑", systemImage: "slider.horizontal.3")
        }

        Button {
          showingShareSheet = true
        } label: {
          Label("分享", systemImage: "square.and.arrow.up")
        }

        Button {
          showingInfo = true
        } label: {
          Label("详情", systemImage: "info.circle")
        }

        Divider()

        Button(role: .destructive) {
          showingDeleteConfirmation = true
        } label: {
          Label("删除", systemImage: "trash")
        }
      } label: {
        Image(systemName: "ellipsis")
          .font(.title2)
          .foregroundStyle(.white)
          .padding(12)
          .background(.ultraThinMaterial, in: Circle())
      }
    }
  }

  // MARK: - Bottom Controls

  private var bottomControls: some View {
    VStack(spacing: 12) {
      // Progress bar
      HStack(spacing: 12) {
        Text(formatTime(currentTime))
          .font(.caption.monospacedDigit())
          .foregroundStyle(.white)

        Slider(
          value: Binding(
            get: { currentTime },
            set: { newValue in
              currentTime = newValue
              seekTo(newValue)
            }
          ),
          in: 0...max(duration, 0.01)
        )
        .tint(.white)

        Text(formatTime(duration))
          .font(.caption.monospacedDigit())
          .foregroundStyle(.white)
      }

      // Playback controls
      HStack(spacing: 32) {
        // Skip back 10s
        Button {
          skip(seconds: -10)
        } label: {
          Image(systemName: "gobackward.10")
            .font(.title2)
            .foregroundStyle(.white)
        }

        // Play/Pause
        Button {
          togglePlayback()
        } label: {
          Image(systemName: isPlaying ? "pause.fill" : "play.fill")
            .font(.title)
            .foregroundStyle(.white)
            .frame(width: 44, height: 44)
        }

        // Skip forward 10s
        Button {
          skip(seconds: 10)
        } label: {
          Image(systemName: "goforward.10")
            .font(.title2)
            .foregroundStyle(.white)
        }
      }
    }
    .padding()
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
  }

  // MARK: - Helpers

  private func setupPlayer() {
    let videoURL = VideoRecordingManager.shared.fileURL(for: video)
    player = AVPlayer(url: videoURL)

    // Get duration
    Task {
      if let asset = player?.currentItem?.asset {
        let assetDuration = try? await asset.load(.duration)
        await MainActor.run {
          duration = assetDuration?.seconds ?? video.duration
        }
      }
    }

    // Time observer
    player?.addPeriodicTimeObserver(
      forInterval: CMTime(seconds: 0.1, preferredTimescale: 600),
      queue: .main
    ) { time in
      Task { @MainActor in
        if !isSeeking {
          currentTime = time.seconds
        }
      }
    }

    // Loop playback
    NotificationCenter.default.addObserver(
      forName: .AVPlayerItemDidPlayToEndTime,
      object: player?.currentItem,
      queue: .main
    ) { _ in
      Task { @MainActor in
        isPlaying = false
      }
    }

    resetControlsTimer()
  }

  private func togglePlayback() {
    if isPlaying {
      player?.pause()
    } else {
      player?.play()
    }
    isPlaying.toggle()
    resetControlsTimer()
  }

  private func seekTo(_ time: TimeInterval) {
    isSeeking = true
    let cmTime = CMTime(seconds: time, preferredTimescale: 600)
    player?.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero) { _ in
      Task { @MainActor in
        isSeeking = false
      }
    }
  }

  private func skip(seconds: Double) {
    let newTime = max(0, min(currentTime + seconds, duration))
    seekTo(newTime)
    currentTime = newTime
  }

  private func formatTime(_ time: TimeInterval) -> String {
    let minutes = Int(time) / 60
    let seconds = Int(time) % 60
    return String(format: "%02d:%02d", minutes, seconds)
  }

  private func resetControlsTimer() {
    controlsTimer?.invalidate()
    controlsTimer = Timer.scheduledTimer(withTimeInterval: 3, repeats: false) { _ in
      Task { @MainActor in
        if isPlaying {
          withAnimation(.easeInOut(duration: 0.3)) {
            showControls = false
          }
        }
      }
    }
  }
}

// MARK: - Video Player Representable

struct VideoPlayerRepresentable: UIViewControllerRepresentable {
  let player: AVPlayer

  func makeUIViewController(context: Context) -> AVPlayerViewController {
    let controller = AVPlayerViewController()
    controller.player = player
    controller.showsPlaybackControls = false
    controller.videoGravity = .resizeAspect
    return controller
  }

  func updateUIViewController(_ uiViewController: AVPlayerViewController, context: Context) {
    uiViewController.player = player
  }
}

// MARK: - AVPlayerViewController Import

import AVKit

// MARK: - Video Share Sheet

struct VideoShareSheet: View {
  @Environment(\.dismiss) private var dismiss

  let video: TravelVideo

  @State private var shareItems: [Any] = []
  @State private var showingActivityView = false
  @State private var isExporting = false
  @State private var exportProgress: Float = 0

  var body: some View {
    NavigationStack {
      Form {
        Section {
          // Thumbnail
          if let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video),
             let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
            Image(uiImage: uiImage)
              .resizable()
              .aspectRatio(contentMode: .fit)
              .frame(maxHeight: 200)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }

          LabeledContent("标题", value: video.title)
          LabeledContent("时长", value: video.formattedDuration)
          LabeledContent("大小", value: video.formattedFileSize)
        }

        Section("分享选项") {
          Button {
            shareOriginal()
          } label: {
            Label("分享原始视频", systemImage: "film")
          }

          Button {
            shareWithWatermark()
          } label: {
            Label("分享（带水印）", systemImage: "text.badge.checkmark")
          }
          .disabled(isExporting)

          Button {
            saveToPhotos()
          } label: {
            Label("保存到相册", systemImage: "square.and.arrow.down")
          }
        }

        if isExporting {
          Section {
            ProgressView(value: exportProgress)
            Text("正在导出...")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
      .navigationTitle("分享视频")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("完成") {
            dismiss()
          }
        }
      }
      .sheet(isPresented: $showingActivityView) {
        ActivityView(activityItems: shareItems)
      }
    }
  }

  private func shareOriginal() {
    let videoURL = VideoRecordingManager.shared.fileURL(for: video)
    shareItems = [videoURL]
    showingActivityView = true
  }

  private func shareWithWatermark() {
    isExporting = true
    Task {
      do {
        let editorManager = VideoEditorManager.shared
        try await editorManager.loadVideo(video)

        let settings = VideoExportSettings(
          quality: video.quality,
          includeWatermark: true,
          watermarkText: "探路 Pathfinding",
          includeLocation: video.location != nil,
          includeDate: true
        )

        let exportURL = try await editorManager.exportVideo(settings: settings)
        await MainActor.run {
          shareItems = [exportURL]
          isExporting = false
          showingActivityView = true
        }
      } catch {
        await MainActor.run {
          isExporting = false
        }
      }
    }
  }

  private func saveToPhotos() {
    Task {
      do {
        try await VideoRecordingManager.shared.saveToPhotoLibrary(video)
        await MainActor.run {
          dismiss()
        }
      } catch {
        // Handle error silently
      }
    }
  }
}

// MARK: - Activity View

struct ActivityView: UIViewControllerRepresentable {
  let activityItems: [Any]

  func makeUIViewController(context: Context) -> UIActivityViewController {
    UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
  }

  func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Video Info Sheet

struct VideoInfoSheet: View {
  @Environment(\.dismiss) private var dismiss

  let video: TravelVideo

  var body: some View {
    NavigationStack {
      List {
        Section("基本信息") {
          LabeledContent("标题", value: video.title)

          if let description = video.description {
            LabeledContent("描述", value: description)
          }

          LabeledContent("类别", value: video.category.displayName)
          LabeledContent("可见性", value: video.visibility.displayName)
        }

        Section("视频信息") {
          LabeledContent("时长", value: video.formattedDuration)
          LabeledContent("分辨率", value: "\(video.width) x \(video.height)")
          LabeledContent("质量", value: video.quality.displayName)
          LabeledContent("大小", value: video.formattedFileSize)
        }

        Section("时间") {
          LabeledContent("录制时间", value: video.formattedDate)

          if let updatedAt = video.updatedAt {
            LabeledContent("修改时间", value: formatUpdatedDate(updatedAt))
          }
        }

        if let location = video.location {
          Section("位置") {
            if let address = location.address {
              LabeledContent("地址", value: address)
            }
            LabeledContent("坐标", value: String(format: "%.4f, %.4f", location.latitude, location.longitude))
          }
        }

        if !video.tags.isEmpty {
          Section("标签") {
            FlowLayout(spacing: 8) {
              ForEach(video.tags, id: \.self) { tag in
                Text(tag)
                  .font(.caption)
                  .padding(.horizontal, 8)
                  .padding(.vertical, 4)
                  .background(.blue.opacity(0.1))
                  .foregroundStyle(.blue)
                  .clipShape(Capsule())
              }
            }
          }
        }

        if video.isAssociated {
          Section("关联") {
            if let itineraryId = video.itineraryId {
              LabeledContent("行程ID", value: itineraryId)
            }
            if let poiId = video.poiId {
              LabeledContent("POI ID", value: poiId)
            }
            if let dayNumber = video.dayNumber {
              LabeledContent("日程", value: "第 \(dayNumber) 天")
            }
          }
        }

        Section("统计") {
          LabeledContent("浏览", value: "\(video.viewsCount)")
          LabeledContent("点赞", value: "\(video.likesCount)")
          LabeledContent("评论", value: "\(video.commentsCount)")
        }
      }
      .navigationTitle("视频详情")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("完成") {
            dismiss()
          }
        }
      }
    }
  }

  private func formatUpdatedDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter.string(from: date)
  }
}

// MARK: - Preview

#Preview {
  VideoPlayerView(video: .preview)
}
