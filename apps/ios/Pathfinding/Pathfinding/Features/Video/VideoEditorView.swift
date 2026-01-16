import AVKit
import SwiftUI

/// View for editing travel videos with filters, text overlays, and trimming
struct VideoEditorView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var editorManager = VideoEditorManager.shared

  let video: TravelVideo
  let onSave: ((TravelVideo) -> Void)?

  @State private var player: AVPlayer?
  @State private var isPlaying = false
  @State private var currentTime: TimeInterval = 0
  @State private var selectedTab: EditorTab = .filter
  @State private var showingTextEditor = false
  @State private var editingOverlay: VideoTextOverlay?
  @State private var showingExportSheet = false
  @State private var isLoading = true
  @State private var showingError = false

  enum EditorTab: String, CaseIterable {
    case filter = "滤镜"
    case trim = "裁剪"
    case text = "文字"
  }

  init(video: TravelVideo, onSave: ((TravelVideo) -> Void)? = nil) {
    self.video = video
    self.onSave = onSave
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Video preview
        videoPreview
          .frame(maxHeight: UIScreen.main.bounds.height * 0.45)

        // Playback controls
        playbackControls

        // Tab selector
        tabSelector

        // Editor content
        editorContent
          .frame(maxHeight: .infinity)
      }
      .background(Color(.systemBackground))
      .navigationTitle("编辑视频")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            editorManager.discardChanges()
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            saveChanges()
          }
        }
        ToolbarItem(placement: .primaryAction) {
          Button {
            showingExportSheet = true
          } label: {
            Image(systemName: "square.and.arrow.up")
          }
        }
      }
      .onAppear {
        loadVideo()
      }
      .onDisappear {
        player?.pause()
        editorManager.unloadVideo()
      }
      .sheet(isPresented: $showingTextEditor) {
        TextOverlayEditor(
          overlay: editingOverlay ?? editorManager.createDefaultTextOverlay(),
          duration: editorManager.trimmedDuration,
          onSave: { overlay in
            if editingOverlay != nil {
              editorManager.updateTextOverlay(overlay)
            } else {
              editorManager.addTextOverlay(overlay)
            }
            editingOverlay = nil
          },
          onDelete: {
            if let overlay = editingOverlay {
              editorManager.removeTextOverlay(overlay)
            }
            editingOverlay = nil
          }
        )
      }
      .sheet(isPresented: $showingExportSheet) {
        VideoExportSheet(video: video)
      }
      .alert("错误", isPresented: $showingError) {
        Button("确定", role: .cancel) {}
      } message: {
        Text(editorManager.errorMessage ?? "未知错误")
      }
      .overlay {
        if isLoading {
          ProgressView()
            .controlSize(.large)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.ultraThinMaterial)
        }
      }
    }
  }

  // MARK: - Video Preview

  private var videoPreview: some View {
    ZStack {
      Color.black

      if let player = player {
        VideoPlayer(player: player)
          .disabled(true) // Disable default controls
      }

      // Text overlay preview
      GeometryReader { geo in
        ForEach(editorManager.textOverlays) { overlay in
          if currentTime >= overlay.startTime && currentTime <= overlay.endTime {
            Text(overlay.text)
              .font(.system(size: overlay.fontSize))
              .foregroundStyle(Color(hex: overlay.textColor) ?? .white)
              .padding(8)
              .background(overlay.backgroundColor.flatMap { Color(hex: $0) } ?? .clear)
              .clipShape(RoundedRectangle(cornerRadius: 4))
              .rotationEffect(.degrees(overlay.rotation))
              .position(
                x: overlay.position.x * geo.size.width,
                y: overlay.position.y * geo.size.height
              )
              .onTapGesture {
                editingOverlay = overlay
                showingTextEditor = true
              }
          }
        }
      }
    }
  }

  // MARK: - Playback Controls

  private var playbackControls: some View {
    VStack(spacing: 8) {
      // Progress bar
      GeometryReader { geo in
        ZStack(alignment: .leading) {
          // Background
          RoundedRectangle(cornerRadius: 2)
            .fill(Color(.systemGray5))
            .frame(height: 4)

          // Progress
          RoundedRectangle(cornerRadius: 2)
            .fill(.blue)
            .frame(width: progressWidth(in: geo.size.width), height: 4)

          // Trim indicators
          if selectedTab == .trim {
            // Start trim handle
            trimHandle(at: editorManager.trimStart / editorManager.originalDuration * geo.size.width, isStart: true)

            // End trim handle
            trimHandle(at: editorManager.trimEnd / editorManager.originalDuration * geo.size.width, isStart: false)
          }
        }
        .gesture(
          DragGesture(minimumDistance: 0)
            .onChanged { value in
              let percent = max(0, min(1, value.location.x / geo.size.width))
              seekTo(percent: percent)
            }
        )
      }
      .frame(height: 20)
      .padding(.horizontal)

      // Time and controls
      HStack {
        Text(formatTime(currentTime))
          .font(.caption.monospacedDigit())
          .foregroundStyle(.secondary)

        Spacer()

        Button {
          togglePlayback()
        } label: {
          Image(systemName: isPlaying ? "pause.fill" : "play.fill")
            .font(.title2)
        }

        Spacer()

        Text(formatTime(editorManager.originalDuration))
          .font(.caption.monospacedDigit())
          .foregroundStyle(.secondary)
      }
      .padding(.horizontal)
    }
    .padding(.vertical, 8)
    .background(Color(.systemBackground))
  }

  private func trimHandle(at position: CGFloat, isStart: Bool) -> some View {
    Rectangle()
      .fill(.orange)
      .frame(width: 4, height: 20)
      .offset(x: position - 2)
      .gesture(
        DragGesture()
          .onChanged { value in
            let newPos = value.location.x
            let percent = max(0, min(1, newPos / UIScreen.main.bounds.width))
            let time = percent * editorManager.originalDuration

            if isStart {
              editorManager.setTrimRange(
                start: min(time, editorManager.trimEnd - 1),
                end: editorManager.trimEnd
              )
            } else {
              editorManager.setTrimRange(
                start: editorManager.trimStart,
                end: max(time, editorManager.trimStart + 1)
              )
            }
          }
      )
  }

  private func progressWidth(in totalWidth: CGFloat) -> CGFloat {
    guard editorManager.originalDuration > 0 else { return 0 }
    return CGFloat(currentTime / editorManager.originalDuration) * totalWidth
  }

  // MARK: - Tab Selector

  private var tabSelector: some View {
    HStack(spacing: 0) {
      ForEach(EditorTab.allCases, id: \.self) { tab in
        Button {
          selectedTab = tab
        } label: {
          Text(tab.rawValue)
            .font(.subheadline.weight(.medium))
            .foregroundStyle(selectedTab == tab ? .blue : .secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
              selectedTab == tab ?
                Color.blue.opacity(0.1) :
                Color.clear
            )
        }
      }
    }
    .background(Color(.systemGray6))
  }

  // MARK: - Editor Content

  @ViewBuilder
  private var editorContent: some View {
    switch selectedTab {
    case .filter:
      filterEditor
    case .trim:
      trimEditor
    case .text:
      textEditor
    }
  }

  // MARK: - Filter Editor

  private var filterEditor: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: 12) {
        ForEach(editorManager.availableFilters, id: \.id) { filter in
          FilterButton(
            filter: filter,
            isSelected: editorManager.appliedFilter == filter,
            thumbnail: thumbnailImage
          ) {
            editorManager.applyFilter(filter)
          }
        }
      }
      .padding()
    }
  }

  private var thumbnailImage: UIImage? {
    guard let thumbnailURL = VideoRecordingManager.shared.thumbnailURL(for: video) else { return nil }
    return UIImage(contentsOfFile: thumbnailURL.path)
  }

  // MARK: - Trim Editor

  private var trimEditor: some View {
    VStack(spacing: 16) {
      // Trim info
      HStack {
        VStack(alignment: .leading) {
          Text("开始")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(formatTime(editorManager.trimStart))
            .font(.headline.monospacedDigit())
        }

        Spacer()

        VStack {
          Text("时长")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(formatTime(editorManager.trimmedDuration))
            .font(.headline.monospacedDigit())
            .foregroundStyle(.blue)
        }

        Spacer()

        VStack(alignment: .trailing) {
          Text("结束")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(formatTime(editorManager.trimEnd))
            .font(.headline.monospacedDigit())
        }
      }
      .padding()

      // Trim sliders
      VStack(spacing: 12) {
        HStack {
          Text("开始时间")
            .font(.subheadline)
          Slider(
            value: Binding(
              get: { editorManager.trimStart },
              set: { editorManager.setTrimRange(start: $0, end: editorManager.trimEnd) }
            ),
            in: 0...max(0.1, editorManager.trimEnd - 1)
          )
        }

        HStack {
          Text("结束时间")
            .font(.subheadline)
          Slider(
            value: Binding(
              get: { editorManager.trimEnd },
              set: { editorManager.setTrimRange(start: editorManager.trimStart, end: $0) }
            ),
            in: (editorManager.trimStart + 1)...editorManager.originalDuration
          )
        }
      }
      .padding()

      // Reset button
      Button("重置裁剪") {
        editorManager.resetTrim()
      }
      .buttonStyle(.bordered)

      Spacer()
    }
  }

  // MARK: - Text Editor

  private var textEditor: some View {
    VStack(spacing: 16) {
      // Add text button
      Button {
        editingOverlay = nil
        showingTextEditor = true
      } label: {
        Label("添加文字", systemImage: "plus.circle.fill")
          .frame(maxWidth: .infinity)
          .padding()
          .background(Color(.systemGray6))
          .clipShape(RoundedRectangle(cornerRadius: 12))
      }
      .padding(.horizontal)

      // Existing overlays
      if editorManager.textOverlays.isEmpty {
        ContentUnavailableView(
          "暂无文字",
          systemImage: "textformat",
          description: Text("点击上方按钮添加文字覆盖")
        )
      } else {
        List {
          ForEach(editorManager.textOverlays) { overlay in
            HStack {
              VStack(alignment: .leading) {
                Text(overlay.text)
                  .lineLimit(1)
                Text("\(formatTime(overlay.startTime)) - \(formatTime(overlay.endTime))")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }

              Spacer()

              Button {
                editingOverlay = overlay
                showingTextEditor = true
              } label: {
                Image(systemName: "pencil")
              }
            }
          }
          .onDelete { indexSet in
            for index in indexSet {
              editorManager.removeTextOverlay(editorManager.textOverlays[index])
            }
          }
        }
        .listStyle(.plain)
      }
    }
    .padding(.top)
  }

  // MARK: - Helpers

  private func loadVideo() {
    Task {
      do {
        try await editorManager.loadVideo(video)
        if let playerItem = editorManager.previewPlayerItem {
          player = AVPlayer(playerItem: playerItem)
          setupTimeObserver()
        }
        isLoading = false
      } catch {
        showingError = true
        isLoading = false
      }
    }
  }

  private func setupTimeObserver() {
    player?.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { time in
      Task { @MainActor in
        currentTime = time.seconds
      }
    }
  }

  private func togglePlayback() {
    if isPlaying {
      player?.pause()
    } else {
      player?.play()
    }
    isPlaying.toggle()
  }

  private func seekTo(percent: Double) {
    let time = percent * editorManager.originalDuration
    let cmTime = CMTime(seconds: time, preferredTimescale: 600)
    player?.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero)
    currentTime = time
  }

  private func saveChanges() {
    editorManager.saveChanges()
    if let updatedVideo = editorManager.currentVideo {
      onSave?(updatedVideo)
    }
    dismiss()
  }

  private func formatTime(_ time: TimeInterval) -> String {
    let minutes = Int(time) / 60
    let seconds = Int(time) % 60
    return String(format: "%d:%02d", minutes, seconds)
  }
}

