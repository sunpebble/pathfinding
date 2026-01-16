import SwiftUI

/// Main voice memo management view
struct VoiceMemoView: View {
  @State private var memoManager = VoiceMemoManager.shared
  @State private var showRecordSheet = false
  @State private var showMemoDetail: VoiceMemo?
  @State private var searchText = ""
  @State private var filterMode: FilterMode = .all

  enum FilterMode: String, CaseIterable {
    case all = "全部"
    case withTranscription = "已转文字"
    case associated = "已关联"
    case unassociated = "未关联"
  }

  private var filteredMemos: [VoiceMemo] {
    var result = memoManager.memos

    // Apply search filter
    if !searchText.isEmpty {
      result = result.filter { memo in
        memo.title.localizedCaseInsensitiveContains(searchText) ||
        (memo.transcription?.localizedCaseInsensitiveContains(searchText) ?? false)
      }
    }

    // Apply category filter
    switch filterMode {
    case .all:
      break
    case .withTranscription:
      result = result.filter { $0.hasTranscription }
    case .associated:
      result = result.filter { $0.isAssociated }
    case .unassociated:
      result = result.filter { !$0.isAssociated }
    }

    return result
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Filter picker
        filterPicker

        // Memo list
        memoList
      }
      .navigationTitle("语音备忘录")
      .searchable(text: $searchText, prompt: "搜索备忘录")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showRecordSheet = true
          } label: {
            Image(systemName: "plus.circle.fill")
              .font(.title3)
          }
        }
      }
      .sheet(isPresented: $showRecordSheet) {
        VoiceMemoRecordSheet()
      }
      .sheet(item: $showMemoDetail) { memo in
        VoiceMemoDetailSheet(memo: memo)
      }
    }
  }

  // MARK: - Filter Picker

  private var filterPicker: some View {
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(FilterMode.allCases, id: \.self) { mode in
          Button {
            withAnimation(.spring(response: 0.3)) {
              filterMode = mode
            }
          } label: {
            Text(mode.rawValue)
              .font(.subheadline)
              .fontWeight(filterMode == mode ? .semibold : .regular)
              .foregroundStyle(filterMode == mode ? .white : .primary)
              .padding(.horizontal, DesignTokens.Spacing.md)
              .padding(.vertical, DesignTokens.Spacing.xs)
              .background(
                Capsule()
                  .fill(filterMode == mode ? Color.accentColor : Color(.systemGray5))
              )
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal, DesignTokens.Spacing.md)
      .padding(.vertical, DesignTokens.Spacing.sm)
    }
    .background(Color(.systemBackground))
  }

  // MARK: - Memo List

  private var memoList: some View {
    Group {
      if filteredMemos.isEmpty {
        ContentUnavailableView {
          Label("暂无备忘录", systemImage: "mic.slash")
        } description: {
          Text(searchText.isEmpty ? "点击右上角开始录制语音备忘录" : "没有找到匹配的备忘录")
        }
      } else {
        List {
          ForEach(filteredMemos) { memo in
            VoiceMemoCell(
              memo: memo,
              isPlaying: memoManager.currentlyPlayingMemoId == memo.id,
              isTranscribing: memoManager.isTranscribing,
              playbackProgress: memoManager.playbackProgress,
              onPlay: { playMemo(memo) },
              onStop: { memoManager.stopPlayback() },
              onTap: { showMemoDetail = memo }
            )
            .listRowInsets(EdgeInsets(
              top: DesignTokens.Spacing.xs,
              leading: DesignTokens.Spacing.md,
              bottom: DesignTokens.Spacing.xs,
              trailing: DesignTokens.Spacing.md
            ))
          }
          .onDelete { offsets in
            for index in offsets {
              memoManager.delete(filteredMemos[index])
            }
          }
        }
        .listStyle(.plain)
      }
    }
  }

  private func playMemo(_ memo: VoiceMemo) {
    do {
      try memoManager.play(memo)
    } catch {
      // Handle error
    }
  }
}

// MARK: - Voice Memo Cell

