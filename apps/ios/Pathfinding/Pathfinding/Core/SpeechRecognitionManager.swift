import AVFAudio
import AVFoundation
import Foundation
import Observation
import OSLog
import Speech

/// Speech recognition manager using iOS Speech framework
@MainActor
@Observable
final class SpeechRecognitionManager {
  static let shared = SpeechRecognitionManager()

  // MARK: - Properties

  /// Current recognition state
  private(set) var isListening = false

  /// Authorization status for speech recognition
  private(set) var authorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined

  /// Microphone authorization status
  private(set) var microphoneStatus: AVAudioApplication.recordPermission = .undetermined

  /// Current transcribed text
  private(set) var transcribedText = ""

  /// Real-time partial recognition result
  private(set) var partialText = ""

  /// Audio level for waveform visualization (0.0 to 1.0)
  private(set) var audioLevel: Float = 0.0

  /// Error message if recognition fails
  private(set) var errorMessage: String?

  /// Whether all permissions are granted
  var isAuthorized: Bool {
    authorizationStatus == .authorized && microphoneStatus == .granted
  }

  // MARK: - Private Properties

  private let logger = Logger(subsystem: "com.sunpebble.trips", category: "SpeechRecognition")
  private let speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private let audioEngine = AVAudioEngine()

  // Audio level metering
  private var audioLevelTimer: Timer?

  // MARK: - Initialization

  private init() {
    // Initialize with Chinese language
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))
    checkPermissions()
  }

  // MARK: - Permission Management

  /// Check and update authorization status
  func checkPermissions() {
    authorizationStatus = SFSpeechRecognizer.authorizationStatus()
    microphoneStatus = AVAudioApplication.shared.recordPermission
  }

  /// Request all necessary permissions
  func requestPermissions() async -> Bool {
    // Request speech recognition permission
    let speechAuthorized = await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status == .authorized)
      }
    }

    guard speechAuthorized else {
      authorizationStatus = SFSpeechRecognizer.authorizationStatus()
      errorMessage = "语音识别权限被拒绝"
      logger.error("Speech recognition authorization denied")
      return false
    }

    // Request microphone permission
    let micAuthorized = await withCheckedContinuation { continuation in
      AVAudioApplication.requestRecordPermission { granted in
        continuation.resume(returning: granted)
      }
    }

    guard micAuthorized else {
      microphoneStatus = .denied
      errorMessage = "麦克风权限被拒绝"
      logger.error("Microphone authorization denied")
      return false
    }

    authorizationStatus = .authorized
    microphoneStatus = .granted
    logger.info("All permissions granted")
    return true
  }

  // MARK: - Recognition Control

  /// Start speech recognition
  func startListening() async throws {
    guard let speechRecognizer, speechRecognizer.isAvailable else {
      throw SpeechRecognitionError.recognizerNotAvailable
    }

    if !isAuthorized {
      let granted = await requestPermissions()
      if !granted {
        throw SpeechRecognitionError.notAuthorized
      }
    }

    // Stop any existing recognition
    if isListening {
      stopListening()
    }

    // Configure audio session
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playAndRecord, mode: .measurement, options: .duckOthers)
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    // Create recognition request
    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest else {
      throw SpeechRecognitionError.requestCreationFailed
    }

    recognitionRequest.shouldReportPartialResults = true
    recognitionRequest.taskHint = .dictation

    // Get input node
    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)

    // Install tap on input node
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
      self?.recognitionRequest?.append(buffer)
      self?.updateAudioLevel(buffer: buffer)
    }

    // Start audio engine
    audioEngine.prepare()
    try audioEngine.start()

    // Start recognition task
    recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      Task { @MainActor [weak self] in
        guard let self else { return }

        if let result {
          let text = result.bestTranscription.formattedString
          if result.isFinal {
            self.transcribedText = text
            self.partialText = ""
            self.logger.info("Final transcription: \(text)")
          } else {
            self.partialText = text
          }
        }

        if let error {
          self.logger.error("Recognition error: \(error.localizedDescription)")
          if (error as NSError).code != 203 && (error as NSError).code != 216 {
            // Ignore cancelled errors
            self.errorMessage = error.localizedDescription
          }
          self.stopListening()
        }
      }
    }

    isListening = true
    errorMessage = nil
    logger.info("Started listening")

    // Start audio level timer
    startAudioLevelMonitoring()
  }

  /// Stop speech recognition
  func stopListening() {
    audioLevelTimer?.invalidate()
    audioLevelTimer = nil

    audioEngine.stop()
    audioEngine.inputNode.removeTap(onBus: 0)

    recognitionRequest?.endAudio()
    recognitionRequest = nil

    recognitionTask?.cancel()
    recognitionTask = nil

    isListening = false
    audioLevel = 0.0

    // Finalize partial text to transcribed text if needed
    if !partialText.isEmpty {
      transcribedText = partialText
      partialText = ""
    }

    logger.info("Stopped listening")
  }

  /// Clear all recognition state
  func reset() {
    stopListening()
    transcribedText = ""
    partialText = ""
    errorMessage = nil
  }

  // MARK: - Audio Level Monitoring

  private func updateAudioLevel(buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData?[0] else { return }
    let frameLength = Int(buffer.frameLength)

    var sum: Float = 0
    for i in 0..<frameLength {
      sum += abs(channelData[i])
    }
    let average = sum / Float(frameLength)

    // Normalize to 0-1 range with some amplification
    let normalizedLevel = min(average * 10, 1.0)

    Task { @MainActor [weak self] in
      self?.audioLevel = normalizedLevel
    }
  }

  private func startAudioLevelMonitoring() {
    audioLevelTimer?.invalidate()
    audioLevelTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
      // Timer keeps the audio level updates flowing
      // Actual level is updated in updateAudioLevel()
    }
  }
}

// MARK: - Speech Recognition Error

enum SpeechRecognitionError: LocalizedError {
  case recognizerNotAvailable
  case notAuthorized
  case requestCreationFailed
  case audioSessionError(Error)

  var errorDescription: String? {
    switch self {
    case .recognizerNotAvailable:
      return "语音识别服务不可用"
    case .notAuthorized:
      return "未获得语音识别权限"
    case .requestCreationFailed:
      return "创建语音识别请求失败"
    case .audioSessionError(let error):
      return "音频会话错误: \(error.localizedDescription)"
    }
  }
}
