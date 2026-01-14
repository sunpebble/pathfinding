import Foundation

// MARK: - Translation Result

/// Result of a text translation
struct TranslationResult: Codable, Identifiable, Equatable {
  var id: String { "\(sourceText)-\(targetLang)" }

  let sourceText: String
  let sourceLang: String
  let targetText: String
  let targetLang: String
  let confidence: Double?
  let alternatives: [String]?
  let pinyin: String?
  let pronunciation: String?

  enum CodingKeys: String, CodingKey {
    case sourceText = "source_text"
    case sourceLang = "source_lang"
    case targetText = "target_text"
    case targetLang = "target_lang"
    case confidence
    case alternatives
    case pinyin
    case pronunciation
  }
}

// MARK: - OCR Result

/// Result of OCR text extraction
struct OCRResult: Codable, Identifiable, Equatable {
  var id: String { text }

  let text: String
  let confidence: Double
  let boundingBox: BoundingBox?

  struct BoundingBox: Codable, Equatable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
  }

  enum CodingKeys: String, CodingKey {
    case text
    case confidence
    case boundingBox = "bounding_box"
  }
}

// MARK: - Photo Translation Result

/// Result of photo (OCR + translation) translation
struct PhotoTranslationResult: Codable, Equatable {
  let ocrResults: [OCRResult]
  let translations: [TranslationResult]
  let imageUrl: String?

  enum CodingKeys: String, CodingKey {
    case ocrResults = "ocr_results"
    case translations
    case imageUrl = "image_url"
  }
}

// MARK: - Voice Translation Result

/// Result of voice translation
struct VoiceTranslationResult: Codable, Equatable {
  let recognizedText: String
  let translation: TranslationResult
  let audioUrl: String?

  enum CodingKeys: String, CodingKey {
    case recognizedText = "recognized_text"
    case translation
    case audioUrl = "audio_url"
  }
}

// MARK: - Supported Language

/// Supported translation language
struct SupportedLanguage: Codable, Identifiable, Equatable, Hashable {
  var id: String { code }

  let code: String
  let name: String
  let nameZh: String

  enum CodingKeys: String, CodingKey {
    case code
    case name
    case nameZh = "name_zh"
  }

  /// Display name based on device language
  var displayName: String {
    Locale.current.language.languageCode?.identifier == "zh" ? nameZh : name
  }

  /// Flag emoji for the language
  var flagEmoji: String {
    switch code {
    case "zh": return "🇨🇳"
    case "en": return "🇺🇸"
    case "ja": return "🇯🇵"
    case "ko": return "🇰🇷"
    case "fr": return "🇫🇷"
    case "de": return "🇩🇪"
    case "es": return "🇪🇸"
    case "it": return "🇮🇹"
    case "ru": return "🇷🇺"
    case "th": return "🇹🇭"
    case "vi": return "🇻🇳"
    default: return "🌐"
    }
  }
}

// MARK: - Phrase Category

/// Category for travel phrases
struct PhraseCategory: Codable, Identifiable, Equatable {
  let id: String
  let name: String
  let nameZh: String
  let icon: String
  let phraseCount: Int

  enum CodingKeys: String, CodingKey {
    case id
    case name
    case nameZh = "name_zh"
    case icon
    case phraseCount = "phrase_count"
  }

  /// Display name based on device language
  var displayName: String {
    Locale.current.language.languageCode?.identifier == "zh" ? nameZh : name
  }

  /// SF Symbol for the category
  var sfSymbol: String {
    switch id {
    case "greeting": return "hand.wave"
    case "transportation": return "car.fill"
    case "dining": return "fork.knife"
    case "shopping": return "bag.fill"
    case "accommodation": return "bed.double.fill"
    case "emergency": return "exclamationmark.triangle.fill"
    case "directions": return "map.fill"
    case "numbers": return "number"
    case "time": return "clock.fill"
    case "common": return "text.bubble.fill"
    default: return "text.quote"
    }
  }
}

// MARK: - Translation Phrase

/// A phrase from the phrasebook with translations
struct TranslationPhrase: Codable, Identifiable, Equatable {
  let id: String
  let category: String
  let sourceText: String
  let sourceLang: String
  let translations: [PhraseTranslation]
  let audioUrls: [PhraseAudio]?
  let usageContext: String?

  struct PhraseTranslation: Codable, Equatable {
    let lang: String
    let text: String
    let pinyin: String?
    let pronunciation: String?
  }