// MARK: - Filter Button

struct FilterButton: View {
  let filter: VideoFilter
  let isSelected: Bool
  let thumbnail: UIImage?
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 6) {
        if let thumbnail = thumbnail {
          Image(uiImage: thumbnail)
            .resizable()
            .aspectRatio(1, contentMode: .fill)
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
              RoundedRectangle(cornerRadius: 8)
                .stroke(isSelected ? .blue : .clear, lineWidth: 3)
            )
        } else {
          RoundedRectangle(cornerRadius: 8)
            .fill(Color(.systemGray5))
            .frame(width: 60, height: 60)
            .overlay(
              RoundedRectangle(cornerRadius: 8)
                .stroke(isSelected ? .blue : .clear, lineWidth: 3)
            )
        }

        Text(filter.displayName)
          .font(.caption2)
          .foregroundStyle(isSelected ? .blue : .primary)
      }
    }
  }
}

// MARK: - Text Overlay Editor

struct TextOverlayEditor: View {
  @Environment(\.dismiss) private var dismiss

  @State private var overlay: VideoTextOverlay
  let duration: TimeInterval
  let onSave: (VideoTextOverlay) -> Void
  let onDelete: () -> Void

  @State private var isEditing: Bool

  init(overlay: VideoTextOverlay, duration: TimeInterval, onSave: @escaping (VideoTextOverlay) -> Void, onDelete: @escaping () -> Void) {
    _overlay = State(initialValue: overlay)
    self.duration = duration
    self.onSave = onSave
    self.onDelete = onDelete
    _isEditing = State(initialValue: overlay.text.isEmpty || overlay.text == "文字")
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("文字内容") {
          TextField("输入文字", text: $overlay.text)
        }

        Section("样式") {
          Stepper("字体大小: \(Int(overlay.fontSize))", value: $overlay.fontSize, in: 12...72)

          ColorPicker("文字颜色", selection: Binding(
            get: { Color(hex: overlay.textColor) ?? .white },
            set: { overlay.textColor = $0.hexString }
          ))

          Toggle("背景色", isOn: Binding(
            get: { overlay.backgroundColor != nil },
            set: { overlay.backgroundColor = $0 ? "#00000080" : nil }
          ))

          if overlay.backgroundColor != nil {
            ColorPicker("背景颜色", selection: Binding(
              get: { Color(hex: overlay.backgroundColor ?? "#00000080") ?? .black.opacity(0.5) },
              set: { overlay.backgroundColor = $0.hexString }
            ))
          }
        }

        Section("位置") {
          HStack {
            Text("水平")
            Slider(value: $overlay.position.x, in: 0.1...0.9)
          }
          HStack {
            Text("垂直")
            Slider(value: $overlay.position.y, in: 0.1...0.9)
          }
          HStack {
            Text("旋转")
            Slider(value: $overlay.rotation, in: -45...45)
            Text("\(Int(overlay.rotation))°")
              .font(.caption)
          }
        }

        Section("显示时间") {
          HStack {
            Text("开始")
            Slider(value: $overlay.startTime, in: 0...max(0.1, overlay.endTime - 0.5))
            Text(formatTime(overlay.startTime))
              .font(.caption.monospacedDigit())
          }
          HStack {
            Text("结束")
            Slider(value: $overlay.endTime, in: (overlay.startTime + 0.5)...duration)
            Text(formatTime(overlay.endTime))
              .font(.caption.monospacedDigit())
          }
        }

        if !isEditing {
          Section {
            Button("删除文字", role: .destructive) {
              onDelete()
              dismiss()
            }
          }
        }
      }
      .navigationTitle(isEditing ? "添加文字" : "编辑文字")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("完成") {
            onSave(overlay)
            dismiss()
          }
          .disabled(overlay.text.isEmpty)
        }
      }
    }
  }

  private func formatTime(_ time: TimeInterval) -> String {
    let minutes = Int(time) / 60
    let seconds = Int(time) % 60
    return String(format: "%d:%02d", minutes, seconds)
  }
}

