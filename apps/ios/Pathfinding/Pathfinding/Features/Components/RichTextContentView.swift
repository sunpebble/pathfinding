import SwiftUI

/// Renders HTML content as native SwiftUI views.
///
/// Uses `HTMLContentParser` to split HTML into text and image blocks,
/// then renders each block natively — `Text` for rich text, `CachedAsyncImage` for images.
struct RichTextContentView: View {
  let html: String
  let truncateAt: Int

  @State private var isExpanded = false
  @State private var blocks: [ContentBlock] = []
  @Environment(\.openURL) private var openURL

  init(html: String, truncateAt: Int = 10000) {
    self.html = html
    self.truncateAt = truncateAt
  }

  /// The HTML to actually parse — truncated if needed and not expanded.
  private var effectiveHtml: String {
    if !isExpanded && html.count > truncateAt {
      // Truncate at a safe point (avoid cutting mid-tag)
      let truncated = String(html.prefix(truncateAt))
      // Try to close at the last '>' to avoid broken tags
      if let lastClose = truncated.lastIndex(of: ">") {
        return String(truncated[...lastClose])
      }
      return truncated
    }
    return html
  }

  private var needsTruncation: Bool {
    html.count > truncateAt
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      ForEach(blocks) { block in
        switch block {
        case .richText(let attributedString):
          Text(attributedString)
            .font(.body)
            .lineSpacing(4)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)
            .environment(\.openURL, OpenURLAction { url in
              openURL(url)
              return .handled
            })

        case .image(let url):
          CachedAsyncImage(url: url) { image in
            image
              .resizable()
              .aspectRatio(contentMode: .fit)
          } placeholder: {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
              .fill(DesignTokens.Colors.fillTertiary)
              .aspectRatio(16 / 9, contentMode: .fit)
              .overlay {
                ProgressView()
              }
          }
          .frame(maxWidth: .infinity)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
      }

      // "Show more" button for truncated content
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
    .task(id: effectiveHtml) {
      // Parse on a background-friendly context; HTMLContentParser is synchronous
      // but NSAttributedString HTML init must run on main thread
      blocks = HTMLContentParser.parse(html: effectiveHtml)
    }
  }
}
