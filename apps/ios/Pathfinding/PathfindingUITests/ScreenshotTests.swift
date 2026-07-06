import XCTest

/// Chinese screenshots for Pathfinding in guest mode (no backend).
/// Tab navigation is index-based to stay language-agnostic.
final class ScreenshotTests: XCTestCase {

    private func save(_ shot: XCUIScreenshot, _ name: String) {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        try? shot.pngRepresentation.write(to: dir.appendingPathComponent(name))
        let a = XCTAttachment(screenshot: shot); a.name = name; a.lifetime = .keepAlways; add(a)
    }

    @MainActor
    func testCaptureScreenshots() {
        let app = XCUIApplication()
        app.launchEnvironment["PATHFINDING_UI_TEST_RESET_STATE"] = "1"
        app.launchArguments += ["-AppleLanguages", "(zh-Hans)", "-AppleLocale", "zh_Hans"]
        app.launch()

        let skip = app.buttons["跳过"]
        if skip.waitForExistence(timeout: 8) { skip.tap() } else { app.navigationBars.buttons.firstMatch.tap() }
        sleep(4)

        // 1. Itinerary (default tab).
        save(XCUIScreen.main.screenshot(), "pathfinding-zh-1-itinerary.png")

        let tabs = app.tabBars.buttons
        // 2. Chat (index 0).
        if tabs.count > 0 { tabs.element(boundBy: 0).tap(); sleep(2) }
        save(XCUIScreen.main.screenshot(), "pathfinding-zh-2-chat.png")
        // 3. Profile (index 2).
        if tabs.count > 2 { tabs.element(boundBy: 2).tap(); sleep(2) }
        save(XCUIScreen.main.screenshot(), "pathfinding-zh-3-profile.png")
    }
}
