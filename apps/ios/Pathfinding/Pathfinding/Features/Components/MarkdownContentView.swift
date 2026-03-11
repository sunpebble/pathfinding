import SwiftUI

/// Renders Markdown content as native SwiftUI views.
///
/// Uses SwiftUI's built-in Markdown support in `Text` for inline formatting
/// (bold, italic, links, code), and manually splits by headings and paragraphs
/// for proper block-level structure with spacing.
struct MarkdownContentView: View {
  let markdown: String
  let truncateAt: Int

  @State private var isExpanded = false

  init(markdown: String, truncateAt: Int = 10000) {
    self.markdown = markdown
    self.truncateAt = truncateAt
  }

  private var effectiveMarkdown: String {
    if !isExpanded && markdown.count > truncateAt {
      return String(markdown.prefix(truncateAt)) + "\n\n..."
    }
    return markdown
  }

  private var needsTruncation: Bool {
    markdown.count > truncateAt
  }

  /// Parse markdown into block-level elements for proper spacing
  private var blocks: [MarkdownBlock] {
    parseBlocks(from: effectiveMarkdown)
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
        switch block {
        case .heading(let level, let text):
          headingView(level: level, text: text)

        case .paragraph(let text):
          Text(LocalizedStringKey(text))
            .font(.body)
            .lineSpacing(4)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)

        case .listItem(let text, let ordered, let index):
          listItemView(text: text, ordered: ordered, index: index)

        case .separator:
          Divider()
            .padding(.vertical, DesignTokens.Spacing.xs)

        case .blockquote(let text):
          blockquoteView(text: text)
        }
      }

      if needsTruncation && !isExpanded {
        expandButton
      }
    }
  }

  // MARK: - Block Views

  @ViewBuilder
  private func headingView(level: Int, text: String) -> some View {
    Text(LocalizedStringKey(text))
      .font(level <= 1 ? .title2 : level == 2 ? .title3 : .headline)
      .fontWeight(.bold)
      .padding(.top, DesignTokens.Spacing.xs)
      .frame(maxWidth: .infinity, alignment: .leading)
  }

  @ViewBuilder
  private func listItemView(text: String, ordered: Bool, index: Int) -> some View {
    HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
      if ordered {
        Text("\(index).")
          .font(.body)
          .foregroundStyle(.secondary)
          .frame(width: 24, alignment: .trailing)
      } else {
        Text("•")
          .font(.body)
          .foregroundStyle(.secondary)
          .frame(width: 24, alignment: .center)
      }
      Text(LocalizedStringKey(text))
        .font(.body)
        .lineSpacing(4)
        .textSelection(.enabled)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  @ViewBuilder
  private func blockquoteView(text: String) -> some View {
    HStack(spacing: 0) {
      RoundedRectangle(cornerRadius: 2)
        .fill(DesignTokens.Colors.accent.opacity(0.4))
        .frame(width: 3)

      Text(LocalizedStringKey(text))
        .font(.body)
        .italic()
        .foregroundStyle(.secondary)
        .lineSpacing(4)
        .padding(.leading, DesignTokens.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
  }

  private var expandButton: some View {
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

  // MARK: - Markdown Parsing

  private func parseBlocks(from text: String) -> [MarkdownBlock] {
    let lines = text.components(separatedBy: "\n")
    var blocks: [MarkdownBlock] = []
    var currentParagraph = ""
    var orderedIndex = 0

    for line in lines {
      let trimmed = line.trimmingCharacters(in: .whitespaces)

      // Empty line = paragraph break
      if trimmed.isEmpty {
        if !currentParagraph.isEmpty {
          blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
          currentParagraph = ""
        }
        orderedIndex = 0
        continue
      }

      // Heading
      if let headingMatch = trimmed.headingLevel() {
        if !currentParagraph.isEmpty {
          blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
          currentParagraph = ""
        }
        blocks.append(.heading(headingMatch.level, headingMatch.text))
        orderedIndex = 0
        continue
      }

      // Horizontal rule
      if trimmed.isHorizontalRule {
        if !currentParagraph.isEmpty {
          blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
          currentParagraph = ""
        }
        blocks.append(.separator)
        continue
      }

      // Unordered list item
      if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") || trimmed.hasPrefix("+ ") {
        if !currentParagraph.isEmpty {
          blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
          currentParagraph = ""
        }
        let itemText = String(trimmed.dropFirst(2))
        blocks.append(.listItem(itemText, ordered: false, index: 0))
        continue
      }

      // Ordered list item
      if let olMatch = trimmed.orderedListIndex() {
        if !currentParagraph.isEmpty {
          blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
          currentParagraph = ""
        }
        orderedIndex = olMatch.index
        blocks.append(.listItem(olMatch.text, ordered: true, index: orderedIndex))
        continue
      }

      // Blockquote
      if trimmed.hasPrefix("> ") {
        if !currentParagraph.isEmpty {
          blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
          currentParagraph = ""
        }
        let quoteText = String(trimmed.dropFirst(2))
        blocks.append(.blockquote(quoteText))
        continue
      }

      // Regular text — accumulate into paragraph
      if currentParagraph.isEmpty {
        currentParagraph = trimmed
      } else {
        currentParagraph += " " + trimmed
      }
    }

    // Flush remaining paragraph
    if !currentParagraph.isEmpty {
      blocks.append(.paragraph(currentParagraph.trimmingCharacters(in: .whitespacesAndNewlines)))
    }

    return blocks
  }
}

// MARK: - Block Types

private enum MarkdownBlock {
  case heading(Int, String)       // level, text
  case paragraph(String)          // text (may contain inline markdown)
  case listItem(String, ordered: Bool, index: Int)
  case separator
  case blockquote(String)
}

// MARK: - String Helpers

private extension String {
  struct HeadingMatch {
    let level: Int
    let text: String
  }

  func headingLevel() -> HeadingMatch? {
    var level = 0
    for char in self {
      if char == "#" { level += 1 }
      else { break }
    }
    guard level >= 1 && level <= 6 else { return nil }
    let text = String(self.dropFirst(level)).trimmingCharacters(in: .whitespaces)
    guard !text.isEmpty else { return nil }
    return HeadingMatch(level: level, text: text)
  }

  var isHorizontalRule: Bool {
    let cleaned = self.replacingOccurrences(of: " ", with: "")
    return (cleaned.allSatisfy { $0 == "-" } && cleaned.count >= 3) ||
           (cleaned.allSatisfy { $0 == "*" } && cleaned.count >= 3) ||
           (cleaned.allSatisfy { $0 == "_" } && cleaned.count >= 3)
  }

  struct OrderedListMatch {
    let index: Int
    let text: String
  }

  func orderedListIndex() -> OrderedListMatch? {
    guard let dotIndex = self.firstIndex(of: ".") else { return nil }
    let prefix = String(self[self.startIndex..<dotIndex])
    guard let num = Int(prefix.trimmingCharacters(in: .whitespaces)) else { return nil }
    let afterDot = self.index(after: dotIndex)
    guard afterDot < self.endIndex else { return nil }
    let text = String(self[afterDot...]).trimmingCharacters(in: .whitespaces)
    guard !text.isEmpty else { return nil }
    return OrderedListMatch(index: num, text: text)
  }
}
