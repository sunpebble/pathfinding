import Foundation

extension Date {
  /// Shared relative-time formatting used across models for "time ago" display.
  ///
  /// - Parameters:
  ///   - unitsStyle: Units style for the formatter (default `.short`).
  ///   - localeIdentifier: Locale identifier, or `nil` to use the system locale (default `"zh_CN"`).
  ///   - justNowThreshold: When non-`nil`, intervals shorter than this (in seconds) relative to
  ///     `referenceDate` return `justNowText` instead of a formatted string.
  ///   - justNowText: Text returned for the "just now" case (default `"刚刚"`).
  ///   - referenceDate: The date to measure relative to (default `Date()`).
  func relativeFormatted(
    unitsStyle: RelativeDateTimeFormatter.UnitsStyle = .short,
    localeIdentifier: String? = "zh_CN",
    justNowThreshold: TimeInterval? = nil,
    justNowText: String = "刚刚",
    relativeTo referenceDate: Date = Date()
  ) -> String {
    if let threshold = justNowThreshold,
       referenceDate.timeIntervalSince(self) < threshold {
      return justNowText
    }

    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = unitsStyle
    if let localeIdentifier {
      formatter.locale = Locale(identifier: localeIdentifier)
    }
    return formatter.localizedString(for: self, relativeTo: referenceDate)
  }
}
