import XCTest
@testable import Pathfinding

@MainActor
final class ItineraryStoreCopyTests: XCTestCase {
  func testCopyShiftsDatesToNewStart() throws {
    let store = ItineraryStore.makeForTesting()  // 见 Step 3
    let original = SavedItinerary.previewSample    // 复用 Task 10 样例
    let newStart = Calendar.current.date(byAdding: .day, value: 30, to: original.startDate)!
    let copy = store.copyItinerary(original, newStartDate: newStart)
    XCTAssertEqual(Calendar.current.startOfDay(for: copy.startDate),
                   Calendar.current.startOfDay(for: newStart))
    XCTAssertEqual(copy.days.count, original.days.count)
  }
}
