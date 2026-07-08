import SwiftUI

/// Voice input view with recording button and waveform visualization
struct VoiceInputView: View {
  @State private var speechManager = SpeechRecognitionManager.shared
  @State private var commandParser = VoiceCommandParser.shared

  /// Callback when a command is recognized
  var onCommand: ((VoiceCommand) -> Void)?

  /// Callback when transcription is updated
  var onTranscription: ((String) -> Void)?

  /// Whether to show the transcription text
  var showTranscription: Bool = true

  /// Placeholder text when not listening
  var placeholder: String = "voiceinput.placeholder".localized

  @State private var showPermissionAlert = false
  @State private var recognizedCommand: VoiceCommand?
  @State private var showCommandFeedback = false

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Transcription display
      if showTranscription {
        transcriptionView
      }

      // Waveform visualization
      if speechManager.isListening {
        WaveformView(audioLevel: speechManager.audioLevel)
          .frame(height: 60)
          .padding(.horizontal)
      }

      // Recording button
      recordButton

      // Command feedback
      if showCommandFeedback, let command = recognizedCommand {
        commandFeedbackView(command)
      }

      // Error message
      if let error = speechManager.errorMessage {
        Text(error)
          .font(.caption)
          .foregroundStyle(.red)
          .padding(.horizontal)
      }
    }
    .alert("voiceinput.permission_title".localized, isPresented: $showPermissionAlert) {
      Button("voiceinput.open_settings".localized) {
        if let url = URL(string: UIApplication.openSettingsURLString) {
          UIApplication.shared.open(url)
        }
      }
      Button("common.cancel".localized, role: .cancel) {}
    } message: {
      Text("voiceinput.permission_message".localized)
    }
    .onChange(of: speechManager.transcribedText) { _, newValue in
      if !newValue.isEmpty {
        onTranscription?(newValue)
        // Parse command
        if let command = commandParser.parse(newValue) {
          recognizedCommand = command
          showCommandFeedback = true
          onCommand?(command)

          // Hide feedback after delay
          Task {
            try? await Task.sleep(for: .seconds(2))
            await MainActor.run {
              showCommandFeedback = false
            }
          }
        }
      }
    }
  }

  // MARK: - Subviews

  private var transcriptionView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      if speechManager.isListening {
        HStack(spacing: DesignTokens.Spacing.xs) {
          Circle()
            .fill(.red)
            .frame(width: 8, height: 8)
          Text("voiceinput.listening".localized)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      Text(displayText)
        .font(.body)
        .foregroundStyle(hasText ? .primary : .secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Sunpebble.ink.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }
    .padding(.horizontal)
  }

  private var displayText: String {
    if !speechManager.partialText.isEmpty {
      return speechManager.partialText
    } else if !speechManager.transcribedText.isEmpty {
      return speechManager.transcribedText
    } else {
      return placeholder
    }
  }

  private var hasText: Bool {
    !speechManager.partialText.isEmpty || !speechManager.transcribedText.isEmpty
  }

  private var recordButton: some View {
    Button {
      Task {
        await toggleRecording()
      }
    } label: {
      ZStack {
        // Outer ring animation when listening
        if speechManager.isListening {
          Circle()
            .stroke(Color.red.opacity(0.3), lineWidth: 4)
            .frame(width: 80, height: 80)
            .scaleEffect(1 + CGFloat(speechManager.audioLevel) * 0.3)
            .animation(.easeInOut(duration: 0.1), value: speechManager.audioLevel)
        }

        // Main button
        Circle()
          .fill(speechManager.isListening ? Color.red : Color.accentColor)
          .frame(width: 64, height: 64)
          .shadow(color: (speechManager.isListening ? Color.red : Color.accentColor).opacity(0.3),
                  radius: 8, y: 4)

        // Icon
        Image(systemName: speechManager.isListening ? "stop.fill" : "mic.fill")
          .font(.title2)
          .foregroundStyle(.white)
      }
    }
    .buttonStyle(.plain)
    .sensoryFeedback(.impact, trigger: speechManager.isListening)
  }

  private func commandFeedbackView(_ command: VoiceCommand) -> some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      Image(systemName: "checkmark.circle.fill")
        .foregroundStyle(.green)
      Text(command.description)
        .font(.subheadline)
    }
    .padding(.horizontal, DesignTokens.Spacing.md)
    .padding(.vertical, DesignTokens.Spacing.xs)
    .background(Color.green.opacity(0.1))
    .clipShape(Capsule())
    .transition(.scale.combined(with: .opacity))
  }

  // MARK: - Actions

  private func toggleRecording() async {
    if speechManager.isListening {
      speechManager.stopListening()
    } else {
      do {
        try await speechManager.startListening()
      } catch SpeechRecognitionError.notAuthorized {
        showPermissionAlert = true
      } catch {
        // Error is displayed via speechManager.errorMessage
      }
    }
  }
}

// MARK: - Waveform View

struct WaveformView: View {
  let audioLevel: Float
  let barCount: Int = 20

