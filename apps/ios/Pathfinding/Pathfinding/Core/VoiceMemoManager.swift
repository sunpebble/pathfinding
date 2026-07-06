@preconcurrency import AVFoundation
@preconcurrency import AVFAudio
import Foundation
import Observation
import OSLog
@preconcurrency import Speech

/// Manager for recording, transcribing, and storing voice memos
@MainActor
@Observable
final class VoiceMemoManager {
  static let shared = VoiceMemoManager()

  // MARK: - Properties

  /// Current recording state
  private(set) var isRecording = false

  /// Current playback state
  private(set) var isPlaying = false

  /// Current transcription state
  private(set) var isTranscribing = false

  /// Current audio level for visualization (0.0 to 1.0)
  private(set) var audioLevel: Float = 0.0

  /// Recording duration in seconds
  private(set) var recordingDuration: TimeInterval = 0

  /// Playback progress (0.0 to 1.0)
  private(set) var playbackProgress: Float = 0.0

  /// Current playback time in seconds
  private(set) var playbackCurrentTime: TimeInterval = 0

  /// All saved voice memos
  private(set) var memos: [VoiceMemo] = []

  /// Error message
  private(set) var errorMessage: String?

  /// Currently playing memo ID
  private(set) var currentlyPlayingMemoId: UUID?

