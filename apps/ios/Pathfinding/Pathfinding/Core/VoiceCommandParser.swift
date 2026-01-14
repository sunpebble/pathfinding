import Foundation
import OSLog

/// Parser for voice commands in Chinese and English
@MainActor
@Observable
final class VoiceCommandParser {
  static let shared = VoiceCommandParser()

  private let logger = Logger(subsystem: "org.pathfinding.app", category: "VoiceCommand")

  // MARK: - Command Patterns

  /// Parse voice input and return recognized command
  func parse(_ text: String) -> VoiceCommand? {
    let normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

    // Navigation commands
    if let navigationCommand = parseNavigationCommand(normalizedText) {
      return navigationCommand
    }

    // Itinerary creation commands
    if let itineraryCommand = parseItineraryCommand(normalizedText) {
      return itineraryCommand
    }

    // POI commands
    if let poiCommand = parsePOICommand(normalizedText) {
      return poiCommand
    }

    // Search commands
    if let searchCommand = parseSearchCommand(normalizedText) {
      return searchCommand
    }

    // Memo commands
    if let memoCommand = parseMemoCommand(normalizedText) {
      return memoCommand
    }

    // If no command pattern matches, treat as free text input
    if !normalizedText.isEmpty {
      return .freeText(text)
    }

    return nil
  }

  // MARK: - Navigation Commands

  private func parseNavigationCommand(_ text: String) -> VoiceCommand? {
    // Next/Previous navigation
    let nextPatterns = ["下一个", "下一站", "下一步", "next", "下个"]
    let prevPatterns = ["上一个", "上一站", "上一步", "previous", "上个", "返回上一个"]

    for pattern in nextPatterns {
      if text.contains(pattern) {
        logger.info("Recognized navigation command: next")
        return .navigation(.next)
      }
    }

    for pattern in prevPatterns {
      if text.contains(pattern) {
        logger.info("Recognized navigation command: previous")
        return .navigation(.previous)
      }
    }

    // Go to specific day
    let dayPatterns = [
      "第(\\d+)天", "day (\\d+)", "第(一|二|三|四|五|六|七|八|九|十)天"
    ]

    for pattern in dayPatterns {
      if let dayNumber = extractNumber(from: text, pattern: pattern) {
        logger.info("Recognized navigation command: goToDay(\(dayNumber))")
        return .navigation(.goToDay(dayNumber))
      }
    }

    // Go to specific POI
    let poiPatterns = ["第(\\d+)个景点", "景点(\\d+)", "poi (\\d+)"]
    for pattern in poiPatterns {
      if let poiNumber = extractNumber(from: text, pattern: pattern) {
        logger.info("Recognized navigation command: goToPOI(\(poiNumber))")
        return .navigation(.goToPOI(poiNumber))
      }
    }

    return nil
  }

  // MARK: - Itinerary Commands

  private func parseItineraryCommand(_ text: String) -> VoiceCommand? {
    // Create itinerary
    let createPatterns = [
      "创建行程", "新建行程", "建立行程",
      "create itinerary", "new itinerary",
      "去(.+)玩", "规划(.+)行程"
    ]

    for pattern in createPatterns {
      if let match = text.range(of: pattern, options: .regularExpression) {
        // Extract destination if present
        var destination: String?
        if pattern.contains("(.+)") {
          destination = extractGroup(from: text, pattern: pattern, groupIndex: 1)
        }
        logger.info("Recognized itinerary command: create, destination: \(destination ?? "nil")")
        return .itinerary(.create(destination: destination))
      }
    }

    // Set duration
    let durationPatterns = ["(\\d+)天行程", "玩(\\d+)天", "(\\d+) days"]
    for pattern in durationPatterns {
      if let days = extractNumber(from: text, pattern: pattern) {
        logger.info("Recognized itinerary command: setDuration(\(days))")
        return .itinerary(.setDuration(days))
      }
    }

    // Save itinerary
    let savePatterns = ["保存行程", "save itinerary", "保存"]
    for pattern in savePatterns {
      if text.contains(pattern) {
        logger.info("Recognized itinerary command: save")
        return .itinerary(.save)
      }
    }

    return nil
  }

  // MARK: - POI Commands

  private func parsePOICommand(_ text: String) -> VoiceCommand? {
    // Add POI
    let addPatterns = [
      "添加(.+)", "加入(.+)", "add (.+)",
      "去(.+)", "参观(.+)", "游览(.+)"
    ]

    for pattern in addPatterns {
      if let poiName = extractGroup(from: text, pattern: pattern, groupIndex: 1) {
        let cleanedName = cleanPOIName(poiName)
        if !cleanedName.isEmpty {
          logger.info("Recognized POI command: add(\(cleanedName))")
          return .poi(.add(name: cleanedName, type: nil))
        }
      }
    }

    // Remove POI
    let removePatterns = ["删除(.+)", "移除(.+)", "remove (.+)", "取消(.+)"]
    for pattern in removePatterns {
      if let poiName = extractGroup(from: text, pattern: pattern, groupIndex: 1) {
        let cleanedName = cleanPOIName(poiName)
        if !cleanedName.isEmpty {
          logger.info("Recognized POI command: remove(\(cleanedName))")
          return .poi(.remove(name: cleanedName))
        }
      }
    }

    // Set time for POI
    let timePatterns = [
      "(.+)时间改为(.+)", "(.+)改到(.+)", "set time for (.+) to (.+)"
    ]
    for pattern in timePatterns {
      if let groups = extractGroups(from: text, pattern: pattern) {
        if groups.count >= 2 {
          logger.info("Recognized POI command: setTime(\(groups[0]), \(groups[1]))")
          return .poi(.setTime(name: groups[0], time: groups[1]))
        }
      }
    }

    return nil
  }

