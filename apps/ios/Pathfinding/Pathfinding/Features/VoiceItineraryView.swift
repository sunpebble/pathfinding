import MapKit
import SwiftUI

/// Voice-based itinerary creation view
struct VoiceItineraryView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var speechManager = SpeechRecognitionManager.shared
  @State private var commandParser = VoiceCommandParser.shared

  // Itinerary state
  @State private var itineraryTitle = ""
  @State private var destination = ""
  @State private var days: [AiDay] = []
  @State private var currentDayIndex = 0

  // Voice interaction state
  @State private var currentMode: VoiceMode = .idle
  @State private var feedbackMessage = ""
  @State private var showFeedback = false

  // Search state
  @State private var searchResults: [SearchedPOI] = []
  @State private var isSearching = false

  // Save callback
  var onSave: ((SavedItinerary) -> Void)?

  // MARK: - Body

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Voice input section
          voiceInputSection

          // Current itinerary preview
          if !days.isEmpty {
            itineraryPreview
          }

          // Quick actions
          quickActionsSection

          // Search results
          if !searchResults.isEmpty {
            searchResultsSection
          }

          // Voice command hints
          commandHintsSection
        }
        .padding()
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("语音规划行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") {
            dismiss()
          }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("保存") {
            saveItinerary()
          }
          .fontWeight(.semibold)
          .disabled(days.isEmpty && itineraryTitle.isEmpty)
        }
      }
    }
    .onAppear {
      initializeItinerary()
    }
  }

  // MARK: - Voice Input Section

  private var voiceInputSection: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Mode indicator
      HStack {
        Image(systemName: currentMode.icon)
          .foregroundStyle(currentMode.color)
        Text(currentMode.description)
          .font(.subheadline)
          .foregroundStyle(.secondary)
        Spacer()
      }

      // Voice input
      VoiceInputView(
        onCommand: handleCommand,
        onTranscription: { _ in },
        showTranscription: true,
        placeholder: currentMode.placeholder
      )

      // Feedback message
      if showFeedback {
        HStack(spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "checkmark.circle.fill")
            .foregroundStyle(.green)
          Text(feedbackMessage)
            .font(.subheadline)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color.green.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .transition(.scale.combined(with: .opacity))
      }
    }
    .padding()
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .shadow(color: DesignTokens.Shadow.sm.color, radius: DesignTokens.Shadow.sm.radius)
  }

  // MARK: - Itinerary Preview

  private var itineraryPreview: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          if !itineraryTitle.isEmpty {
            Text(itineraryTitle)
              .font(.headline)
          }
          if !destination.isEmpty {
            HStack(spacing: 4) {
              Image(systemName: "mappin")
              Text(destination)
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
          }
        }
        Spacer()
        Text("\(days.count)天")
          .font(.caption)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(Color.accentColor.opacity(0.1))
          .clipShape(Capsule())
      }

      Divider()

      // Days scroll
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.sm) {
          ForEach(Array(days.enumerated()), id: \.element.id) { index, day in
            DayChip(
              day: day,
              isSelected: index == currentDayIndex,
              onTap: { currentDayIndex = index }
            )
          }

          // Add day button
          Button {
            addDay()
          } label: {
            HStack(spacing: 4) {
              Image(systemName: "plus.circle.fill")
              Text("添加")
            }
            .font(.subheadline)
            .foregroundStyle(Color.accentColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.accentColor.opacity(0.1))
            .clipShape(Capsule())
          }
        }
      }

      // Current day POIs
      if days.indices.contains(currentDayIndex) {
        let currentDay = days[currentDayIndex]

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          HStack {
            Text("第\(currentDay.dayNumber)天")
              .font(.subheadline)
              .fontWeight(.medium)
            if let theme = currentDay.theme {
              Text("- \(theme)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(currentDay.pois.count)个景点")
              .font(.caption)
              .foregroundStyle(.tertiary)
          }

          if currentDay.pois.isEmpty {
            Text("说「添加 [景点名称]」来添加景点")
              .font(.caption)
              .foregroundStyle(.secondary)
              .padding()
              .frame(maxWidth: .infinity)
              .background(Color(.secondarySystemBackground))
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
          } else {
            ForEach(currentDay.pois) { poi in
              POIRow(poi: poi) {
                removePOI(poi)
              }
            }
          }
        }
      }
    }
    .padding()
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .shadow(color: DesignTokens.Shadow.sm.color, radius: DesignTokens.Shadow.sm.radius)
  }

  // MARK: - Quick Actions

  private var quickActionsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("快捷操作")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(.secondary)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
      ], spacing: DesignTokens.Spacing.sm) {
        QuickActionButton(icon: "plus.circle", title: "添加景点") {
          currentMode = .addingPOI
        }

        QuickActionButton(icon: "magnifyingglass", title: "搜索") {
          currentMode = .searching
        }

        QuickActionButton(icon: "calendar.badge.plus", title: "添加天") {
          addDay()
        }

        QuickActionButton(icon: "arrow.left", title: "上一天") {
          navigateToPreviousDay()
        }

        QuickActionButton(icon: "arrow.right", title: "下一天") {
          navigateToNextDay()
        }

        QuickActionButton(icon: "mic.badge.plus", title: "备忘") {
          currentMode = .memo
        }
      }
    }
    .padding()
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .shadow(color: DesignTokens.Shadow.sm.color, radius: DesignTokens.Shadow.sm.radius)
  }

  // MARK: - Search Results

  private var searchResultsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text("搜索结果")
          .font(.subheadline)
          .fontWeight(.medium)

        Spacer()

        Button("清除") {
          searchResults = []
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }

      ForEach(searchResults) { result in
        Button {
          addPOIFromSearch(result)
        } label: {
          HStack {
            VStack(alignment: .leading, spacing: 2) {
              Text(result.name)
                .font(.subheadline)
                .fontWeight(.medium)
              if let address = result.address {
                Text(address)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
            Spacer()
            Image(systemName: "plus.circle.fill")
              .foregroundStyle(Color.accentColor)
          }
          .padding()
          .background(Color(.secondarySystemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
        }
        .buttonStyle(.plain)
      }
    }
    .padding()
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .shadow(color: DesignTokens.Shadow.sm.color, radius: DesignTokens.Shadow.sm.radius)
  }

  // MARK: - Command Hints

  private var commandHintsSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("语音命令提示")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(.secondary)

      VStack(alignment: .leading, spacing: 8) {
        CommandHint(command: "添加 [景点名称]", description: "添加景点到当前天")
        CommandHint(command: "删除 [景点名称]", description: "删除指定景点")
        CommandHint(command: "下一个 / 上一个", description: "切换天数")
        CommandHint(command: "搜索 [关键词]", description: "搜索景点")
        CommandHint(command: "第N天", description: "跳转到指定天")
        CommandHint(command: "保存行程", description: "保存当前行程")
      }
    }
    .padding()
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .shadow(color: DesignTokens.Shadow.sm.color, radius: DesignTokens.Shadow.sm.radius)
  }

  // MARK: - Command Handling

  private func handleCommand(_ command: VoiceCommand) {
    switch command {
    case .navigation(let action):
      handleNavigationCommand(action)

    case .itinerary(let action):
      handleItineraryCommand(action)

    case .poi(let action):
      handlePOICommand(action)

    case .search(let query):
      performSearch(query)

    case .memo(let content):
      saveMemo(content)

    case .freeText(let text):
      // Treat as POI name if in adding mode
      if currentMode == .addingPOI {
        addPOI(name: text)
      }
    }
  }

  private func handleNavigationCommand(_ action: VoiceCommand.NavigationAction) {
    switch action {
    case .next:
      navigateToNextDay()
    case .previous:
      navigateToPreviousDay()
    case .goToDay(let day):
      if day > 0 && day <= days.count {
        currentDayIndex = day - 1
        showFeedbackMessage("已跳转到第\(day)天")
      } else {
        showFeedbackMessage("第\(day)天不存在")
      }
    case .goToPOI(let poi):
      // Navigate to specific POI
      showFeedbackMessage("已定位到第\(poi)个景点")
    }
  }

  private func handleItineraryCommand(_ action: VoiceCommand.ItineraryAction) {
    switch action {
    case .create(let dest):
      if let dest {
        destination = dest
        itineraryTitle = "\(dest)之旅"
      }
      showFeedbackMessage("行程已创建")

    case .setDuration(let numDays):
      // Adjust days count
      while days.count < numDays {
        addDay()
      }
      showFeedbackMessage("已设置为\(numDays)天行程")

    case .save:
      saveItinerary()
    }
  }

  private func handlePOICommand(_ action: VoiceCommand.POIAction) {
    switch action {
    case .add(let name, let type):
      addPOI(name: name, type: type)

    case .remove(let name):
      removePOIByName(name)

    case .setTime(let name, let time):
      setPOITime(name: name, time: time)
    }
  }

  // MARK: - Actions

  private func initializeItinerary() {
    if days.isEmpty {
      days = [AiDay(dayNumber: 1, theme: nil, pois: [])]
    }
  }

  private func addDay() {
    let newDay = AiDay(dayNumber: days.count + 1, theme: nil, pois: [])
    days.append(newDay)
    currentDayIndex = days.count - 1
    showFeedbackMessage("已添加第\(newDay.dayNumber)天")
  }

  private func addPOI(name: String, type: String? = nil) {
    guard days.indices.contains(currentDayIndex) else { return }

    let poi = AiPoi(
      name: name,
      type: type ?? "attraction",
      description: nil,
      latitude: nil,
      longitude: nil,
      address: nil
    )

    days[currentDayIndex].pois.append(poi)
    showFeedbackMessage("已添加: \(name)")
    currentMode = .idle
  }

  private func addPOIFromSearch(_ result: SearchedPOI) {
    guard days.indices.contains(currentDayIndex) else { return }

    let poi = AiPoi(
      name: result.name,
      type: result.type ?? "attraction",
      description: nil,
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address
    )

    days[currentDayIndex].pois.append(poi)
    searchResults.removeAll { $0.id == result.id }
    showFeedbackMessage("已添加: \(result.name)")
  }

  private func removePOI(_ poi: AiPoi) {
    guard days.indices.contains(currentDayIndex) else { return }
    days[currentDayIndex].pois.removeAll { $0.id == poi.id }
    showFeedbackMessage("已删除: \(poi.name)")
  }

  private func removePOIByName(_ name: String) {
    guard days.indices.contains(currentDayIndex) else { return }

    let lowercasedName = name.lowercased()
    if let index = days[currentDayIndex].pois.firstIndex(where: {
      $0.name.lowercased().contains(lowercasedName)
    }) {
      let removed = days[currentDayIndex].pois.remove(at: index)
      showFeedbackMessage("已删除: \(removed.name)")
    } else {
      showFeedbackMessage("未找到: \(name)")
    }
  }

  private func setPOITime(name: String, time: String) {
    guard days.indices.contains(currentDayIndex) else { return }

    let lowercasedName = name.lowercased()
    if let index = days[currentDayIndex].pois.firstIndex(where: {
      $0.name.lowercased().contains(lowercasedName)
    }) {
      days[currentDayIndex].pois[index].time = time
      showFeedbackMessage("\(name)时间已设为\(time)")
    }
  }

  private func navigateToNextDay() {
    if currentDayIndex < days.count - 1 {
      currentDayIndex += 1
      showFeedbackMessage("第\(currentDayIndex + 1)天")
    } else {
      showFeedbackMessage("已是最后一天")
    }
  }

  private func navigateToPreviousDay() {
    if currentDayIndex > 0 {
      currentDayIndex -= 1
      showFeedbackMessage("第\(currentDayIndex + 1)天")
    } else {
      showFeedbackMessage("已是第一天")
    }
  }

  private func performSearch(_ query: String) {
    currentMode = .searching
    isSearching = true

    // Simulate search with local results
    // In production, this would call the API
    Task {
      try? await Task.sleep(for: .milliseconds(500))

      await MainActor.run {
        searchResults = [
          SearchedPOI(id: UUID(), name: "\(query) 景点1", type: "attraction", address: "示例地址1", latitude: 31.23, longitude: 121.47),
          SearchedPOI(id: UUID(), name: "\(query) 餐厅", type: "restaurant", address: "示例地址2", latitude: 31.24, longitude: 121.48),
          SearchedPOI(id: UUID(), name: "\(query) 酒店", type: "hotel", address: "示例地址3", latitude: 31.25, longitude: 121.49)
        ]
        isSearching = false
        showFeedbackMessage("找到\(searchResults.count)个结果")
      }
    }
  }

  private func saveMemo(_ content: String) {
    // Save voice memo associated with current itinerary
    showFeedbackMessage("备忘已保存: \(content)")
  }

  private func saveItinerary() {
    let itinerary = SavedItinerary(
      title: itineraryTitle.isEmpty ? "语音创建的行程" : itineraryTitle,
      destination: destination.isEmpty ? nil : destination,
      daysCount: days.count
    )

    var finalItinerary = itinerary
    finalItinerary.days = days

    ItineraryStore.shared.update(finalItinerary)
    onSave?(finalItinerary)
    dismiss()
  }

  private func showFeedbackMessage(_ message: String) {
    feedbackMessage = message
    withAnimation {
      showFeedback = true
    }

    Task {
      try? await Task.sleep(for: .seconds(2))
      await MainActor.run {
        withAnimation {
          showFeedback = false
        }
      }
    }
  }
}

