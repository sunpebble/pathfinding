import SwiftUI

/// Article content body for the blog detail screen (markdown / HTML / plain text).
struct BlogDetailContentSection: View {
  let guide: BlogPost
  @Binding var isArticleExpanded: Bool

  @ViewBuilder
  var body: some View {
    if let contentMarkdown = guide.contentMarkdown, !contentMarkdown.isEmpty {
      DisclosureGroup(isExpanded: $isArticleExpanded) {
        MarkdownContentView(markdown: contentMarkdown)
          .padding(.top, DesignTokens.Spacing.sm)
      } label: {
        Label("原文内容", systemImage: "doc.richtext")
          .font(.headline)
      }
    } else if let contentHtml = guide.contentHtml, !contentHtml.isEmpty {
      DisclosureGroup(isExpanded: $isArticleExpanded) {
        RichTextContentView(html: contentHtml)
          .padding(.top, DesignTokens.Spacing.sm)
      } label: {
        Label("原文内容", systemImage: "doc.richtext")
          .font(.headline)
      }
    } else if let content = guide.content, !content.isEmpty {
      DisclosureGroup(isExpanded: $isArticleExpanded) {
        PlainTextContentView(content: content)
          .padding(.top, DesignTokens.Spacing.sm)
      } label: {
        Label("原文内容", systemImage: "doc.text")
          .font(.headline)
      }
    }
  }
}