  // MARK: - Private Properties

  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "VoiceMemo")
  private var audioRecorder: AVAudioRecorder?
  private var audioPlayer: AVAudioPlayer?
  private var recordingTimer: Timer?
  private var playbackTimer: Timer?
  private var currentRecordingURL: URL?

  // Speech recognition
  private let speechRecognizer: SFSpeechRecognizer?

  private let fileManager = FileManager.default
  private let memosDirectoryName = "VoiceMemos"
  private let memosListFileName = "memos.json"

  // MARK: - Initialization

  private init() {
    // Initialize speech recognizer for Chinese
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))
    createMemosDirectoryIfNeeded()
    loadMemos()
  }

  // MARK: - Directory Management

  private var memosDirectory: URL {
    let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
    return documentsPath.appendingPathComponent(memosDirectoryName)
  }

  private func createMemosDirectoryIfNeeded() {
    if !fileManager.fileExists(atPath: memosDirectory.path) {
      do {
        try fileManager.createDirectory(at: memosDirectory, withIntermediateDirectories: true)
        logger.info("Created voice memos directory")
      } catch {
        logger.error("Failed to create memos directory: \(error.localizedDescription)")
      }
    }
  }

  // MARK: - Recording

  /// Start recording a voice memo
  func startRecording() async throws {
    // Request microphone permission if needed
    if AVAudioApplication.shared.recordPermission != .granted {
      let granted = await withCheckedContinuation { continuation in
        AVAudioApplication.requestRecordPermission { granted in
          continuation.resume(returning: granted)
        }
      }
      guard granted else {
        throw VoiceMemoError.microphoneNotAuthorized
      }
    }

    // Configure audio session
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playAndRecord, mode: .default, options: .defaultToSpeaker)
    try audioSession.setActive(true)

    // Create recording URL
    let fileName = "memo_\(Date().timeIntervalSince1970).m4a"
    currentRecordingURL = memosDirectory.appendingPathComponent(fileName)

    guard let recordingURL = currentRecordingURL else {
      throw VoiceMemoError.recordingFailed
    }

    // Configure recorder settings
    let settings: [String: Any] = [
      AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
      AVSampleRateKey: 44100.0,
      AVNumberOfChannelsKey: 1,
      AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]

    // Create and start recorder
    audioRecorder = try AVAudioRecorder(url: recordingURL, settings: settings)
    audioRecorder?.isMeteringEnabled = true
    audioRecorder?.record()

    isRecording = true
    recordingDuration = 0
    errorMessage = nil

    // Start metering timer
    startRecordingTimer()

    logger.info("Started recording to: \(recordingURL.lastPathComponent)")
  }

  /// Stop recording and save the memo
  func stopRecording(
    title: String? = nil,
    associatedItineraryId: UUID? = nil,
    associatedPoiId: String? = nil,
    associatedDayNumber: Int? = nil,
    autoTranscribe: Bool = true
  ) -> VoiceMemo? {
    guard isRecording, let recorder = audioRecorder, let recordingURL = currentRecordingURL else {
      return nil
    }

    recorder.stop()
    stopRecordingTimer()
    isRecording = false
    audioLevel = 0.0

    // Create memo object
    let duration = recorder.currentTime
    let memo = VoiceMemo(
      id: UUID(),
      title: title ?? generateMemoTitle(),
      fileName: recordingURL.lastPathComponent,
      duration: duration,
      createdAt: Date(),
      transcription: nil,
      associatedItineraryId: associatedItineraryId,
      associatedPoiId: associatedPoiId,
      associatedDayNumber: associatedDayNumber
    )

    // Add to memos list
    memos.insert(memo, at: 0)
    saveMemos()

    logger.info("Saved memo: \(memo.title), duration: \(duration)s")

    audioRecorder = nil
    currentRecordingURL = nil

    // Auto-transcribe if enabled
    if autoTranscribe {
      Task {
        await transcribeMemo(memo)
      }
    }

    return memo
  }

  /// Cancel recording without saving
  func cancelRecording() {
    guard isRecording else { return }

    audioRecorder?.stop()
    stopRecordingTimer()
    isRecording = false
    audioLevel = 0.0

    // Delete the recording file
    if let url = currentRecordingURL {
      try? fileManager.removeItem(at: url)
      logger.info("Cancelled recording, deleted: \(url.lastPathComponent)")
    }

    audioRecorder = nil
    currentRecordingURL = nil
  }

  // MARK: - Playback

  /// Play a voice memo
  func play(_ memo: VoiceMemo) throws {
    stopPlayback()

    let fileURL = memosDirectory.appendingPathComponent(memo.fileName)
    guard fileManager.fileExists(atPath: fileURL.path) else {
      throw VoiceMemoError.fileNotFound
    }

    // Configure audio session for playback
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playback, mode: .default)
    try audioSession.setActive(true)

    audioPlayer = try AVAudioPlayer(contentsOf: fileURL)
    audioPlayer?.play()
    isPlaying = true
    playbackProgress = 0.0
    playbackCurrentTime = 0
    currentlyPlayingMemoId = memo.id

    // Start playback timer
    startPlaybackTimer()

    logger.info("Playing memo: \(memo.title)")
  }

  /// Stop playback
  func stopPlayback() {
    audioPlayer?.stop()
    audioPlayer = nil
    stopPlaybackTimer()
    isPlaying = false
    playbackProgress = 0.0
    playbackCurrentTime = 0
    currentlyPlayingMemoId = nil
  }

  /// Pause playback
  func pausePlayback() {
    audioPlayer?.pause()
    isPlaying = false
  }

  /// Resume playback
  func resumePlayback() {
    audioPlayer?.play()
    isPlaying = true
    startPlaybackTimer()
  }

  /// Seek to a specific position (0.0 to 1.0)
  func seek(to progress: Float) {
    guard let player = audioPlayer else { return }
    let newTime = Double(progress) * player.duration
    player.currentTime = newTime
    playbackProgress = progress
    playbackCurrentTime = newTime
  }

  // MARK: - Speech-to-Text Transcription

  /// Transcribe a voice memo to text
  func transcribeMemo(_ memo: VoiceMemo) async {
    guard let speechRecognizer, speechRecognizer.isAvailable else {
      logger.error("Speech recognizer not available")
      return
    }

    // Check speech recognition authorization
    let authStatus = SFSpeechRecognizer.authorizationStatus()
    if authStatus != .authorized {
      let authorized = await requestSpeechRecognitionPermission()
      guard authorized else {
        logger.error("Speech recognition permission denied")
        return
      }
    }

    isTranscribing = true
    defer { isTranscribing = false }

    let fileURL = memosDirectory.appendingPathComponent(memo.fileName)
    guard fileManager.fileExists(atPath: fileURL.path) else {
      logger.error("Audio file not found for transcription")
      return
    }

    let request = SFSpeechURLRecognitionRequest(url: fileURL)
    request.shouldReportPartialResults = false
    request.taskHint = .dictation

    do {
      let result = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<SFSpeechRecognitionResult, Error>) in
        speechRecognizer.recognitionTask(with: request) { result, error in
          if let error {
            continuation.resume(throwing: error)
          } else if let result, result.isFinal {
            continuation.resume(returning: result)
          }
        }
      }

      let transcription = result.bestTranscription.formattedString
      updateTranscription(for: memo.id, transcription: transcription)
      logger.info("Transcribed memo: \(memo.title) -> \(transcription.prefix(50))...")
    } catch {
      logger.error("Transcription failed: \(error.localizedDescription)")
    }
  }

  /// Request speech recognition permission
  private func requestSpeechRecognitionPermission() async -> Bool {
    await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status == .authorized)
      }
    }
  }

  // MARK: - Memo Management

  /// Delete a voice memo
  func delete(_ memo: VoiceMemo) {
    // Stop playback if this memo is playing
    if currentlyPlayingMemoId == memo.id {
      stopPlayback()
    }

    // Delete file
    let fileURL = memosDirectory.appendingPathComponent(memo.fileName)
    try? fileManager.removeItem(at: fileURL)

    // Remove from list
    memos.removeAll { $0.id == memo.id }
    saveMemos()

    logger.info("Deleted memo: \(memo.title)")
  }

  /// Update memo transcription
  func updateTranscription(for memoId: UUID, transcription: String) {
    if let index = memos.firstIndex(where: { $0.id == memoId }) {
      memos[index].transcription = transcription
      saveMemos()
      logger.info("Updated transcription for memo: \(self.memos[index].title)")
    }
  }

  /// Update memo title
  func updateTitle(for memoId: UUID, title: String) {
    if let index = memos.firstIndex(where: { $0.id == memoId }) {
      memos[index].title = title
      saveMemos()
    }
  }

  /// Update memo association
  func updateAssociation(
    for memoId: UUID,
    itineraryId: UUID?,
    poiId: String?,
    dayNumber: Int?
  ) {
    if let index = memos.firstIndex(where: { $0.id == memoId }) {
      memos[index].associatedItineraryId = itineraryId
      memos[index].associatedPoiId = poiId
      memos[index].associatedDayNumber = dayNumber
      saveMemos()
    }
  }

  /// Get memos for a specific itinerary
  func memosForItinerary(_ itineraryId: UUID) -> [VoiceMemo] {
    memos.filter { $0.associatedItineraryId == itineraryId }
  }

  /// Get memos for a specific POI
  func memosForPoi(_ poiId: String) -> [VoiceMemo] {
    memos.filter { $0.associatedPoiId == poiId }
  }

  /// Get memos for a specific day in an itinerary
  func memosForDay(itineraryId: UUID, dayNumber: Int) -> [VoiceMemo] {
    memos.filter { $0.associatedItineraryId == itineraryId && $0.associatedDayNumber == dayNumber }
  }

  /// Get unassociated memos
  func unassociatedMemos() -> [VoiceMemo] {
    memos.filter { $0.associatedItineraryId == nil && $0.associatedPoiId == nil }
  }

  /// Get memo by ID
  func memo(byId id: UUID) -> VoiceMemo? {
    memos.first { $0.id == id }
  }

  /// Get file URL for a memo
  func fileURL(for memo: VoiceMemo) -> URL {
    memosDirectory.appendingPathComponent(memo.fileName)
  }

  /// Check if file exists for memo
  func fileExists(for memo: VoiceMemo) -> Bool {
    fileManager.fileExists(atPath: fileURL(for: memo).path)
  }

  // MARK: - Private Helpers

  private func startRecordingTimer() {
    recordingTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
      Task { @MainActor [weak self] in
        guard let self, let recorder = self.audioRecorder else { return }
        recorder.updateMeters()

        // Get average power and convert to 0-1 range
        let power = recorder.averagePower(forChannel: 0)
        // Power is in dB, typically -160 to 0
        let normalizedPower = max(0, (power + 60) / 60)
        self.audioLevel = normalizedPower

        self.recordingDuration = recorder.currentTime
      }
    }
  }

  private func stopRecordingTimer() {
    recordingTimer?.invalidate()
    recordingTimer = nil
  }

  private func startPlaybackTimer() {
    playbackTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      Task { @MainActor [weak self] in
        guard let self, let player = self.audioPlayer else { return }

        if player.isPlaying {
          self.playbackProgress = Float(player.currentTime / player.duration)
          self.playbackCurrentTime = player.currentTime
        } else if player.currentTime >= player.duration - 0.1 {
          // Playback finished
          self.stopPlayback()
        }
      }
    }
  }

  private func stopPlaybackTimer() {
    playbackTimer?.invalidate()
    playbackTimer = nil
  }

  private func generateMemoTitle() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "MM-dd HH:mm"
    return "备忘录 \(formatter.string(from: Date()))"
  }

  private func loadMemos() {
    let listURL = memosDirectory.appendingPathComponent(memosListFileName)
    guard let data = try? Data(contentsOf: listURL) else { return }

    do {
      memos = try JSONDecoder().decode([VoiceMemo].self, from: data)
      logger.info("Loaded \(self.memos.count) voice memos")
    } catch {
      logger.error("Failed to load memos: \(error.localizedDescription)")
    }
  }

  private func saveMemos() {
    let listURL = memosDirectory.appendingPathComponent(memosListFileName)
    do {
      let data = try JSONEncoder().encode(memos)
      try data.write(to: listURL)
    } catch {
      logger.error("Failed to save memos: \(error.localizedDescription)")
    }
  }
}

