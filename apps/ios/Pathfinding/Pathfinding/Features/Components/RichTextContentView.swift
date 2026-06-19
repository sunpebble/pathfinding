import SwiftUI

/// Renders HTML content as native SwiftUI views.
///
/// Uses `HTMLContentParser` to split HTML into text and image blocks,
/// then renders each block natively — `Text` for rich text, `CachedAsyncImage` for images.
struct RichTextContentView: View {
  let html: String

  @State private var blocks: [ContentBlock] = []
  @Environment(\.openURL) private var openURL

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
    }
    .task(id: html) {
      // Parse on a background-friendly context; HTMLContentParser is synchronous
      // but NSAttributedString HTML init must run on main thread
      blocks = HTMLContentParser.parse(html: html)
    }
  }
}
