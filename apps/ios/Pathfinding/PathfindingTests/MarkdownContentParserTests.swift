import XCTest
@testable import Pathfinding

final class MarkdownContentParserTests: XCTestCase {
  func testParsesImageBlocksSeparatelyFromParagraphs() throws {
    let blocks = MarkdownContentParser.parse(
      """
      # 标题

      正文第一段

      ![游记图片 1](https://img.example.com/photo.jpg)

      正文第二段
      """
    )

    XCTAssertEqual(blocks.count, 4)
    XCTAssertEqual(blocks[0], .heading(1, "标题"))
    XCTAssertEqual(blocks[1], .paragraph("正文第一段"))
    XCTAssertEqual(
      blocks[2],
      .image(alt: "游记图片 1", url: try XCTUnwrap(URL(string: "https://img.example.com/photo.jpg")))
    )
    XCTAssertEqual(blocks[3], .paragraph("正文第二段"))
  }
}
