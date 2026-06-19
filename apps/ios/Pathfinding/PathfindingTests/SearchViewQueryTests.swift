import XCTest
@testable import Pathfinding

final class SearchViewQueryTests: XCTestCase {
  func testFiltersMapToSearchParams() {
    let p = SearchView.makeSearchParams(text: "kyoto", city: "Tokyo", onlyAI: true, timeFilter: .week)
    XCTAssertEqual(p.query, "kyoto")
    XCTAssertEqual(p.destination, "Tokyo")
    XCTAssertTrue(p.hasAiData)
    XCTAssertEqual(p.daysAgo, 7)
  }

  func testEmptyFiltersAreNil() {
    let p = SearchView.makeSearchParams(text: "x", city: nil, onlyAI: false, timeFilter: .all)
    XCTAssertNil(p.destination)
    XCTAssertFalse(p.hasAiData)
    XCTAssertNil(p.daysAgo)
  }
}