  var body: some View {
    HStack(spacing: 3) {
      ForEach(0..<barCount, id: \.self) { index in
        WaveformBar(
          audioLevel: audioLevel,
          index: index,
          totalBars: barCount
        )
      }
    }
  }
}

struct WaveformBar: View {
  let audioLevel: Float
  let index: Int
  let totalBars: Int

  @State private var animatedHeight: CGFloat = 0.1

  private var targetHeight: CGFloat {
    // Create a wave pattern based on position and audio level
    let centerDistance = abs(CGFloat(index) - CGFloat(totalBars) / 2) / CGFloat(totalBars / 2)
    let baseHeight: CGFloat = 0.1
    let maxHeight = CGFloat(audioLevel) * (1 - centerDistance * 0.5)
    return max(baseHeight, maxHeight)
  }

  var body: some View {
    RoundedRectangle(cornerRadius: 2)
      .fill(
        LinearGradient(
          colors: [.accentColor, .accentColor.opacity(0.6)],
          startPoint: .top,
          endPoint: .bottom
        )
      )
      .frame(width: 4, height: animatedHeight * 50)
      .animation(
        .easeInOut(duration: 0.1).delay(Double(index) * 0.01),
        value: animatedHeight
      )
      .onChange(of: audioLevel) { _, _ in
        animatedHeight = targetHeight
      }
      .onAppear {
        animatedHeight = targetHeight
      }
  }
}

// MARK: - Compact Voice Button

/// A compact voice input button for inline use
struct CompactVoiceButton: View {
  @State private var speechManager = SpeechRecognitionManager.shared
  var onTranscription: ((String) -> Void)?

  @State private var showPermissionAlert = false

  var body: some View {
    Button {
      Task {
        await toggleRecording()
      }
    } label: {
      ZStack {
        if speechManager.isListening {
          Circle()
            .stroke(Color.red.opacity(0.3), lineWidth: 2)
            .frame(width: 44, height: 44)
            .scaleEffect(1 + CGFloat(speechManager.audioLevel) * 0.2)
            .animation(.easeInOut(duration: 0.1), value: speechManager.audioLevel)
        }

        Circle()
          .fill(speechManager.isListening ? Color.red : Color.accentColor.opacity(0.1))
          .frame(width: 36, height: 36)

        Image(systemName: speechManager.isListening ? "stop.fill" : "mic.fill")
          .font(.subheadline)
          .foregroundStyle(speechManager.isListening ? .white : .accentColor)
      }
    }
    .buttonStyle(.plain)
    .alert("voiceinput.permission_title".localized, isPresented: $showPermissionAlert) {
      Button("voiceinput.open_settings".localized) {
        if let url = URL(string: UIApplication.openSettingsURLString) {
          UIApplication.shared.open(url)
        }
      }
      Button("common.cancel".localized, role: .cancel) {}
    } message: {
      Text("voiceinput.permission_message".localized)
    }
    .onChange(of: speechManager.transcribedText) { _, newValue in
      if !newValue.isEmpty {
        onTranscription?(newValue)
      }
    }
  }

  private func toggleRecording() async {
    if speechManager.isListening {
      speechManager.stopListening()
    } else {
      do {
        try await speechManager.startListening()
      } catch SpeechRecognitionError.notAuthorized {
        showPermissionAlert = true
      } catch {
        // Handle error
      }
    }
  }
}

// MARK: - Voice Memo Recording View

struct VoiceMemoRecordingView: View {
  @State private var memoManager = VoiceMemoManager.shared
  @State private var isRecording = false
  @State private var memoTitle = ""
  @State private var showSaveSheet = false

