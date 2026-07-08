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

    // MARK: - Deep walk (drives real flows: AI planner, create, detail, settings)

    @MainActor
    func testDeepWalk() {
        let app = XCUIApplication()
        app.launchEnvironment["PATHFINDING_UI_TEST_RESET_STATE"] = "1"
        app.launchArguments += ["-AppleLanguages", "(zh-Hans)", "-AppleLocale", "zh_Hans"]
        app.launch()

        let skip = app.buttons["跳过"]
        if skip.waitForExistence(timeout: 8) { skip.tap() } else { app.navigationBars.buttons.firstMatch.tap() }
        sleep(3)

        // 1. AI planner input form (from itinerary empty state).
        tapFirst(app, ["AI 生成行程"], timeout: 6)
        sleep(2)
        save(XCUIScreen.main.screenshot(), "deep-1-aiplanner.png")
        tapFirst(app, ["取消"], timeout: 4)
        sleep(1)

        // 2. Create itinerary sheet.
        tapFirst(app, ["新建行程"], timeout: 6)
        sleep(2)
        save(XCUIScreen.main.screenshot(), "deep-2-create.png")
        let nameField = app.textFields["行程名称"]
        if nameField.waitForExistence(timeout: 4) { nameField.tap(); nameField.typeText("东京之旅") }
        // destination field is the 2nd text field in the form
        let fields = app.textFields
        if fields.count > 1 { fields.element(boundBy: 1).tap(); fields.element(boundBy: 1).typeText("东京") }
        tapFirst(app, ["创建"], timeout: 4)
        sleep(2)

        // 3. Itinerary list with the created trip.
        save(XCUIScreen.main.screenshot(), "deep-3-list.png")

        // 4. Itinerary detail.
        if app.cells.firstMatch.waitForExistence(timeout: 4) {
            app.cells.firstMatch.tap()
        } else {
            tapFirst(app, ["东京之旅"], timeout: 4)
        }
        sleep(2)
        save(XCUIScreen.main.screenshot(), "deep-4-detail.png")
        back(app)
        sleep(1)

        // 5. Profile sub-screens.
        let tabs = app.tabBars.buttons
        if tabs.count > 2 { tabs.element(boundBy: 2).tap(); sleep(2) }

        drillProfileRow(app, "旅行统计", "deep-5-stats.png")
        drillProfileRow(app, "主题模式", "deep-6-theme.png")
        drillProfileRow(app, "语言设置", "deep-7-language.png")
        drillProfileRow(app, "关于", "deep-8-about.png", scrollFirst: true)
    }

    // MARK: - Helpers

    private func tapFirst(_ app: XCUIApplication, _ labels: [String], timeout: TimeInterval) {
        for label in labels {
            let b = app.buttons[label]
            if b.waitForExistence(timeout: timeout) { b.tap(); return }
            let t = app.staticTexts[label]
            if t.exists { t.tap(); return }
        }
    }

    private func back(_ app: XCUIApplication) {
        let bar = app.navigationBars.firstMatch
        if bar.buttons.count > 0 { bar.buttons.element(boundBy: 0).tap() }
    }

    private func drillProfileRow(_ app: XCUIApplication, _ title: String, _ shot: String, scrollFirst: Bool = false) {
        if scrollFirst { app.swipeUp(); sleep(1) }
        let row = app.staticTexts[title]
        if row.waitForExistence(timeout: 4) {
            row.tap()
            sleep(2)
            save(XCUIScreen.main.screenshot(), shot)
            back(app)
            sleep(1)
        }
    }
}
