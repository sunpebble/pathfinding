import Foundation
import SwiftUI

// MARK: - PDF Export Types

/// PDF template types
enum PdfTemplateType: String, Codable, CaseIterable {
  case classic
  case modern
  case minimal
  case colorful

  var displayName: String {
    switch self {
    case .classic: return "经典"
    case .modern: return "现代"
    case .minimal: return "极简"
    case .colorful: return "多彩"
    }
  }

  var description: String {
    switch self {
    case .classic: return "传统衬线字体，优雅边框设计"
    case .modern: return "简洁无衬线设计，柔和阴影效果"
    case .minimal: return "超简洁设计，极少装饰元素"
    case .colorful: return "鲜艳渐变色，活力四射"
    }
  }

  var previewColor: String {
    switch self {
    case .classic: return "#8B4513"
    case .modern: return "#6366F1"
    case .minimal: return "#374151"
    case .colorful: return "#EC4899"
    }
  }

  /// SwiftUI Color for preview
  var color: Color {
    switch self {
    case .classic: return .brown
    case .modern: return .indigo
    case .minimal: return .gray
    case .colorful: return .pink
    }
  }
}

/// PDF language options
enum PdfLanguage: String, Codable, CaseIterable {
  case zh
  case en
  case bilingual

  var displayName: String {
    switch self {
    case .zh: return "中文"
    case .en: return "English"
    case .bilingual: return "双语"
    }
  }
}

/// PDF page size options
enum PdfPageSize: String, Codable, CaseIterable {
  case A4
  case Letter
  case A5

  var displayName: String {
    switch self {
    case .A4: return "A4"
    case .Letter: return "Letter"
    case .A5: return "A5"
    }
  }

  var description: String {
    switch self {
    case .A4: return "210 x 297 mm"
    case .Letter: return "8.5 x 11 in"
    case .A5: return "148 x 210 mm"
    }
  }
}

// MARK: - PDF Export Options

/// Options for PDF export
struct PdfExportOptions: Codable {
  var template: String?
  var language: String?
  var pageSize: String?
  var includeMap: Bool?
  var includeCover: Bool?
  var includeToc: Bool?
  var includePhotos: Bool?
  var includeTransport: Bool?
  var primaryColor: String?
  var authorName: String?

  enum CodingKeys: String, CodingKey {
    case template
    case language
    case pageSize = "page_size"
    case includeMap = "include_map"
    case includeCover = "include_cover"
    case includeToc = "include_toc"
    case includePhotos = "include_photos"
    case includeTransport = "include_transport"
    case primaryColor = "primary_color"
    case authorName = "author_name"
  }

  /// Create default options
  static var `default`: PdfExportOptions {
    PdfExportOptions(
      template: PdfTemplateType.modern.rawValue,
      language: PdfLanguage.zh.rawValue,
      pageSize: PdfPageSize.A4.rawValue,
      includeMap: true,
      includeCover: true,
      includeToc: true,
      includePhotos: true,
      includeTransport: true,
      primaryColor: "#6366F1",
      authorName: nil
    )
  }
}