  var associatedItineraryId: UUID?
  var onSave: ((VoiceMemo) -> Void)?

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      // Recording indicator
      if memoManager.isRecording {
        VStack(spacing: DesignTokens.Spacing.sm) {
          // Waveform
          WaveformView(audioLevel: memoManager.audioLevel)
            .frame(height: 60)

          // Duration
          Text(formatDuration(memoManager.recordingDuration))
            .font(.title2)
            .monospacedDigit()
            .foregroundStyle(.red)

          HStack(spacing: DesignTokens.Spacing.xs) {
            Circle()
              .fill(.red)
              .frame(width: 8, height: 8)
            Text("voiceinput.recording".localized)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
        .padding()
      }

      // Record button
      HStack(spacing: DesignTokens.Spacing.xl) {
        if memoManager.isRecording {
          // Cancel button
          Button {
            memoManager.cancelRecording()
          } label: {
            VStack(spacing: 4) {
              Circle()
                .fill(Sunpebble.ink.opacity(0.06))
                .frame(width: 56, height: 56)
                .overlay {
                  Image(systemName: "xmark")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                }
              Text("common.cancel".localized)
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
          VStack(spacing: 4) {
            ZStack {
              Circle()
                .fill(memoManager.isRecording ? Color.red : Color.accentColor)
                .frame(width: 72, height: 72)
                .shadow(color: (memoManager.isRecording ? Color.red : Color.accentColor).opacity(0.3),
                        radius: 8, y: 4)

              if memoManager.isRecording {
                RoundedRectangle(cornerRadius: 4)
                  .fill(.white)
                  .frame(width: 24, height: 24)
              } else {
                Circle()
                  .fill(.white)
                  .frame(width: 28, height: 28)
              }
            }
            Text(memoManager.isRecording ? "voiceinput.stop".localized : "voiceinput.record".localized)
              .font(.caption)
              .foregroundStyle(.primary)
          }
        }
        .buttonStyle(.plain)
        .sensoryFeedback(.impact, trigger: memoManager.isRecording)
      }
    }
    .sheet(isPresented: $showSaveSheet) {
      saveMemoSheet
    }
  }

  private var saveMemoSheet: some View {
    NavigationStack {
      Form {
        Section("voiceinput.memo_title_section".localized) {
          TextField("voiceinput.memo_title_placeholder".localized, text: $memoTitle)
        }
      }
      .navigationTitle("voiceinput.save_memo_title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("common.cancel".localized) {
            showSaveSheet = false
            memoTitle = ""
          }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.save".localized) {
            if let memo = memoManager.stopRecording(
              title: memoTitle.isEmpty ? nil : memoTitle,
              associatedItineraryId: associatedItineraryId
            ) {
              onSave?(memo)
            }
            showSaveSheet = false
            memoTitle = ""
          }
          .fontWeight(.semibold)
        }
      }
    }
    .presentationDetents([.height(200)])
  }

  private func toggleRecording() async {
    if memoManager.isRecording {
      showSaveSheet = true
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

// MARK: - Voice Memo List View

struct VoiceMemoListView: View {
  @State private var memoManager = VoiceMemoManager.shared
  @State private var playingMemoId: UUID?

  var itineraryId: UUID?

  private var displayedMemos: [VoiceMemo] {
    if let id = itineraryId {
      return memoManager.memosForItinerary(id)
    }
    return memoManager.memos
  }

  var body: some View {
    List {
      ForEach(displayedMemos) { memo in
        VoiceMemoRow(
          memo: memo,
          isPlaying: playingMemoId == memo.id,
          playbackProgress: memoManager.playbackProgress,
          onPlay: {
            playMemo(memo)
          },
          onStop: {
            memoManager.stopPlayback()
            playingMemoId = nil
          }
        )
      }
      .onDelete { offsets in
        for index in offsets {
          memoManager.delete(displayedMemos[index])
        }
      }
    }
    .overlay {
      if displayedMemos.isEmpty {
        ContentUnavailableView {
          Label("voiceinput.no_memos".localized, systemImage: "mic.slash")
        } description: {
          Text("voiceinput.no_memos_description".localized)
        }
      }
    }
    .onChange(of: memoManager.isPlaying) { _, isPlaying in
      if !isPlaying {
        playingMemoId = nil
      }
    }
  }

  private func playMemo(_ memo: VoiceMemo) {
    do {
      try memoManager.play(memo)
      playingMemoId = memo.id
    } catch {
      // Handle error
    }
  }
}

struct VoiceMemoRow: View {
  let memo: VoiceMemo
  let isPlaying: Bool
  let playbackProgress: Float
  let onPlay: () -> Void
  let onStop: () -> Void

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Play/Stop button
      Button {
        if isPlaying {
          onStop()
        } else {
          onPlay()
        }
      } label: {
        Circle()
          .fill(isPlaying ? Color.red : Color.accentColor)
          .frame(width: 44, height: 44)
          .overlay {
            Image(systemName: isPlaying ? "stop.fill" : "play.fill")
              .font(.subheadline)
              .foregroundStyle(.white)
          }
      }
      .buttonStyle(.plain)

      VStack(alignment: .leading, spacing: 4) {
        Text(memo.title)
          .font(.subheadline)
          .fontWeight(.medium)

        HStack(spacing: DesignTokens.Spacing.sm) {
          Text(memo.formattedDuration)
            .font(.caption)
            .foregroundStyle(.secondary)

          Text(memo.createdAt, style: .date)
            .font(.caption)
            .foregroundStyle(.tertiary)
        }

        // Progress bar when playing
        if isPlaying {
          GeometryReader { geometry in
            ZStack(alignment: .leading) {
              RoundedRectangle(cornerRadius: 2)
                .fill(Sunpebble.ink.opacity(0.06))
                .frame(height: 4)

              RoundedRectangle(cornerRadius: 2)
                .fill(Color.accentColor)
                .frame(width: geometry.size.width * CGFloat(playbackProgress), height: 4)
            }
          }
          .frame(height: 4)
        }

        // Transcription preview
        if let transcription = memo.transcription {
          Text(transcription)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }
      }

      Spacer()
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Previews

#Preview("Voice Input") {
  VoiceInputView()
    .padding()
}

#Preview("Waveform") {
  VStack(spacing: 20) {
    WaveformView(audioLevel: 0.2)
      .frame(height: 60)
    WaveformView(audioLevel: 0.5)
      .frame(height: 60)
    WaveformView(audioLevel: 0.8)
      .frame(height: 60)
  }
  .padding()
}

#Preview("Memo Recording") {
  VoiceMemoRecordingView()
    .padding()
}