// MARK: - Voice Mode

enum VoiceMode {
  case idle
  case addingPOI
  case searching
  case memo

  var icon: String {
    switch self {
    case .idle: return "mic.circle"
    case .addingPOI: return "mappin.circle"
    case .searching: return "magnifyingglass.circle"
    case .memo: return "note.text"
    }
  }

  var color: Color {
    switch self {
    case .idle: return .accentColor
    case .addingPOI: return .green
    case .searching: return .orange
    case .memo: return .purple
    }
  }

  var description: String {
    switch self {
    case .idle: return "等待语音输入"
    case .addingPOI: return "添加景点模式"
    case .searching: return "搜索模式"
    case .memo: return "备忘模式"
    }
  }

  var placeholder: String {
    switch self {
    case .idle: return "说「添加故宫」或「搜索餐厅」"
    case .addingPOI: return "说出景点名称..."
    case .searching: return "说出搜索关键词..."
    case .memo: return "说出备忘内容..."
    }
  }
}

// MARK: - Helper Views

struct DayChip: View {
  let day: AiDay
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(spacing: 2) {
        Text("第\(day.dayNumber)天")
          .font(.caption)
          .fontWeight(isSelected ? .semibold : .regular)
        Text("\(day.pois.count)景点")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      .background(isSelected ? Color.accentColor : Color(.secondarySystemBackground))
      .foregroundStyle(isSelected ? .white : .primary)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
    }
    .buttonStyle(.plain)
  }
}

