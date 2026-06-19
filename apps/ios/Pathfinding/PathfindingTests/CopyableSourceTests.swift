import XCTest
@testable import Pathfinding

final class CopyableSourceTests: XCTestCase {
  func testDayAndPoiCountsAcrossSources() {
    let local: any CopyableSource = SavedItinerary.previewSample
    XCTAssertEqual(local.dayCount, local.days.count)
    XCTAssertEqual(local.poiCount, local.days.reduce(0) { $0 + $1.pois.count })
  }
}
