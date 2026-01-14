import Foundation
import OSLog
import Speech

/// Handles voice recognition for CarPlay
@MainActor
final class CarPlayVoiceCommandHandler {
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "CarPlayVoice")

  private var audioEngine: AVAudioEngine?
  private var speechRecognizer: SFSpeechRecognizer?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?

  private let commandParser = VoiceCommandParser.shared

  // MARK: - Initialization

  init() {
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-CN"))
  }

  // MARK: - Voice Recognition

  /// Start listening for voice commands
  /// - Returns: Result containing the parsed voice command or an error
  func startListening() async -> Result<VoiceCommand, Error> {
    logger.info("Starting voice recognition")

    // Check authorization
    let authStatus = await requestAuthorization()
    guard authStatus == .authorized else {
      logger.error("Speech recognition not authorized")
      return .failure(VoiceError.notAuthorized)
    }

    guard let recognizer = speechRecognizer, recognizer.isAvailable else {
      logger.error("Speech recognizer not available")
      return .failure(VoiceError.recognizerNotAvailable)
    }

    // Stop any existing recognition
    stopListening()

    return await withCheckedContinuation { continuation in
      do {
        try startRecognition { [weak self] result in
          self?.stopListening()

          switch result {
          case .success(let text):
            if let command = self?.commandParser.parse(text) {
              continuation.resume(returning: .success(command))
            } else {
              continuation.resume(returning: .failure(VoiceError.commandNotRecognized))
            }

          case .failure(let error):
            continuation.resume(returning: .failure(error))
          }
        }
      } catch {
        continuation.resume(returning: .failure(error))
      }
    }
  }

  /// Stop listening for voice commands
  func stopListening() {
    audioEngine?.stop()
    audioEngine?.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()

    audioEngine = nil
    recognitionRequest = nil
    recognitionTask = nil
  }

  // MARK: - Private Methods

  private func requestAuthorization() async -> SFSpeechRecognizerAuthorizationStatus {
    await withCheckedContinuation { continuation in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status)
      }
    }
  }

  private func startRecognition(completion: @escaping (Result<String, Error>) -> Void) throws {
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    audioEngine = AVAudioEngine()
    guard let audioEngine = audioEngine else {
      throw VoiceError.audioEngineNotAvailable
    }

    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else {
      throw VoiceError.requestCreationFailed
    }

    recognitionRequest.shouldReportPartialResults = true
    recognitionRequest.taskHint = .dictation

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
      self.recognitionRequest?.append(buffer)
    }

    audioEngine.prepare()
    try audioEngine.start()

    var finalResult: String?
    var timeoutTask: Task<Void, Never>?

    recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) {
      [weak self] result, error in

      // Cancel timeout on any result
      timeoutTask?.cancel()

      if let error = error {
        self?.logger.error("Recognition error: \(error.localizedDescription)")
        completion(.failure(error))
        return
      }

      if let result = result {
        finalResult = result.bestTranscription.formattedString
        self?.logger.info("Recognized: \(finalResult ?? "")")

        if result.isFinal {
          if let text = finalResult, !text.isEmpty {
            completion(.success(text))
          } else {
            completion(.failure(VoiceError.noSpeechDetected))
          }
        } else {
          // Set a timeout for partial results
          timeoutTask = Task {
            try? await Task.sleep(for: .seconds(2))
            if !Task.isCancelled {
              if let text = finalResult, !text.isEmpty {
                await MainActor.run {
                  completion(.success(text))
                }
              }
            }
          }
        }
      }
    }

    // Overall timeout
    Task {
      try? await Task.sleep(for: .seconds(10))
      if recognitionTask != nil && finalResult == nil {
        await MainActor.run {
          stopListening()
          completion(.failure(VoiceError.timeout))
        }
      }
    }
  }
}

// MARK: - Voice Error

enum VoiceError: LocalizedError {
  case notAuthorized
  case recognizerNotAvailable
  case audioEngineNotAvailable
  case requestCreationFailed
  case noSpeechDetected
  case commandNotRecognized
  case timeout

  var errorDescription: String? {
    switch self {
    case .notAuthorized:
      return "语音识别未授权"
    case .recognizerNotAvailable:
      return "语音识别不可用"
    case .audioEngineNotAvailable:
      return "音频引擎不可用"
    case .requestCreationFailed:
      return "无法创建语音识别请求"
    case .noSpeechDetected:
      return "未检测到语音"
    case .commandNotRecognized:
      return "无法识别命令"
    case .timeout:
      return "语音识别超时"
    }
  }
}
