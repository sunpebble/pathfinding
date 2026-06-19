import XCTest
@testable import Pathfinding

@MainActor
final class CityEncyclopediaReachabilityTests: XCTestCase {
  func testHotCitiesAreNonEmpty() {
    XCTAssertFalse(DiscoverView.hotCities.isEmpty, "hotCities should not be empty")
    XCTAssertFalse(DiscoverView.hotCities[0].cityId.isEmpty, "First city cityId should not be empty")
  }

  func testHotCitiesAllHaveValidCityId() {
    for city in DiscoverView.hotCities {
      XCTAssertFalse(city.cityId.isEmpty, "cityId for \(city.cityName) must not be empty")
    }
  }

  func testHotCitiesAllHaveValidCityName() {
    for city in DiscoverView.hotCities {
      XCTAssertFalse(city.cityName.isEmpty, "cityName must not be empty for cityId \(city.cityId)")
    }
  }
}
