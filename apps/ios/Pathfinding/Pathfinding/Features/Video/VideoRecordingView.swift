import AVFoundation
import SwiftUI

/// Main view for recording travel videos
struct VideoRecordingView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var videoManager = VideoRecordingManager.shared

  // Recording state
  @State private var showingRecordedVideo = false
  @State private var recordedVideo: TravelVideo?
  @State private var showingSettings = false
  @State private var showingError = false

  // Association
  var itineraryId: String?
  var poiId: String?
  var dayNumber: Int?

  var body: some View {
    ZStack {
      // Camera preview
      CameraPreviewView(previewLayer: videoManager.previewLayer)
        .ignoresSafeArea()
        .onTapGesture(coordinateSpace: .local) { location in
          // Tap to focus
          if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
             let window = scene.windows.first,
             let view = window.rootViewController?.view {
            videoManager.focus(at: location, in: view)
          }
        }
        .gesture(
          MagnificationGesture()
            .onChanged { value in
              let newZoom = videoManager.zoomLevel * value
              videoManager.zoomLevel = min(max(newZoom, videoManager.minZoomLevel), videoManager.maxZoomLevel)
            }
        )

      // Overlay UI
      VStack {
        // Top bar
        topBar

        Spacer()

        // Recording duration
        if videoManager.isRecording {
          recordingIndicator
        }

        Spacer()

        // Bottom controls
        bottomControls
      }
      .padding()
    }
    .onAppear {
      setupCamera()
    }
    .onDisappear {
      videoManager.stopSession()
    }
    .sheet(isPresented: $showingRecordedVideo) {
      if let video = recordedVideo {
        VideoPreviewSheet(video: video, onSave: { updatedVideo in
          var videoToSave = updatedVideo
          videoToSave.itineraryId = itineraryId
          videoToSave.poiId = poiId
          videoToSave.dayNumber = dayNumber
          videoManager.updateVideo(videoToSave)
          dismiss()
        }, onDiscard: {
          videoManager.deleteVideo(video)
          showingRecordedVideo = false
        })
      }
    }
    .sheet(isPresented: $showingSettings) {
      VideoSettingsSheet(quality: $videoManager.videoQuality)
    }
    .alert("错误", isPresented: $showingError) {
      Button("确定", role: .cancel) {}
    } message: {
      Text(videoManager.errorMessage ?? "未知错误")
    }
  }

  // MARK: - Top Bar

  private var topBar: some View {
    HStack {
      // Close button
      Button {
        if videoManager.isRecording {
          videoManager.cancelRecording()
        }
        dismiss()
      } label: {
        Image(systemName: "xmark")
          .font(.title2)
          .foregroundStyle(.white)
          .padding(12)
          .background(.ultraThinMaterial, in: Circle())
      }

      Spacer()

      // Quality indicator
      Text(videoManager.videoQuality.displayName)
        .font(.caption)
        .foregroundStyle(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(.ultraThinMaterial, in: Capsule())

      Spacer()

      // Settings button
      Button {
        showingSettings = true
      } label: {
        Image(systemName: "gearshape")
          .font(.title2)
          .foregroundStyle(.white)
          .padding(12)
          .background(.ultraThinMaterial, in: Circle())
      }
      .disabled(videoManager.isRecording)
    }
  }

  // MARK: - Recording Indicator

  private var recordingIndicator: some View {
    HStack(spacing: 8) {
      Circle()
        .fill(.red)
        .frame(width: 12, height: 12)
        .opacity(videoManager.isRecording ? 1 : 0)
        .animation(.easeInOut(duration: 0.5).repeatForever(), value: videoManager.isRecording)

      Text(formatDuration(videoManager.recordingDuration))
        .font(.system(.title3, design: .monospaced))
        .foregroundStyle(.white)

      Text("/")
        .foregroundStyle(.white.opacity(0.6))

      Text(formatDuration(videoManager.maxDuration))
        .font(.system(.caption, design: .monospaced))
        .foregroundStyle(.white.opacity(0.6))
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 8)
    .background(.ultraThinMaterial, in: Capsule())
  }

  // MARK: - Bottom Controls

  private var bottomControls: some View {
    HStack(spacing: 40) {
      // Torch toggle
      Button {
        videoManager.torchMode = videoManager.torchMode == .off ? .on : .off
      } label: {
        Image(systemName: videoManager.torchMode == .on ? "bolt.fill" : "bolt.slash")
          .font(.title2)
          .foregroundStyle(videoManager.torchMode == .on ? .yellow : .white)
          .frame(width: 50, height: 50)
          .background(.ultraThinMaterial, in: Circle())
      }
      .disabled(videoManager.cameraPosition == .front)

      // Record button
      Button {
        toggleRecording()
      } label: {
        ZStack {
          Circle()
            .stroke(.white, lineWidth: 4)
            .frame(width: 80, height: 80)

          if videoManager.isRecording {
            RoundedRectangle(cornerRadius: 8)
              .fill(.red)
              .frame(width: 32, height: 32)
          } else {
            Circle()
              .fill(.red)
              .frame(width: 64, height: 64)
          }
        }
      }

      // Switch camera
      Button {
        Task {
          try? await videoManager.switchCamera()
        }
      } label: {
        Image(systemName: "camera.rotate")
          .font(.title2)
          .foregroundStyle(.white)
          .frame(width: 50, height: 50)
          .background(.ultraThinMaterial, in: Circle())
      }
      .disabled(videoManager.isRecording)
    }
  }

  // MARK: - Helpers

  private func setupCamera() {
    Task {
      do {
        try await videoManager.setupCamera()
        videoManager.startSession()
      } catch {
        videoManager.errorMessage = error.localizedDescription
        showingError = true
      }
    }
  }

  private func toggleRecording() {
    if videoManager.isRecording {
      Task {
        if let video = await videoManager.stopRecording() {
          recordedVideo = video
          showingRecordedVideo = true
        }
      }
    } else {
      do {
        try videoManager.startRecording()
      } catch {
        videoManager.errorMessage = error.localizedDescription
        showingError = true
      }
    }
  }

  private func formatDuration(_ duration: TimeInterval) -> String {
    let minutes = Int(duration) / 60
    let seconds = Int(duration) % 60
    return String(format: "%02d:%02d", minutes, seconds)
  }
}

