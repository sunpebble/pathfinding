import Foundation
import SwiftUI

// MARK: - Content Block

/// Represents a parsed block of HTML content — either rich text or an image.
enum ContentBlock: Identifiable {
  case richText(AttributedString)
  case image(URL)

  var id: String {
    switch self {
    case .richText(let text):
      return "text-\(text.hashValue)"
    case .image(let url):
      return "img-\(url.absoluteString)"
    }
  }
}

// MARK: - HTML Content Parser

/// Parses HTML strings into an array of `ContentBlock` for native SwiftUI rendering.
///
/// Strategy:
/// 1. Extract `<img>` tags and their positions from the HTML
/// 2. Split the HTML into text segments around the images
/// 3. Convert each text segment to `AttributedString` via `NSAttributedString(html:)`
/// 4. Return interleaved text and image blocks
struct HTMLContentParser {

  // Regex to match <img> tags and capture the src attribute
  private static let imgPattern = try! NSRegularExpression(
    pattern: #"<img\s+[^>]*?src\s*=\s*["']([^"']+)["'][^>]*?/?>"#,
    options: [.caseInsensitive, .dotMatchesLineSeparators]
  )

  /// Parse an HTML string into an ordered array of content blocks.
  /// - Parameter html: Raw HTML string
  /// - Returns: Array of `ContentBlock` in document order
  static func parse(html: String) -> [ContentBlock] {
    guard !html.isEmpty else { return [] }

    let nsHtml = html as NSString
    let fullRange = NSRange(location: 0, length: nsHtml.length)

    // Find all <img> tags
    let imgMatches = imgPattern.matches(in: html, options: [], range: fullRange)

    // If no images, convert the entire HTML to a single rich text block
    if imgMatches.isEmpty {
      if let attributed = convertToAttributedString(html: html) {
        return [.richText(attributed)]
      }
      return plainTextFallback(html: html)
    }

    // Split HTML around <img> tags into interleaved text + image blocks
    var blocks: [ContentBlock] = []
    var currentIndex = 0

    for match in imgMatches {
      let matchRange = match.range

      // Text segment before this image
      if matchRange.location > currentIndex {
        let textRange = NSRange(location: currentIndex, length: matchRange.location - currentIndex)
        let textHtml = nsHtml.substring(with: textRange).trimmingCharacters(in: .whitespacesAndNewlines)
        if !textHtml.isEmpty {
          if let attributed = convertToAttributedString(html: textHtml) {
            blocks.append(.richText(attributed))
          }
        }
      }

      // Image block
      if match.numberOfRanges > 1 {
        let srcRange = match.range(at: 1)
        let src = nsHtml.substring(with: srcRange)
        if let url = URL(string: src), url.scheme != nil {
          blocks.append(.image(url))
        }
      }

      currentIndex = matchRange.location + matchRange.length
    }

    // Remaining text after the last image
    if currentIndex < nsHtml.length {
      let remainingHtml = nsHtml.substring(from: currentIndex).trimmingCharacters(in: .whitespacesAndNewlines)
      if !remainingHtml.isEmpty {
        if let attributed = convertToAttributedString(html: remainingHtml) {
          blocks.append(.richText(attributed))
        }
      }
    }

    // If parsing produced nothing (edge case), fall back to plain text
    if blocks.isEmpty {
      return plainTextFallback(html: html)
    }

    return blocks
  }

  // MARK: - Private Helpers

  /// Convert an HTML fragment to `AttributedString`.
  /// Returns nil if conversion fails.
  private static func convertToAttributedString(html: String) -> AttributedString? {
    // Wrap in basic HTML structure for proper encoding handling
    let wrappedHtml = """
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system; font-size: 16px; line-height: 1.6; color: #1c1c1e;">
    \(html)
    </body>
    </html>
    """

    guard let data = wrappedHtml.data(using: .utf8) else { return nil }

    do {
      let nsAttributed = try NSAttributedString(
        data: data,
        options: [
          .documentType: NSAttributedString.DocumentType.html,
          .characterEncoding: String.Encoding.utf8.rawValue,
        ],
        documentAttributes: nil
      )
      // Convert NSAttributedString → AttributedString
      return AttributedString(nsAttributed)
    } catch {
      // Conversion failed — return nil so caller can use fallback
      return nil
    }
  }

  /// Fallback: strip HTML tags and return as plain text block.
  private static func plainTextFallback(html: String) -> [ContentBlock] {
    let stripped = stripHTMLTags(html)
    guard !stripped.isEmpty else { return [] }
    return [.richText(AttributedString(stripped))]
  }

  /// Simple HTML tag stripper for fallback scenarios.
  private static func stripHTMLTags(_ html: String) -> String {
    guard let regex = try? NSRegularExpression(pattern: "<[^>]+>", options: []) else {
      return html
    }
    let range = NSRange(location: 0, length: html.utf16.count)
    return regex.stringByReplacingMatches(in: html, options: [], range: range, withTemplate: "")
      .replacingOccurrences(of: "&nbsp;", with: " ")
      .replacingOccurrences(of: "&amp;", with: "&")
      .replacingOccurrences(of: "&lt;", with: "<")
      .replacingOccurrences(of: "&gt;", with: ">")
      .replacingOccurrences(of: "&quot;", with: "\"")
      .trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