struct POIRow: View {
  let poi: AiPoi
  let onDelete: () -> Void

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          if let time = poi.time {
            Text(time)
              .font(.caption)
              .foregroundStyle(.blue)
              .monospacedDigit()
          }
          Text(poi.name)
            .font(.subheadline)
        }
        if let type = poi.type {
          Text(type)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()

      Button(action: onDelete) {
        Image(systemName: "xmark.circle.fill")
          .foregroundStyle(.secondary)
      }
      .buttonStyle(.plain)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(Color(.secondarySystemBackground))
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
  }
}

private struct QuickActionButton: View {
  let icon: String
  let title: String
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.title3)
          .foregroundStyle(Color.accentColor)
        Text(title)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 12)
      .background(Color(.secondarySystemBackground))
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
    }
    .buttonStyle(.plain)
  }
}

struct CommandHint: View {
  let command: String
  let description: String

  var body: some View {
    HStack {
      Text(command)
        .font(.caption)
        .fontWeight(.medium)
        .foregroundStyle(Color.accentColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.accentColor.opacity(0.1))
        .clipShape(Capsule())

      Text(description)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
  }
}

// MARK: - Search Result Model

struct SearchedPOI: Identifiable {
  let id: UUID
  let name: String
  let type: String?
  let address: String?
  let latitude: Double?
  let longitude: Double?
}

// MARK: - Preview

#Preview {
  VoiceItineraryView()
}