// MARK: - Voice Memo Model

struct VoiceMemo: Identifiable, Codable, Hashable {
  let id: UUID
  var title: String
  let fileName: String
  let duration: TimeInterval
  let createdAt: Date
  var transcription: String?
  var associatedItineraryId: UUID?
  var associatedPoiId: String?
  var associatedDayNumber: Int?

  var formattedDuration: String {
    let minutes = Int(duration) / 60
    let seconds = Int(duration) % 60
    return String(format: "%d:%02d", minutes, seconds)
  }

  var formattedDate: String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: createdAt)
  }

  var shortDate: String {
    let formatter = DateFormatter()
    formatter.dateFormat = "MM/dd HH:mm"
    return formatter.string(from: createdAt)
  }

  var hasTranscription: Bool {
    transcription != nil && !transcription!.isEmpty
  }

  var isAssociated: Bool {
    associatedItineraryId != nil || associatedPoiId != nil
  }
}

// MARK: - Voice Memo Error

enum VoiceMemoError: LocalizedError {
  case microphoneNotAuthorized
  case recordingFailed
  case fileNotFound
  case playbackFailed
  case transcriptionFailed
  case speechRecognitionNotAuthorized

  var errorDescription: String? {
    switch self {
    case .microphoneNotAuthorized:
      return "未获得麦克风权限"
    case .recordingFailed:
      return "录音失败"
    case .fileNotFound:
      return "音频文件不存在"
    case .playbackFailed:
      return "播放失败"
    case .transcriptionFailed:
      return "语音转文字失败"
    case .speechRecognitionNotAuthorized:
      return "未获得语音识别权限"
    }
  }
}
