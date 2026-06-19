import XCTest
@testable import Pathfinding

@MainActor
final class ItineraryDetailDestinationsTests: XCTestCase {
  func testDetailExposesAnalysisAndBudgetDestinations() {
    let itinerary = SavedItinerary.previewSample  // 见 Step 2
    let destinations = ItineraryDetailView(itinerary: itinerary).availableDestinations
    XCTAssertTrue(destinations.contains(.analysis))
    XCTAssertTrue(destinations.contains(.budget))
  }
}
