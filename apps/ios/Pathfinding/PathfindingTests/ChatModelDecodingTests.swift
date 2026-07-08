import XCTest
@testable import Pathfinding

final class ChatModelDecodingTests: XCTestCase {
  func testDecodesSessionList() throws {
    let json = """
    {"data":[{"id":7,"user_id":1,"title":"杭州三日","message_count":4,
    "last_message_at":"2026-07-08T10:51:16.528Z","is_archived":false,
    "created_at":"2026-07-07T08:00:00.000Z"}]}
    """.data(using: .utf8)!
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let resp = try decoder.decode(ChatSessionListResponse.self, from: json)
    XCTAssertEqual(resp.data.count, 1)
    XCTAssertEqual(resp.data[0].id, 7)
    XCTAssertEqual(resp.data[0].userId, 1)
    XCTAssertEqual(resp.data[0].messageCount, 4)
    XCTAssertFalse(resp.data[0].isArchived)
  }

  func testDecodesSendMessageResponse() throws {
    let json = """
    {"data":{"user_message":{"id":10,"session_id":5,"role":"user","content":"hi","created_at":"2026-07-08T10:00:00.000Z"},
    "assistant_message":{"id":11,"session_id":5,"role":"assistant","content":"hello","created_at":"2026-07-08T10:00:01.000Z"}}}
    """.data(using: .utf8)!
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let resp = try decoder.decode(SendMessageResponse.self, from: json)
    XCTAssertEqual(resp.data.userMessage.id, 10)
    XCTAssertEqual(resp.data.assistantMessage.role, .assistant)
    XCTAssertEqual(resp.data.assistantMessage.content, "hello")
  }
}
