import Foundation

/// API client for translation-related operations
actor TranslationAPIClient {
  static let shared = TranslationAPIClient()

  private let network = NetworkClient.shared
  private var decoder: JSONDecoder { get async { await network.decoder } }
  private var baseURL: URL { get async { await network.baseURL } }

  private init() {}

  // MARK: - Translation APIs

  /// Fetch supported languages
  func fetchSupportedLanguages() async throws -> [SupportedLanguage] {
    let url = await baseURL.appendingPathComponent("v1/translation/languages")
    let data = try await network.fetchWithRetry(url: url)
    let result = try await decoder.decode(SupportedLanguagesResponse.self, from: data)
    return result.data
  }

  /// Translate text
  func translateText(text: String, targetLang: String, sourceLang: String?) async throws -> TranslationResult {
    let url = await baseURL.appendingPathComponent("v1/translation/text")
    let request = TranslateTextRequest(text: text, targetLang: targetLang, sourceLang: sourceLang)
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(TranslationResultResponse.self, from: data)
    return result.data
  }

  /// Translate photo (OCR + translation)
  func translatePhoto(imageBase64: String, targetLang: String) async throws -> PhotoTranslationResult {
    let url = await baseURL.appendingPathComponent("v1/translation/photo")
    let request = TranslatePhotoRequest(imageBase64: imageBase64, targetLang: targetLang)
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(PhotoTranslationResultResponse.self, from: data)
    return result.data
  }

  /// Translate voice
  func translateVoice(recognizedText: String, targetLang: String, sourceLang: String?) async throws -> VoiceTranslationResult {
    let url = await baseURL.appendingPathComponent("v1/translation/voice")
    let request = TranslateVoiceRequest(recognizedText: recognizedText, targetLang: targetLang, sourceLang: sourceLang)
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(VoiceTranslationResultResponse.self, from: data)
    return result.data
  }

  /// Batch translate texts
  func translateBatch(texts: [String], targetLang: String, sourceLang: String?) async throws -> [TranslationResult] {
    let url = await baseURL.appendingPathComponent("v1/translation/batch")
    let request = TranslateBatchRequest(texts: texts, targetLang: targetLang, sourceLang: sourceLang)
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(TranslationBatchResponse.self, from: data)
    return result.data
  }

  /// Detect language
  func detectLanguage(text: String) async throws -> String {
    let url = await baseURL.appendingPathComponent("v1/translation/detect")
    let request = DetectLanguageRequest(text: text)
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(DetectLanguageResponse.self, from: data)
    return result.data.language
  }

  /// Get pinyin for Chinese text
  func getPinyin(text: String) async throws -> String {
    let url = await baseURL.appendingPathComponent("v1/translation/pinyin")
    let request = GetPinyinRequest(text: text)
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(PinyinResponse.self, from: data)
    return result.data.pinyin ?? ""
  }

  /// Fetch phrase categories
  func fetchPhraseCategories(sourceLang: String) async throws -> [PhraseCategory] {
    var components = URLComponents(url: await baseURL.appendingPathComponent("v1/translation/phrases/categories"), resolvingAgainstBaseURL: false)!
    components.queryItems = [URLQueryItem(name: "source_lang", value: sourceLang)]
    let data = try await network.fetchWithRetry(url: components.url!)
    let result = try await decoder.decode(PhraseCategoriesResponse.self, from: data)
    return result.data
  }

  /// Fetch phrases for a category
  func fetchPhrases(categoryId: String, sourceLang: String, targetLang: String) async throws -> [TranslationPhrase] {
    var components = URLComponents(url: await baseURL.appendingPathComponent("v1/translation/phrases"), resolvingAgainstBaseURL: false)!
    components.queryItems = [
      URLQueryItem(name: "category", value: categoryId),
      URLQueryItem(name: "source_lang", value: sourceLang),
      URLQueryItem(name: "target_lang", value: targetLang)
    ]
    let data = try await network.fetchWithRetry(url: components.url!)
    let result = try await decoder.decode(PhrasesResponse.self, from: data)
    return result.data
  }

  /// Search phrases
  func searchPhrases(query: String, sourceLang: String, targetLang: String) async throws -> [TranslationPhrase] {
    var components = URLComponents(url: await baseURL.appendingPathComponent("v1/translation/phrases/search"), resolvingAgainstBaseURL: false)!
    components.queryItems = [
      URLQueryItem(name: "q", value: query),
      URLQueryItem(name: "source_lang", value: sourceLang),
      URLQueryItem(name: "target_lang", value: targetLang)
    ]
    let data = try await network.fetchWithRetry(url: components.url!)
    let result = try await decoder.decode(PhrasesResponse.self, from: data)
    return result.data
  }

  /// Fetch saved translations
  func fetchSavedTranslations(userId: String) async throws -> [SavedTranslation] {
    let url = await baseURL.appendingPathComponent("v1/translation/saved")
    let data = try await network.fetchWithRetry(url: url)
    let result = try await decoder.decode(SavedTranslationsResponse.self, from: data)
    return result.data
  }

  /// Save a translation
  func saveTranslation(sourceText: String, sourceLang: String, targetText: String, targetLang: String, translationType: SavedTranslation.TranslationType, imageUrl: String?, audioUrl: String?) async throws -> SavedTranslation {
    let url = await baseURL.appendingPathComponent("v1/translation/saved")
    let request = SaveTranslationRequest(
      sourceText: sourceText,
      sourceLang: sourceLang,
      targetText: targetText,
      targetLang: targetLang,
      translationType: translationType.rawValue,
      imageUrl: imageUrl,
      audioUrl: audioUrl
    )
    let data = try await network.postWithRetry(url: url, body: request)
    let result = try await decoder.decode(SavedTranslationResponse.self, from: data)
    return result.data
  }

  /// Toggle translation favorite
  func toggleTranslationFavorite(translationId: String) async throws -> SavedTranslation {
    let url = await baseURL.appendingPathComponent("v1/translation/saved/\(translationId)/favorite")
    let data = try await network.postWithRetry(url: url, body: EmptyBody())
    let result = try await decoder.decode(SavedTranslationResponse.self, from: data)
    return result.data
  }

  /// Delete saved translation
  func deleteSavedTranslation(translationId: String) async throws {
    let url = await baseURL.appendingPathComponent("v1/translation/saved/\(translationId)")
    _ = try await network.deleteWithRetry(url: url)
  }
}

