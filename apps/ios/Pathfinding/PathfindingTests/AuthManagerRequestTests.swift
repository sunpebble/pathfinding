import XCTest
@testable import Pathfinding

final class AuthManagerRequestTests: XCTestCase {
  func testEmailSignInRequestUsesCurrentEndpointAndFlow() async throws {
    let authManager = AuthManager(apiBaseURL: "http://127.0.0.1:3300")

    let request = try await authManager.makeEmailSignInRequest(
      email: "traveler@example.com",
      password: "password123"
    )

    XCTAssertEqual(request.url?.absoluteString, "http://127.0.0.1:3300/api/auth/signin")
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")

    let body = try XCTUnwrap(request.httpBody)
    let payload = try JSONDecoder().decode(EmailAuthRequestPayload.self, from: body)

    XCTAssertEqual(payload.email, "traveler@example.com")
    XCTAssertEqual(payload.password, "password123")
    XCTAssertEqual(payload.flow, "signIn")
    XCTAssertNil(payload.name)
  }

  func testEmailSignUpRequestUsesCurrentEndpointAndCarriesOptionalName() async throws {
    let authManager = AuthManager(apiBaseURL: "http://127.0.0.1:3300")

    let request = try await authManager.makeEmailSignUpRequest(
      email: "traveler@example.com",
      password: "password123",
      name: "Traveler"
    )

    XCTAssertEqual(request.url?.absoluteString, "http://127.0.0.1:3300/api/auth/signin")

    let body = try XCTUnwrap(request.httpBody)
    let payload = try JSONDecoder().decode(EmailAuthRequestPayload.self, from: body)

    XCTAssertEqual(payload.flow, "signUp")
    XCTAssertEqual(payload.name, "Traveler")
  }
}
