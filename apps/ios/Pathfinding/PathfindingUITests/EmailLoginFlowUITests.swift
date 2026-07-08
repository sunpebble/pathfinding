import XCTest

@MainActor
final class EmailLoginFlowUITests: XCTestCase {
  private let apiBaseURL = "http://127.0.0.1:3300"
  private let password = "password123"

  func testExistingUserCanSignInWithEmail() async throws {
    let email = "ui-login-\(UUID().uuidString.lowercased())@example.com"
    try await seedUser(email: email, password: password)

    let app = XCUIApplication()
    app.launchEnvironment["PF_API_BASE_URL"] = apiBaseURL
    app.launchEnvironment["PATHFINDING_UI_TEST_RESET_STATE"] = "1"
    app.launch()

    let emailField = app.textFields["login-email-field"]
    XCTAssertTrue(emailField.waitForExistence(timeout: 5))
    emailField.tap()
    emailField.typeText(email)

    let passwordField = app.secureTextFields["login-password-field"]
    XCTAssertTrue(passwordField.waitForExistence(timeout: 5))
    passwordField.tap()
    passwordField.typeText(password)

    let loginButton = app.buttons["login-submit-button"]
    XCTAssertTrue(loginButton.isEnabled)
    loginButton.tap()

    XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 10))
    XCTAssertTrue(app.otherElements["authenticated-root"].waitForExistence(timeout: 10))
  }

  private func seedUser(email: String, password: String) async throws {
    let url = try XCTUnwrap(URL(string: "\(apiBaseURL)/api/auth/signin"))
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: [
      "email": email,
      "password": password,
      "flow": "signUp",
    ])

    let (_, response) = try await URLSession.shared.data(for: request)
    let httpResponse = try XCTUnwrap(response as? HTTPURLResponse)
    XCTAssertTrue((200...299).contains(httpResponse.statusCode), "Unexpected signup status: \(httpResponse.statusCode)")
  }
}
