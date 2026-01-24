import Foundation

// MARK: - Mark All Read Response

struct MarkAllReadResponse: Codable {
  let data: MarkAllReadData

  struct MarkAllReadData: Codable {
    let count: Int
  }
}

// MARK: - Translation Request/Response Types

struct TranslateTextRequest: Codable {
  let text: String
  let targetLang: String
  let sourceLang: String?

  enum CodingKeys: String, CodingKey {
    case text
    case targetLang = "target_lang"
    case sourceLang = "source_lang"
  }
}

struct TranslatePhotoRequest: Codable {
  let imageBase64: String
  let targetLang: String

  enum CodingKeys: String, CodingKey {
    case imageBase64 = "image_base64"
    case targetLang = "target_lang"
  }
}

struct TranslateVoiceRequest: Codable {
  let recognizedText: String
  let targetLang: String
  let sourceLang: String?

  enum CodingKeys: String, CodingKey {
    case recognizedText = "recognized_text"
    case targetLang = "target_lang"
    case sourceLang = "source_lang"
  }
}

struct TranslateBatchRequest: Codable {
  let texts: [String]
  let targetLang: String
  let sourceLang: String?

  enum CodingKeys: String, CodingKey {
    case texts
    case targetLang = "target_lang"
    case sourceLang = "source_lang"
  }
}

struct TranslationBatchResponse: Codable {
  let data: [TranslationResult]
}

struct DetectLanguageRequest: Codable {
  let text: String
}

struct DetectLanguageResponse: Codable {
  let data: DetectLanguageData

  struct DetectLanguageData: Codable {
    let language: String
  }
}

struct GetPinyinRequest: Codable {
  let text: String
}

struct PhrasesResponse: Codable {
  let data: [TranslationPhrase]
}

struct SaveTranslationRequest: Codable {
  let sourceText: String
  let sourceLang: String
  let targetText: String
  let targetLang: String
  let translationType: String
  let imageUrl: String?
  let audioUrl: String?

  enum CodingKeys: String, CodingKey {
    case sourceText = "source_text"
    case sourceLang = "source_lang"
    case targetText = "target_text"
    case targetLang = "target_lang"
    case translationType = "translation_type"
    case imageUrl = "image_url"
    case audioUrl = "audio_url"
  }
}

struct SavedTranslationResponse: Codable {
  let data: SavedTranslation
}