// MARK: - Video Export Sheet

struct VideoExportSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var editorManager = VideoEditorManager.shared

  let video: TravelVideo

  @State private var settings = VideoExportSettings()
  @State private var isExporting = false
  @State private var exportedURL: URL?
  @State private var showingShareSheet = false
  @State private var showingError = false

  var body: some View {
    NavigationStack {
      Form {
        Section("导出质量") {
          Picker("质量", selection: $settings.quality) {
            ForEach(VideoQuality.allCases, id: \.self) { quality in
              Text(quality.displayName).tag(quality)
            }
          }
        }

        Section("水印") {
          Toggle("添加水印", isOn: $settings.includeWatermark)
          if settings.includeWatermark {
            TextField("水印文字", text: Binding(
              get: { settings.watermarkText ?? "" },
              set: { settings.watermarkText = $0.isEmpty ? nil : $0 }
            ))
          }
        }

        Section("元数据") {
          Toggle("包含日期", isOn: $settings.includeDate)
          Toggle("包含位置", isOn: $settings.includeLocation)
        }

        Section {
          Button {
            exportVideo()
          } label: {
            if isExporting {
              HStack {
                ProgressView()
                  .padding(.trailing, 8)
                Text("导出中 \(Int(editorManager.exportProgress * 100))%")
              }
            } else {
              Label("开始导出", systemImage: "square.and.arrow.up")
            }
          }
          .disabled(isExporting)
        }

        if let url = exportedURL {
          Section("导出完成") {
            Button {
              showingShareSheet = true
            } label: {
              Label("分享视频", systemImage: "square.and.arrow.up")
            }

            Button {
              saveToPhotoLibrary(url: url)
            } label: {
              Label("保存到相册", systemImage: "photo")
            }
          }
        }
      }
      .navigationTitle("导出视频")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("关闭") {
            if isExporting {
              editorManager.cancelExport()
            }
            dismiss()
          }
        }
      }
      .sheet(isPresented: $showingShareSheet) {
        if let url = exportedURL {
          ActivityShareSheet(items: [url])
        }
      }
      .alert("导出失败", isPresented: $showingError) {
        Button("确定", role: .cancel) {}
      } message: {
        Text(editorManager.errorMessage ?? "未知错误")
      }
    }
  }

  private func exportVideo() {
    isExporting = true
    Task {
      do {
        let url = try await editorManager.exportVideo(settings: settings)
        exportedURL = url
        isExporting = false
      } catch {
        showingError = true
        isExporting = false
      }
    }
  }

  private func saveToPhotoLibrary(url: URL) {
    // Implementation would use PHPhotoLibrary
  }
}

// MARK: - Preview

#Preview {
  VideoEditorView(video: .preview)
}