// MARK: - Backward Compatibility Extension

extension APIClient {
  /// Fetch supported languages
  func fetchSupportedLanguages() async throws -> [SupportedLanguage] {
    try await TranslationAPIClient.shared.fetchSupportedLanguages()
  }

  /// Translate text
  func translateText(text: String, targetLang: String, sourceLang: String?) async throws -> TranslationResult {
    try await TranslationAPIClient.shared.translateText(text: text, targetLang: targetLang, sourceLang: sourceLang)
  }

  /// Translate photo (OCR + translation)
  func translatePhoto(imageBase64: String, targetLang: String) async throws -> PhotoTranslationResult {
    try await TranslationAPIClient.shared.translatePhoto(imageBase64: imageBase64, targetLang: targetLang)
  }

  /// Translate voice
  func translateVoice(recognizedText: String, targetLang: String, sourceLang: String?) async throws -> VoiceTranslationResult {
    try await TranslationAPIClient.shared.translateVoice(recognizedText: recognizedText, targetLang: targetLang, sourceLang: sourceLang)
  }

  /// Batch translate texts
  func translateBatch(texts: [String], targetLang: String, sourceLang: String?) async throws -> [TranslationResult] {
    try await TranslationAPIClient.shared.translateBatch(texts: texts, targetLang: targetLang, sourceLang: sourceLang)
  }

  /// Detect language
  func detectLanguage(text: String) async throws -> String {
    try await TranslationAPIClient.shared.detectLanguage(text: text)
  }

  /// Get pinyin for Chinese text
  func getPinyin(text: String) async throws -> String {
    try await TranslationAPIClient.shared.getPinyin(text: text)
  }

  /// Fetch phrase categories
  func fetchPhraseCategories(sourceLang: String) async throws -> [PhraseCategory] {
    try await TranslationAPIClient.shared.fetchPhraseCategories(sourceLang: sourceLang)
  }

  /// Fetch phrases for a category
  func fetchPhrases(categoryId: String, sourceLang: String, targetLang: String) async throws -> [TranslationPhrase] {
    try await TranslationAPIClient.shared.fetchPhrases(categoryId: categoryId, sourceLang: sourceLang, targetLang: targetLang)
  }

  /// Search phrases
  func searchPhrases(query: String, sourceLang: String, targetLang: String) async throws -> [TranslationPhrase] {
    try await TranslationAPIClient.shared.searchPhrases(query: query, sourceLang: sourceLang, targetLang: targetLang)
  }

  /// Fetch saved translations
  func fetchSavedTranslations(userId: String) async throws -> [SavedTranslation] {
    try await TranslationAPIClient.shared.fetchSavedTranslations(userId: userId)
  }

  /// Save a translation
  func saveTranslation(sourceText: String, sourceLang: String, targetText: String, targetLang: String, translationType: SavedTranslation.TranslationType, imageUrl: String?, audioUrl: String?) async throws -> SavedTranslation {
    try await TranslationAPIClient.shared.saveTranslation(sourceText: sourceText, sourceLang: sourceLang, targetText: targetText, targetLang: targetLang, translationType: translationType, imageUrl: imageUrl, audioUrl: audioUrl)
  }

  /// Toggle translation favorite
  func toggleTranslationFavorite(translationId: String) async throws -> SavedTranslation {
    try await TranslationAPIClient.shared.toggleTranslationFavorite(translationId: translationId)
  }

  /// Delete saved translation
  func deleteSavedTranslation(translationId: String) async throws {
    try await TranslationAPIClient.shared.deleteSavedTranslation(translationId: translationId)
  }
}