  struct PhraseAudio: Codable, Equatable {
    let lang: String
    let url: String
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case category
    case sourceText = "source_text"
    case sourceLang = "source_lang"
    case translations
    case audioUrls = "audio_urls"
    case usageContext = "usage_context"
  }

  /// Get translation for a specific language
  func translation(for lang: String) -> PhraseTranslation? {
    translations.first { $0.lang == lang }
  }
}

// MARK: - Saved Translation

/// User's saved translation history
struct SavedTranslation: Codable, Identifiable, Equatable {
  let id: String
  let userId: String
  let sourceText: String
  let sourceLang: String
  let targetText: String
  let targetLang: String
  let translationType: TranslationType
  let imageUrl: String?
  let audioUrl: String?
  let isFavorite: Bool
  let usageCount: Int
  let lastUsedAt: Date
  let createdAt: Date
  let notes: String?

  enum TranslationType: String, Codable {
    case text
    case photo
    case voice
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case sourceText = "source_text"
    case sourceLang = "source_lang"
    case targetText = "target_text"
    case targetLang = "target_lang"
    case translationType = "translation_type"
    case imageUrl = "image_url"
    case audioUrl = "audio_url"
    case isFavorite = "is_favorite"
    case usageCount = "usage_count"
    case lastUsedAt = "last_used_at"
    case createdAt = "created_at"
    case notes
  }
}

// MARK: - Offline Translation Pack

/// Downloadable offline translation pack
struct OfflineTranslationPack: Codable, Identifiable, Equatable {
  let id: String
  let name: String
  let description: String
  let sourceLang: String
  let targetLang: String
  let version: String
  let phraseCount: Int
  let downloadSize: Int
  let downloadUrl: String
  let categories: [String]
  let isActive: Bool

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case name
    case description
    case sourceLang = "source_lang"
    case targetLang = "target_lang"
    case version
    case phraseCount = "phrase_count"
    case downloadSize = "download_size"
    case downloadUrl = "download_url"
    case categories
    case isActive = "is_active"
  }

  /// Formatted download size
  var formattedDownloadSize: String {
    let formatter = ByteCountFormatter()
    formatter.allowedUnits = [.useMB, .useKB]
    formatter.countStyle = .file
    return formatter.string(fromByteCount: Int64(downloadSize))
  }

  /// Language pair display name
  var languagePair: String {
    "\(sourceLang.uppercased()) -> \(targetLang.uppercased())"
  }
}

// MARK: - User Offline Pack

/// User's downloaded offline pack
struct UserOfflinePack: Codable, Identifiable, Equatable {
  let id: String
  let userId: String
  let packId: String
  let downloadedVersion: String
  let downloadedAt: Date
  let lastSyncedAt: Date
  let pack: OfflineTranslationPack?
  let hasUpdate: Bool

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case packId = "pack_id"
    case downloadedVersion = "downloaded_version"
    case downloadedAt = "downloaded_at"
    case lastSyncedAt = "last_synced_at"
    case pack
    case hasUpdate = "has_update"
  }
}

// MARK: - API Response Wrappers

struct TranslationResultResponse: Codable {
  let success: Bool
  let data: TranslationResult
}

struct PhotoTranslationResultResponse: Codable {
  let success: Bool
  let data: PhotoTranslationResult
}

struct VoiceTranslationResultResponse: Codable {
  let success: Bool
  let data: VoiceTranslationResult
}

struct BatchTranslationResultResponse: Codable {
  let success: Bool
  let data: [TranslationResult]
  let count: Int
}

struct SupportedLanguagesResponse: Codable {
  let success: Bool
  let data: [SupportedLanguage]
}

struct PhraseCategoriesResponse: Codable {
  let success: Bool
  let data: [PhraseCategory]
}

struct TranslationPhrasesResponse: Codable {
  let success: Bool
  let data: [TranslationPhrase]
  let count: Int
}

struct SavedTranslationsResponse: Codable {
  let success: Bool
  let data: [SavedTranslation]
  let count: Int
}

struct OfflinePacksResponse: Codable {
  let success: Bool
  let data: [OfflineTranslationPack]
  let count: Int
}

struct UserOfflinePacksResponse: Codable {
  let success: Bool
  let data: [UserOfflinePack]
  let count: Int
}

struct LanguageDetectionResponse: Codable {
  let success: Bool
  let data: LanguageDetectionResult

  struct LanguageDetectionResult: Codable {
    let language: String
    let text: String
  }
}

struct PinyinResponse: Codable {
  let success: Bool
  let data: PinyinResult

  struct PinyinResult: Codable {
    let text: String
    let pinyin: String?
  }
}
