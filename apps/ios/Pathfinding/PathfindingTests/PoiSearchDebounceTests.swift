import XCTest
@testable import Pathfinding

@MainActor
final class PoiSearchDebounceTests: XCTestCase {
  func testRapidInputsCollapseToOneQuery() async throws {
    var queries: [String] = []
    let debouncer = PoiSearchDebouncer(interval: .milliseconds(50)) { queries.append($0) }
    debouncer.send("a"); debouncer.send("ab"); debouncer.send("abc")
    try await Task.sleep(for: .milliseconds(120))
    XCTAssertEqual(queries, ["abc"])
  }
}