struct VoiceMemoCell: View {
  let memo: VoiceMemo
  let isPlaying: Bool
  let isTranscribing: Bool
  let playbackProgress: Float
  let onPlay: () -> Void
  let onStop: () -> Void
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: DesignTokens.Spacing.md) {
        // Play/Stop button
        Button {
          if isPlaying {
            onStop()
          } else {
            onPlay()
          }
        } label: {
          ZStack {
            Circle()
              .fill(isPlaying ? Color.red : Color.accentColor)
              .frame(width: 48, height: 48)

            Image(systemName: isPlaying ? "stop.fill" : "play.fill")
              .font(.subheadline)
              .foregroundStyle(.white)
          }
        }
        .buttonStyle(.plain)

        // Info
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Text(memo.title)
              .font(.subheadline)
              .fontWeight(.medium)
              .foregroundStyle(.primary)
              .lineLimit(1)

            Spacer()

            Text(memo.formattedDuration)
              .font(.caption)
              .foregroundStyle(.secondary)
              .monospacedDigit()
          }

          // Date and status indicators
          HStack(spacing: DesignTokens.Spacing.sm) {
            Text(memo.shortDate)
              .font(.caption)
              .foregroundStyle(.tertiary)

            if memo.hasTranscription {
              Label("已转文字", systemImage: "text.bubble")
                .font(.caption2)
                .foregroundStyle(.green)
            }

            if memo.isAssociated {
              Label("已关联", systemImage: "link")
                .font(.caption2)
                .foregroundStyle(.blue)
            }

            if isTranscribing {
              HStack(spacing: 4) {
                ProgressView()
                  .controlSize(.mini)
                Text("转写中")
                  .font(.caption2)
              }
              .foregroundStyle(.orange)
            }
          }

          // Progress bar when playing
          if isPlaying {
            GeometryReader { geometry in
              ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                  .fill(Color(.systemGray5))
                  .frame(height: 4)

                RoundedRectangle(cornerRadius: 2)
                  .fill(Color.accentColor)
                  .frame(width: geometry.size.width * CGFloat(playbackProgress), height: 4)
              }
            }
            .frame(height: 4)
          }

          // Transcription preview
          if let transcription = memo.transcription, !transcription.isEmpty {
            Text(transcription)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(2)
              .padding(.top, 2)
          }
        }

        Image(systemName: "chevron.right")
          .font(.caption2)
          .foregroundStyle(.tertiary)
      }
      .padding(.vertical, 4)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Voice Memo Record Sheet

struct VoiceMemoRecordSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var memoManager = VoiceMemoManager.shared
  @State private var memoTitle = ""
  @State private var showSaveConfirmation = false

  var body: some View {
    NavigationStack {
      VStack(spacing: DesignTokens.Spacing.xxl) {
        Spacer()

        // Recording visualization
        if memoManager.isRecording {
          VStack(spacing: DesignTokens.Spacing.lg) {
            // Waveform
            WaveformView(audioLevel: memoManager.audioLevel)
              .frame(height: 80)
              .padding(.horizontal, DesignTokens.Spacing.xl)

            // Duration
            Text(formatDuration(memoManager.recordingDuration))
              .font(.system(size: 48, weight: .light, design: .monospaced))
              .foregroundStyle(.primary)

            // Recording indicator
            HStack(spacing: DesignTokens.Spacing.xs) {
              Circle()
                .fill(.red)
                .frame(width: 10, height: 10)
              Text("正在录音")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
          }
        } else {
          VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "mic.circle.fill")
              .font(.system(size: 80))
              .foregroundStyle(Color.accentColor)

            Text("点击下方按钮开始录音")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Control buttons
        HStack(spacing: DesignTokens.Spacing.xxl) {
          if memoManager.isRecording {
            // Cancel button
            Button {
              memoManager.cancelRecording()
            } label: {
              VStack(spacing: 8) {
                Circle()
                  .fill(Color(.systemGray5))
                  .frame(width: 60, height: 60)
                  .overlay {
                    Image(systemName: "xmark")
                      .font(.title2)
                      .foregroundStyle(.secondary)
                  }
                Text("取消")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
            .buttonStyle(.plain)
          }

          // Main record/stop button
          Button {
            Task {
              await toggleRecording()
            }
          } label: {
            VStack(spacing: 8) {
              ZStack {
                // Outer ring animation
                if memoManager.isRecording {
                  Circle()
                    .stroke(Color.red.opacity(0.3), lineWidth: 4)
                    .frame(width: 88, height: 88)
                    .scaleEffect(1 + CGFloat(memoManager.audioLevel) * 0.2)
                    .animation(.easeInOut(duration: 0.1), value: memoManager.audioLevel)
                }

                Circle()
                  .fill(memoManager.isRecording ? Color.red : Color.accentColor)
                  .frame(width: 80, height: 80)
                  .shadow(color: (memoManager.isRecording ? Color.red : Color.accentColor).opacity(0.4),
                          radius: 12, y: 4)

                if memoManager.isRecording {
                  RoundedRectangle(cornerRadius: 6)
                    .fill(.white)
                    .frame(width: 28, height: 28)
                } else {
                  Circle()
                    .fill(.white)
                    .frame(width: 32, height: 32)
                }
              }

              Text(memoManager.isRecording ? "停止" : "录音")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.primary)
            }
          }
          .buttonStyle(.plain)
          .sensoryFeedback(.impact, trigger: memoManager.isRecording)
        }
        .padding(.bottom, DesignTokens.Spacing.xxl)
      }
      .navigationTitle("录制备忘录")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") {
            if memoManager.isRecording {
              memoManager.cancelRecording()
            }
            dismiss()
          }
        }
      }
      .alert("保存备忘录", isPresented: $showSaveConfirmation) {
        TextField("备忘录标题", text: $memoTitle)
        Button("保存") {
          _ = memoManager.stopRecording(
            title: memoTitle.isEmpty ? nil : memoTitle,
            autoTranscribe: true
          )
          dismiss()
        }
        Button("取消", role: .cancel) {
          memoManager.cancelRecording()
        }
      } message: {
        Text("为这条备忘录添加标题（可选）")
      }
    }
    .interactiveDismissDisabled(memoManager.isRecording)
  }

  private func toggleRecording() async {
    if memoManager.isRecording {
      showSaveConfirmation = true
    } else {
      do {
        try await memoManager.startRecording()
      } catch {
        // Handle error
      }
    }
  }

  private func formatDuration(_ duration: TimeInterval) -> String {
    let minutes = Int(duration) / 60
    let seconds = Int(duration) % 60
    let milliseconds = Int((duration.truncatingRemainder(dividingBy: 1)) * 100)
    return String(format: "%02d:%02d.%02d", minutes, seconds, milliseconds)
  }
}

