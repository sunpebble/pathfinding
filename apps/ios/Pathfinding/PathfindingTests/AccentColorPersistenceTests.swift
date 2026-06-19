import XCTest
@testable import Pathfinding

@MainActor
final class AccentColorPersistenceTests: XCTestCase {
  private let key = "app_accent_color"
  private var saved: String?

  override func setUp() {
    saved = UserDefaults.standard.string(forKey: key)
  }

  override func tearDown() {
    UserDefaults.standard.set(saved, forKey: key)
  }

  func testSetAccentColorPersistsAndUpdates() {
    let tm = ThemeManager.shared
    tm.setAccentColor(.teal)
    XCTAssertEqual(tm.accentColor, .teal)
    XCTAssertEqual(UserDefaults.standard.string(forKey: key), AccentColorOption.teal.rawValue)
  }
}
