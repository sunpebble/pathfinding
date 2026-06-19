import XCTest
import SwiftUI
@testable import Pathfinding

final class PreferenceSelectionTests: XCTestCase {
  // TDD target: PreferenceCategory must expose a centralized SwiftUI Color.
  // Before the refactor this property does not exist → RED.
  // After adding PreferenceCategory.color: Color the test goes GREEN.

  func testCategoryColorIsStableAndCentralized() {
    // Same category always returns the same Color value
    XCTAssertEqual(PreferenceCategory.culture.color, PreferenceCategory.culture.color)

    // Different categories produce distinct colors (not both the default .gray fallback)
    XCTAssertNotEqual(PreferenceCategory.culture.color, PreferenceCategory.food.color)
  }

  func testAllCategoryColorsAreNonDefault() {
    // Every category must map to a recognised color – none should fall through to .gray
    let gray = Color.gray
    for category in PreferenceCategory.allCases {
      XCTAssertNotEqual(
        category.color, gray,
        "\(category.rawValue) resolved to the default gray – add it to the centralised mapping"
      )
    }
  }
}
