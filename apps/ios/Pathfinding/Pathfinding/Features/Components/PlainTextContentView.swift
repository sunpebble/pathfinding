import SwiftUI

/// Displays plain text content with intelligent paragraph splitting.
/// Used as a fallback when `contentHtml` is not available.
///
/// When the raw text has no newlines (common with crawled content),
/// it splits on Chinese/English sentence boundaries to create readable paragraphs.
struct PlainTextContentView: View {
  let content: String
  let truncateAt: Int

  @State private var isExpanded = false

  init(content: String, truncateAt: Int = 10000) {
    self.content = content
    self.truncateAt = truncateAt
  }

  /// Split raw text into paragraphs for readability.
  /// If the text already has newlines, respect them.
  /// Otherwise, split on sentence-ending punctuation patterns.
  private var paragraphs: [String] {
    let text = isExpanded || content.count <= truncateAt
      ? content
      : String(content.prefix(truncateAt)) + "..."

    // If text already has meaningful newlines, use them
    let lines = text.components(separatedBy: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    if lines.count > 1 {
      return lines
    }

    // No newlines — split on sentence boundaries
    // Group ~2-3 sentences per paragraph for readability
    return splitIntoParagraphs(text, sentencesPerParagraph: 3)
  }

  private var needsTruncation: Bool {
    content.count > truncateAt
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
        ForEach(Array(paragraphs.enumerated()), id: \.offset) { _, paragraph in
          Text(paragraph)
            .font(.body)
            .lineSpacing(4)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }

      if needsTruncation && !isExpanded {
        Button {
          withAnimation(.easeInOut(duration: 0.3)) {
            isExpanded = true
          }
        } label: {
          HStack(spacing: DesignTokens.Spacing.xs) {
            Text("查看更多")
            Image(systemName: "chevron.down")
          }
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(DesignTokens.Colors.accent)
          .frame(maxWidth: .infinity)
          .padding(.vertical, DesignTokens.Spacing.sm)
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
              .fill(DesignTokens.Colors.accent.opacity(0.08))
          )
        }
        .buttonStyle(.plain)
      }
    }
  }

  // MARK: - Paragraph Splitting

  /// Split text into paragraphs by grouping sentences.
  /// Recognizes Chinese (。！？) and English (.!?) sentence endings.
  private func splitIntoParagraphs(_ text: String, sentencesPerParagraph: Int) -> [String] {
    // Sentence-ending pattern: Chinese or English punctuation followed by optional space
    let sentenceEndings: [Character] = ["。", "！", "？", ".", "!", "?"]
    var sentences: [String] = []
    var current = ""

    for char in text {
      current.append(char)
      if sentenceEndings.contains(char) {
        let trimmed = current.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
          sentences.append(trimmed)
        }
        current = ""
      }
    }
    // Remaining text
    let remaining = current.trimmingCharacters(in: .whitespaces)
    if !remaining.isEmpty {
      sentences.append(remaining)
    }

    // Group sentences into paragraphs
    var paragraphs: [String] = []
    for i in stride(from: 0, to: sentences.count, by: sentencesPerParagraph) {
      let end = min(i + sentencesPerParagraph, sentences.count)
      let paragraph = sentences[i..<end].joined(separator: "")
      if !paragraph.isEmpty {
        paragraphs.append(paragraph)
      }
    }

    // If splitting produced nothing useful, return original as single paragraph
    if paragraphs.isEmpty {
      return [text]
    }

    return paragraphs
  }
}
