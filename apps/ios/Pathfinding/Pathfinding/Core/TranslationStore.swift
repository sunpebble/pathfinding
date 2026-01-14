import Foundation
import OSLog
import SwiftUI

/// Store for managing translation state and operations
@Observable
@MainActor
final class TranslationStore {
  // MARK: - Singleton

  static let shared = TranslationStore()

  // MARK: - Properties

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "TranslationStore")

  // State
  var isLoading = false
  var errorMessage: String?

  // Languages
  var supportedLanguages: [SupportedLanguage] = []
  var sourceLang: String = "auto"
  var targetLang: String = "zh"

  // Translation results
  var currentTranslation: TranslationResult?
  var translationHistory: [TranslationResult] = []

  // Phrases
  var phraseCategories: [PhraseCategory] = []
  var currentPhrases: [TranslationPhrase] = []
  var selectedCategory: String?

  // Saved translations
  var savedTranslations: [SavedTranslation] = []
  var favoriteTranslations: [SavedTranslation] = []

  // Offline packs
  var availablePacks: [OfflineTranslationPack] = []
  var downloadedPacks: [UserOfflinePack] = []

  // MARK: - Initialization

  private init() {
    // Set default languages based on device locale
    if let deviceLang = Locale.current.language.languageCode?.identifier {
      if deviceLang == "zh" {
        sourceLang = "zh"
        targetLang = "en"
      } else {
        sourceLang = deviceLang
        targetLang = "zh"
      }
    }
  }

  // MARK: - Language Methods

  /// Load supported languages from API
  func loadSupportedLanguages() async {
    do {
      supportedLanguages = try await APIClient.shared.fetchSupportedLanguages()
      logger.info("Loaded \(self.supportedLanguages.count) supported languages")
    } catch {
      logger.error("Failed to load supported languages: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }
  }

  /// Swap source and target languages
  func swapLanguages() {
    guard sourceLang != "auto" else { return }
    let temp = sourceLang
    sourceLang = targetLang
    targetLang = temp
  }

  // MARK: - Translation Methods

  /// Translate text
  func translateText(_ text: String) async -> TranslationResult? {
    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return nil
    }

    isLoading = true
    errorMessage = nil

    do {
      let result = try await APIClient.shared.translateText(
        text: text,
        targetLang: targetLang,
        sourceLang: sourceLang == "auto" ? nil : sourceLang
      )

      currentTranslation = result

      // Add to history (avoid duplicates)
      if !translationHistory.contains(where: { $0.id == result.id }) {
        translationHistory.insert(result, at: 0)
        // Keep only last 50 translations
        if translationHistory.count > 50 {
          translationHistory = Array(translationHistory.prefix(50))
        }
      }

      logger.info("Translation completed: \(result.sourceLang) -> \(result.targetLang)")
      isLoading = false
      return result
    } catch {
      logger.error("Translation failed: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return nil
    }
  }

  /// Translate photo (OCR + translation)
  func translatePhoto(_ imageData: Data) async -> PhotoTranslationResult? {
    isLoading = true
    errorMessage = nil

    do {
      let base64Image = imageData.base64EncodedString()
      let result = try await APIClient.shared.translatePhoto(
        imageBase64: base64Image,
        targetLang: targetLang
      )

      logger.info("Photo translation completed: \(result.ocrResults.count) OCR results")
      isLoading = false
      return result
    } catch {
      logger.error("Photo translation failed: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return nil
    }
  }

  /// Translate voice input
  func translateVoice(recognizedText: String) async -> VoiceTranslationResult? {
    guard !recognizedText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return nil
    }

    isLoading = true
    errorMessage = nil

    do {
      let result = try await APIClient.shared.translateVoice(
        recognizedText: recognizedText,
        targetLang: targetLang,
        sourceLang: sourceLang == "auto" ? nil : sourceLang
      )

      currentTranslation = result.translation
      logger.info("Voice translation completed")
      isLoading = false
      return result
    } catch {
      logger.error("Voice translation failed: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return nil
    }
  }

  /// Batch translate multiple texts
  func translateBatch(_ texts: [String]) async -> [TranslationResult] {
    isLoading = true
    errorMessage = nil

    do {
      let results = try await APIClient.shared.translateBatch(
        texts: texts,
        targetLang: targetLang,
        sourceLang: sourceLang == "auto" ? nil : sourceLang
      )

      logger.info("Batch translation completed: \(results.count) results")
      isLoading = false
      return results
    } catch {
      logger.error("Batch translation failed: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return []
    }
  }

  /// Detect language of text
  func detectLanguage(_ text: String) async -> String? {
    do {
      let lang = try await APIClient.shared.detectLanguage(text: text)
      logger.info("Detected language: \(lang)")
      return lang
    } catch {
      logger.error("Language detection failed: \(error.localizedDescription)")
      return nil
    }
  }

  /// Get pinyin for Chinese text
  func getPinyin(_ text: String) async -> String? {
    do {
      let pinyin = try await APIClient.shared.getPinyin(text: text)
      return pinyin
    } catch {
      logger.error("Pinyin generation failed: \(error.localizedDescription)")
      return nil
    }
  }

  // MARK: - Phrase Methods

  /// Load phrase categories
  func loadCategories() async {
    do {
      phraseCategories = try await APIClient.shared.fetchPhraseCategories(sourceLang: sourceLang)
      logger.info("Loaded \(self.phraseCategories.count) phrase categories")
    } catch {
      logger.error("Failed to load categories: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }
  }

  /// Load phrases for a category
  func loadPhrases(category: String) async {
    isLoading = true
    selectedCategory = category

    do {
      currentPhrases = try await APIClient.shared.fetchPhrases(
        category: category,
        sourceLang: sourceLang
      )
      logger.info("Loaded \(self.currentPhrases.count) phrases for category: \(category)")
      isLoading = false
    } catch {
      logger.error("Failed to load phrases: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
    }
  }

  /// Search phrases
  func searchPhrases(query: String, category: String? = nil) async -> [TranslationPhrase] {
    do {
      let results = try await APIClient.shared.searchPhrases(
        query: query,
        category: category,
        sourceLang: sourceLang
      )
      logger.info("Found \(results.count) phrases matching: \(query)")
      return results
    } catch {
      logger.error("Failed to search phrases: \(error.localizedDescription)")
      return []
    }
  }

  // MARK: - Saved Translations Methods

  /// Load saved translations for user
  func loadSavedTranslations(userId: String) async {
    isLoading = true

    do {
      savedTranslations = try await APIClient.shared.fetchSavedTranslations(userId: userId)
      favoriteTranslations = savedTranslations.filter { $0.isFavorite }
      logger.info("Loaded \(self.savedTranslations.count) saved translations")
      isLoading = false
    } catch {
      logger.error("Failed to load saved translations: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
    }
  }

  /// Save a translation
  func saveTranslation(
    userId: String,
    result: TranslationResult,
    type: SavedTranslation.TranslationType = .text,
    imageUrl: String? = nil,
    audioUrl: String? = nil,
    notes: String? = nil
  ) async -> Bool {
    do {
      try await APIClient.shared.saveTranslation(
        userId: userId,
        sourceText: result.sourceText,
        sourceLang: result.sourceLang,
        targetText: result.targetText,
        targetLang: result.targetLang,
        translationType: type.rawValue,
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        notes: notes
      )
      logger.info("Translation saved successfully")

      // Reload saved translations
      await loadSavedTranslations(userId: userId)
      return true
    } catch {
      logger.error("Failed to save translation: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Toggle favorite status
  func toggleFavorite(translationId: String, userId: String) async -> Bool {
    do {
      let isFavorite = try await APIClient.shared.toggleTranslationFavorite(id: translationId)
      logger.info("Toggled favorite: \(isFavorite)")

      // Reload saved translations
      await loadSavedTranslations(userId: userId)
      return true
    } catch {
      logger.error("Failed to toggle favorite: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  /// Delete saved translation
  func deleteSavedTranslation(id: String, userId: String) async -> Bool {
    do {
      try await APIClient.shared.deleteSavedTranslation(id: id)
      logger.info("Deleted saved translation: \(id)")

      // Reload saved translations
      await loadSavedTranslations(userId: userId)
      return true
    } catch {
      logger.error("Failed to delete translation: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  // MARK: - Offline Packs Methods

  /// Load available offline packs
  func loadAvailablePacks() async {
    do {
      availablePacks = try await APIClient.shared.fetchOfflinePacks(
        sourceLang: sourceLang,
        targetLang: targetLang
      )
      logger.info("Loaded \(self.availablePacks.count) available offline packs")
    } catch {
      logger.error("Failed to load offline packs: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }
  }

  /// Load user's downloaded packs
  func loadDownloadedPacks(userId: String) async {
    do {
      downloadedPacks = try await APIClient.shared.fetchUserPacks(userId: userId)
      logger.info("Loaded \(self.downloadedPacks.count) downloaded packs")
    } catch {
      logger.error("Failed to load downloaded packs: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
    }
  }

  /// Download an offline pack
  func downloadPack(packId: String, userId: String) async -> Bool {
    isLoading = true

    do {
      try await APIClient.shared.recordPackDownload(packId: packId, userId: userId)
      logger.info("Downloaded pack: \(packId)")

      // Reload downloaded packs
      await loadDownloadedPacks(userId: userId)
      isLoading = false
      return true
    } catch {
      logger.error("Failed to download pack: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      isLoading = false
      return false
    }
  }

  /// Delete downloaded pack
  func deletePack(id: String, userId: String) async -> Bool {
    do {
      try await APIClient.shared.deleteUserPack(id: id)
      logger.info("Deleted pack: \(id)")

      // Reload downloaded packs
      await loadDownloadedPacks(userId: userId)
      return true
    } catch {
      logger.error("Failed to delete pack: \(error.localizedDescription)")
      errorMessage = error.localizedDescription
      return false
    }
  }

  // MARK: - Helper Methods

  /// Clear current translation
  func clearTranslation() {
    currentTranslation = nil
  }

  /// Clear error message
  func clearError() {
    errorMessage = nil
  }

  /// Clear translation history
  func clearHistory() {
    translationHistory.removeAll()
  }
}