  // MARK: - Search Commands

  private func parseSearchCommand(_ text: String) -> VoiceCommand? {
    let searchPatterns = [
      "搜索(.+)", "查找(.+)", "找(.+)",
      "search (.+)", "find (.+)",
      "附近有什么(.+)", "推荐(.+)"
    ]

    for pattern in searchPatterns {
      if let query = extractGroup(from: text, pattern: pattern, groupIndex: 1) {
        let cleanedQuery = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanedQuery.isEmpty {
          logger.info("Recognized search command: \(cleanedQuery)")
          return .search(query: cleanedQuery)
        }
      }
    }

    return nil
  }

  // MARK: - Memo Commands

  private func parseMemoCommand(_ text: String) -> VoiceCommand? {
    let memoPatterns = [
      "记录(.+)", "备忘(.+)", "备注(.+)",
      "memo (.+)", "note (.+)", "提醒(.+)"
    ]

    for pattern in memoPatterns {
      if let content = extractGroup(from: text, pattern: pattern, groupIndex: 1) {
        let cleanedContent = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanedContent.isEmpty {
          logger.info("Recognized memo command: \(cleanedContent)")
          return .memo(content: cleanedContent)
        }
      }
    }

    return nil
  }

  // MARK: - Helper Methods

  private func extractNumber(from text: String, pattern: String) -> Int? {
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
      return nil
    }

    let range = NSRange(text.startIndex..., in: text)
    guard let match = regex.firstMatch(in: text, options: [], range: range) else {
      return nil
    }

    if match.numberOfRanges > 1 {
      let groupRange = match.range(at: 1)
      if let swiftRange = Range(groupRange, in: text) {
        let numberStr = String(text[swiftRange])
        // Handle Chinese number words
        if let chineseNumber = chineseToNumber(numberStr) {
          return chineseNumber
        }
        return Int(numberStr)
      }
    }

    return nil
  }

  private func extractGroup(from text: String, pattern: String, groupIndex: Int) -> String? {
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
      return nil
    }

    let range = NSRange(text.startIndex..., in: text)
    guard let match = regex.firstMatch(in: text, options: [], range: range) else {
      return nil
    }

    if match.numberOfRanges > groupIndex {
      let groupRange = match.range(at: groupIndex)
      if let swiftRange = Range(groupRange, in: text) {
        return String(text[swiftRange])
      }
    }

    return nil
  }

  private func extractGroups(from text: String, pattern: String) -> [String]? {
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
      return nil
    }

    let range = NSRange(text.startIndex..., in: text)
    guard let match = regex.firstMatch(in: text, options: [], range: range) else {
      return nil
    }

    var groups: [String] = []
    for i in 1..<match.numberOfRanges {
      let groupRange = match.range(at: i)
      if let swiftRange = Range(groupRange, in: text) {
        groups.append(String(text[swiftRange]))
      }
    }

    return groups.isEmpty ? nil : groups
  }

  private func chineseToNumber(_ chinese: String) -> Int? {
    let mapping: [String: Int] = [
      "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
      "六": 6, "七": 7, "八": 8, "九": 9, "十": 10
    ]
    return mapping[chinese]
  }

  private func cleanPOIName(_ name: String) -> String {
    // Remove common suffixes that are not part of the name
    var cleaned = name.trimmingCharacters(in: .whitespacesAndNewlines)
    let suffixes = ["吧", "啊", "呀", "吗", "呢", "了"]
    for suffix in suffixes {
      if cleaned.hasSuffix(suffix) {
        cleaned = String(cleaned.dropLast(suffix.count))
      }
    }
    return cleaned
  }
}

// MARK: - Voice Command Types

enum VoiceCommand: Equatable {
  case navigation(NavigationAction)
  case itinerary(ItineraryAction)
  case poi(POIAction)
  case search(query: String)
  case memo(content: String)
  case freeText(String)

  enum NavigationAction: Equatable {
    case next
    case previous
    case goToDay(Int)
    case goToPOI(Int)
  }

  enum ItineraryAction: Equatable {
    case create(destination: String?)
    case setDuration(Int)
    case save
  }

  enum POIAction: Equatable {
    case add(name: String, type: String?)
    case remove(name: String)
    case setTime(name: String, time: String)
  }

  /// Human-readable description for feedback
  var description: String {
    switch self {
    case .navigation(.next):
      return "导航到下一个"
    case .navigation(.previous):
      return "导航到上一个"
    case .navigation(.goToDay(let day)):
      return "跳转到第\(day)天"
    case .navigation(.goToPOI(let poi)):
      return "跳转到第\(poi)个景点"
    case .itinerary(.create(let destination)):
      if let dest = destination {
        return "创建\(dest)行程"
      }
      return "创建新行程"
    case .itinerary(.setDuration(let days)):
      return "设置行程为\(days)天"
    case .itinerary(.save):
      return "保存行程"
    case .poi(.add(let name, _)):
      return "添加景点: \(name)"
    case .poi(.remove(let name)):
      return "删除景点: \(name)"
    case .poi(.setTime(let name, let time)):
      return "设置\(name)时间为\(time)"
    case .search(let query):
      return "搜索: \(query)"
    case .memo(let content):
      return "备忘: \(content)"
    case .freeText(let text):
      return "输入: \(text)"
    }
  }
}
