import XCTest
@testable import Pathfinding

final class CityEncyclopediaReachabilityTests: XCTestCase {

  // MARK: - Helpers

  /// Build a minimal CityWithEncyclopedia for unit tests — no network required.
  private func makeCityWithEncyclopedia(id: String, name: String) -> CityWithEncyclopedia {
    CityWithEncyclopedia(
      id: id,
      name: name,
      nameEn: nil,
      timezone: "Asia/Tokyo",
      countryCode: "JP",
      latitude: 35.689487,
      longitude: 139.691711,
      utcOffset: 540,
      dstOffset: nil,
      observesDst: false,
      encyclopedia: nil,
      hasEncyclopedia: false
    )
  }

  // MARK: - hotCityRoute mapping

  func testHotCityRouteUsesRealId() {
    let city = makeCityWithEncyclopedia(id: "real_db_id_42", name: "东京")
    let route = DiscoverView.hotCityRoute(from: city)
    XCTAssertEqual(route.cityId, "real_db_id_42",
                   "Route cityId must equal the model's real id, not a fabricated slug")
  }

  func testHotCityRouteUsesDisplayName() {
    let city = makeCityWithEncyclopedia(id: "real_db_id_42", name: "东京")
    let route = DiscoverView.hotCityRoute(from: city)
    XCTAssertEqual(route.cityName, "东京",
                   "Route cityName must equal city.displayName")
  }

  func testHotCityRouteNonEmpty() {
    let city = makeCityWithEncyclopedia(id: "some_id", name: "首尔")
    let route = DiscoverView.hotCityRoute(from: city)
    XCTAssertFalse(route.cityId.isEmpty, "cityId must not be empty")
    XCTAssertFalse(route.cityName.isEmpty, "cityName must not be empty")
  }
}