// MARK: - Voice Memo Detail Sheet

struct VoiceMemoDetailSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var memoManager = VoiceMemoManager.shared
  @State private var editedTitle: String
  @State private var editedTranscription: String
  @State private var isEditing = false
  @State private var showDeleteConfirmation = false

  let memo: VoiceMemo

  init(memo: VoiceMemo) {
    self.memo = memo
    self._editedTitle = State(initialValue: memo.title)
    self._editedTranscription = State(initialValue: memo.transcription ?? "")
  }

  private var currentMemo: VoiceMemo {
    memoManager.memo(byId: memo.id) ?? memo
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Playback section
          playbackSection

          Divider()

          // Info section
          infoSection

          Divider()

          // Transcription section
          transcriptionSection

          // Association section
          if currentMemo.isAssociated {
            Divider()
            associationSection
          }
        }
        .padding(DesignTokens.Spacing.lg)
      }
      .navigationTitle("备忘录详情")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("完成") {
            saveChanges()
            dismiss()
          }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Menu {
            Button {
              Task {
                await memoManager.transcribeMemo(currentMemo)
              }
            } label: {
              Label("重新转写", systemImage: "arrow.clockwise")
            }

            Button(role: .destructive) {
              showDeleteConfirmation = true
            } label: {
              Label("删除", systemImage: "trash")
            }
          } label: {
            Image(systemName: "ellipsis.circle")
          }
        }
      }
      .confirmationDialog("确定删除这条备忘录?", isPresented: $showDeleteConfirmation, titleVisibility: .visible) {
        Button("删除", role: .destructive) {
          memoManager.delete(currentMemo)
          dismiss()
        }
        Button("取消", role: .cancel) {}
      }
    }
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
  }

  // MARK: - Playback Section

  private var playbackSection: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Waveform/Progress
      ZStack {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
          .fill(Color(.secondarySystemBackground))
          .frame(height: 80)

        if memoManager.currentlyPlayingMemoId == memo.id {
          WaveformView(audioLevel: Float.random(in: 0.3...0.7))
            .padding(.horizontal, DesignTokens.Spacing.lg)
        } else {
          Image(systemName: "waveform")
            .font(.largeTitle)
            .foregroundStyle(.tertiary)
        }
      }

      // Progress slider
      VStack(spacing: 4) {
        Slider(
          value: Binding(
            get: { Double(memoManager.playbackProgress) },
            set: { memoManager.seek(to: Float($0)) }
          ),
          in: 0...1
        )
        .disabled(memoManager.currentlyPlayingMemoId != memo.id)

        HStack {
          Text(formatTime(memoManager.playbackCurrentTime))
            .font(.caption)
            .foregroundStyle(.secondary)
            .monospacedDigit()

          Spacer()

          Text(memo.formattedDuration)
            .font(.caption)
            .foregroundStyle(.secondary)
            .monospacedDigit()
        }
      }

      // Playback controls
      HStack(spacing: DesignTokens.Spacing.xl) {
        // Rewind 15s
        Button {
          let newProgress = max(0, memoManager.playbackProgress - 0.1)
          memoManager.seek(to: newProgress)
        } label: {
          Image(systemName: "gobackward.15")
            .font(.title2)
        }
        .disabled(memoManager.currentlyPlayingMemoId != memo.id)

        // Play/Pause
        Button {
          if memoManager.currentlyPlayingMemoId == memo.id {
            if memoManager.isPlaying {
              memoManager.pausePlayback()
            } else {
              memoManager.resumePlayback()
            }
          } else {
            try? memoManager.play(memo)
          }
        } label: {
          Circle()
            .fill(Color.accentColor)
            .frame(width: 64, height: 64)
            .overlay {
              Image(systemName: (memoManager.currentlyPlayingMemoId == memo.id && memoManager.isPlaying) ? "pause.fill" : "play.fill")
                .font(.title2)
                .foregroundStyle(.white)
            }
        }

        // Forward 15s
        Button {
          let newProgress = min(1, memoManager.playbackProgress + 0.1)
          memoManager.seek(to: newProgress)
        } label: {
          Image(systemName: "goforward.15")
            .font(.title2)
        }
        .disabled(memoManager.currentlyPlayingMemoId != memo.id)
      }
    }
  }

  // MARK: - Info Section

  private var infoSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("基本信息")
        .font(.headline)

      VStack(spacing: DesignTokens.Spacing.xs) {
        if isEditing {
          TextField("标题", text: $editedTitle)
            .textFieldStyle(.roundedBorder)
        } else {
          LabeledContent("标题", value: currentMemo.title)
        }

        LabeledContent("时长", value: memo.formattedDuration)
        LabeledContent("创建时间", value: memo.formattedDate)
      }
      .font(.subheadline)

      if !isEditing {
        Button {
          isEditing = true
        } label: {
          Label("编辑", systemImage: "pencil")
        }
        .font(.subheadline)
      } else {
        Button {
          saveChanges()
          isEditing = false
        } label: {
          Label("保存", systemImage: "checkmark")
        }
        .font(.subheadline)
      }
    }
  }

  // MARK: - Transcription Section

  private var transcriptionSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text("语音转文字")
          .font(.headline)

        Spacer()

        if memoManager.isTranscribing {
          HStack(spacing: 4) {
            ProgressView()
              .controlSize(.small)
            Text("转写中...")
              .font(.caption)
          }
          .foregroundStyle(.orange)
        }
      }

      if isEditing {
        TextEditor(text: $editedTranscription)
          .frame(minHeight: 100)
          .padding(8)
          .background(Color(.secondarySystemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
      } else if let transcription = currentMemo.transcription, !transcription.isEmpty {
        Text(transcription)
          .font(.body)
          .foregroundStyle(.secondary)
          .padding()
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.secondarySystemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

        // Copy button
        Button {
          UIPasteboard.general.string = transcription
        } label: {
          Label("复制文字", systemImage: "doc.on.doc")
        }
        .font(.subheadline)
      } else {
        VStack(spacing: DesignTokens.Spacing.sm) {
          Text("尚未转写")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Button {
            Task {
              await memoManager.transcribeMemo(currentMemo)
            }
          } label: {
            Label("开始转写", systemImage: "text.bubble")
          }
          .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
      }
    }
  }

  // MARK: - Association Section

  private var associationSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("关联信息")
        .font(.headline)

      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        if currentMemo.associatedItineraryId != nil {
          Label("已关联行程", systemImage: "map")
            .font(.subheadline)
            .foregroundStyle(.blue)
        }

        if let dayNumber = currentMemo.associatedDayNumber {
          Label("第 \(dayNumber) 天", systemImage: "calendar")
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }

        if currentMemo.associatedPoiId != nil {
          Label("已关联景点", systemImage: "mappin")
            .font(.subheadline)
            .foregroundStyle(.orange)
        }
      }
    }
  }

  // MARK: - Helpers

  private func saveChanges() {
    if editedTitle != currentMemo.title {
      memoManager.updateTitle(for: memo.id, title: editedTitle)
    }
    if editedTranscription != (currentMemo.transcription ?? "") {
      memoManager.updateTranscription(for: memo.id, transcription: editedTranscription)
    }
  }

  private func formatTime(_ time: TimeInterval) -> String {
    let minutes = Int(time) / 60
    let seconds = Int(time) % 60
    return String(format: "%d:%02d", minutes, seconds)
  }
}

// MARK: - Previews

#Preview("Voice Memo View") {
  VoiceMemoView()
}

#Preview("Record Sheet") {
  VoiceMemoRecordSheet()
}
