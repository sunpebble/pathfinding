import XCTest
@testable import Pathfinding

final class ExpenseFormModelTests: XCTestCase {
  func testEditModePrefillsFromExpense() {
    let expense = Expense.previewSample
    let model = ExpenseFormModel(mode: .edit(expense))
    XCTAssertEqual(model.amount, expense.amount)
    XCTAssertEqual(model.category, expense.category)
  }

  func testCreateModeStartsEmpty() {
    let model = ExpenseFormModel(mode: .create)
    XCTAssertEqual(model.amount, 0)
  }
}