// MARK: - Camera Preview View

struct CameraPreviewView: UIViewRepresentable {
  let previewLayer: AVCaptureVideoPreviewLayer?

  func makeUIView(context: Context) -> UIView {
    let view = UIView()
    view.backgroundColor = .black
    return view
  }

  func updateUIView(_ uiView: UIView, context: Context) {
    // Remove existing layers
    uiView.layer.sublayers?.forEach { $0.removeFromSuperlayer() }

    // Add preview layer
    if let previewLayer = previewLayer {
      previewLayer.frame = uiView.bounds
      uiView.layer.addSublayer(previewLayer)
    }
  }
}

// MARK: - Video Preview Sheet

struct VideoPreviewSheet: View {
  @Environment(\.dismiss) private var dismiss
  let video: TravelVideo
  let onSave: (TravelVideo) -> Void
  let onDiscard: () -> Void

  @State private var title: String
  @State private var description: String
  @State private var category: VideoCategory
  @State private var visibility: VideoVisibility
  @State private var tags: String

  init(video: TravelVideo, onSave: @escaping (TravelVideo) -> Void, onDiscard: @escaping () -> Void) {
    self.video = video
    self.onSave = onSave
    self.onDiscard = onDiscard
    _title = State(initialValue: video.title)
    _description = State(initialValue: video.description ?? "")
    _category = State(initialValue: video.category)
    _visibility = State(initialValue: video.visibility)
    _tags = State(initialValue: video.tags.joined(separator: ", "))
  }

  var body: some View {
    NavigationStack {
      Form {
        // Video thumbnail
        Section {
          if let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video),
             let uiImage = UIImage(contentsOfFile: thumbnailURL.path) {
            Image(uiImage: uiImage)
              .resizable()
              .aspectRatio(contentMode: .fit)
              .frame(maxHeight: 200)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }

          HStack {
            Label(video.formattedDuration, systemImage: "clock")
            Spacer()
            Label(video.formattedFileSize, systemImage: "doc")
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        // Details
        Section("视频信息") {
          TextField("标题", text: $title)

          TextField("描述", text: $description, axis: .vertical)
            .lineLimit(3...6)

          TextField("标签（逗号分隔）", text: $tags)
        }

        // Category
        Section("分类") {
          Picker("类别", selection: $category) {
            ForEach(VideoCategory.allCases, id: \.self) { cat in
              Label(cat.displayName, systemImage: cat.icon)
                .tag(cat)
            }
          }
        }

        // Visibility
        Section("可见性") {
          Picker("谁可以看", selection: $visibility) {
            ForEach(VideoVisibility.allCases, id: \.self) { vis in
              Label(vis.displayName, systemImage: vis.icon)
                .tag(vis)
            }
          }
        }
      }
      .navigationTitle("保存视频")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("丢弃", role: .destructive) {
            onDiscard()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            saveVideo()
          }
        }
      }
    }
  }

  private func saveVideo() {
    var updatedVideo = video
    updatedVideo.title = title.isEmpty ? video.title : title
    updatedVideo.description = description.isEmpty ? nil : description
    updatedVideo.category = category
    updatedVideo.visibility = visibility
    updatedVideo.tags = tags.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
    onSave(updatedVideo)
  }
}

// MARK: - Video Settings Sheet

struct VideoSettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @Binding var quality: VideoQuality

  var body: some View {
    NavigationStack {
      Form {
        Section("视频质量") {
          ForEach(VideoQuality.allCases, id: \.self) { q in
            Button {
              quality = q
            } label: {
              HStack {
                VStack(alignment: .leading) {
                  Text(q.displayName)
                    .foregroundStyle(.primary)
                  Text("最长 \(formatDuration(q.maxDuration))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                if quality == q {
                  Image(systemName: "checkmark")
                    .foregroundStyle(.blue)
                }
              }
            }
          }
        }

        Section {
          Text("更高的视频质量会占用更多存储空间，录制时长也会受到限制。")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("录制设置")
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

  private func formatDuration(_ duration: TimeInterval) -> String {
    let minutes = Int(duration) / 60
    return "\(minutes) 分钟"
  }
}

// MARK: - Preview

#Preview {
  VideoRecordingView()
}
