import SwiftUI

/// Sheet for copying an itinerary with options for date selection and partial copy
struct CopyItinerarySheet: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(AppState.self) private var appState

  let itinerary: SavedItinerary
  let onCopyComplete: (SavedItinerary) -> Void

  @State private var newStartDate = Date()
  @State private var newTitle: String = ""
  @State private var isPartialCopy = false
  @State private var selectedDays: Set<Int> = []
  @State private var isCopying = false
  @State private var showSuccess = false

  private var store: ItineraryStore { ItineraryStore.shared }

  var body: some View {
    NavigationStack {
      Form {
        // MARK: - Basic Info Section
        Section {
          TextField("行程名称", text: $newTitle)
            .onAppear {
              newTitle = "\(itinerary.title) (副本)"
            }

          DatePicker(
            "开始日期",
            selection: $newStartDate,
            displayedComponents: .date
          )
        } header: {
          Text("基本信息")
        }

        // MARK: - Copy Mode Section
        Section {
          Toggle("仅复制部分天数", isOn: $isPartialCopy.animation())

          if isPartialCopy {
            daySelectionView
          }
        } header: {
          Text("复制选项")
        } footer: {
          if isPartialCopy {
            Text("选择要复制的天数，其他天数将被跳过")
          } else {
            Text("将复制所有 \(itinerary.days.count) 天的行程")
          }
        }

        // MARK: - Preview Section
        Section {
          copyPreviewView
        } header: {
          Text("复制预览")
        }
      }
      .navigationTitle("复制行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") {
            dismiss()
          }
          .disabled(isCopying)
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            performCopy()
          } label: {
            if isCopying {
              ProgressView()
            } else {
              Text("复制")
                .fontWeight(.semibold)
            }
          }
          .disabled(isCopying || (isPartialCopy && selectedDays.isEmpty))
        }
      }
      .alert("复制成功", isPresented: $showSuccess) {
        Button("查看行程") {
          appState.selectedTab = .itinerary
          dismiss()
        }
        Button("继续", role: .cancel) {
          dismiss()
        }
      } message: {
        Text("行程已复制到「我的行程」")
      }
    }
  }

  // MARK: - Day Selection View

  private var daySelectionView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text("选择天数")
          .font(.subheadline)
          .foregroundStyle(.secondary)

        Spacer()

        Button(selectedDays.count == itinerary.days.count ? "取消全选" : "全选") {
          if selectedDays.count == itinerary.days.count {
            selectedDays.removeAll()
          } else {
            selectedDays = Set(itinerary.days.map(\.dayNumber))
          }
        }
        .font(.caption)
      }

      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 70))],
        spacing: DesignTokens.Spacing.sm
      ) {
        ForEach(itinerary.days) { day in
          DaySelectionChip(
            day: day,
            isSelected: selectedDays.contains(day.dayNumber)
          ) {
            if selectedDays.contains(day.dayNumber) {
              selectedDays.remove(day.dayNumber)
            } else {
              selectedDays.insert(day.dayNumber)
            }
          }
        }
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Copy Preview View

  private var copyPreviewView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "doc.on.doc.fill")
          .foregroundStyle(.blue)
        Text(newTitle.isEmpty ? "\(itinerary.title) (副本)" : newTitle)
          .font(.headline)
          .lineLimit(1)
      }

      HStack(spacing: DesignTokens.Spacing.md) {
        Label {
          Text(formattedDate(newStartDate))
        } icon: {
          Image(systemName: "calendar")
            .foregroundStyle(.orange)
        }

        Label {
          Text("\(daysToBecopied)天")
        } icon: {
          Image(systemName: "clock")
            .foregroundStyle(.green)
        }

        Label {
          Text("\(poisToBeCopied)景点")
        } icon: {
          Image(systemName: "mappin")
            .foregroundStyle(.red)
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Computed Properties

  private var daysToBecopied: Int {
    if isPartialCopy {
      return selectedDays.count
    }
    return itinerary.days.count
  }

  private var poisToBeCopied: Int {
    if isPartialCopy {
      return itinerary.days
        .filter { selectedDays.contains($0.dayNumber) }
        .reduce(0) { $0 + $1.pois.count }
    }
    return itinerary.days.reduce(0) { $0 + $1.pois.count }
  }

  // MARK: - Helper Methods

  private func formattedDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy年M月d日"
    return formatter.string(from: date)
  }

  private func performCopy() {
    isCopying = true

    Task { @MainActor in
      let newItinerary: SavedItinerary

      if isPartialCopy && !selectedDays.isEmpty {
        newItinerary = store.copyItineraryPartial(
          itinerary,
          selectedDays: Array(selectedDays).sorted(),
          newStartDate: newStartDate,
          newTitle: newTitle.isEmpty ? nil : newTitle
        )
      } else {
        newItinerary = store.copyItinerary(itinerary, newStartDate: newStartDate)
      }

      isCopying = false
      showSuccess = true
      onCopyComplete(newItinerary)
    }
  }
}

// MARK: - Day Selection Chip

struct DaySelectionChip: View {
  let day: AiDay
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(spacing: 2) {
        Text("Day \(day.dayNumber)")
          .font(.caption)
          .fontWeight(.medium)

        Text("\(day.pois.count)点")
          .font(.caption2)
          .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
      }
      .frame(minWidth: 60)
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isSelected ? Color.accentColor : Color(.systemGray6))
      )
      .foregroundStyle(isSelected ? .white : .primary)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Copy from Guide Sheet

/// Sheet for copying a BlogPost guide with options
struct CopyGuideSheet: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(AppState.self) private var appState

  let guide: BlogPost
  let onCopyComplete: (SavedItinerary) -> Void

  @State private var newStartDate = Date()
  @State private var isPartialCopy = false
  @State private var selectedDays: Set<Int> = []
  @State private var isCopying = false
  @State private var showSuccess = false

  private var store: ItineraryStore { ItineraryStore.shared }
  private var days: [AiDay] { guide.aiDays ?? [] }

  var body: some View {
    NavigationStack {
      Form {
        // MARK: - Basic Info Section
        Section {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(guide.title)
              .font(.headline)

            if let author = guide.authorName {
              Text("作者: \(author)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          DatePicker(
            "开始日期",
            selection: $newStartDate,
            displayedComponents: .date
          )
        } header: {
          Text("行程信息")
        }

        // MARK: - Copy Mode Section
        if !days.isEmpty {
          Section {
            Toggle("仅复制部分天数", isOn: $isPartialCopy.animation())

            if isPartialCopy {
              guideDaySelectionView
            }
          } header: {
            Text("复制选项")
          } footer: {
            if isPartialCopy {
              Text("选择要复制的天数，其他天数将被跳过")
            } else {
              Text("将复制所有 \(days.count) 天的行程")
            }
          }
        }

        // MARK: - Preview Section
        Section {
          copyPreviewView
        } header: {
          Text("复制预览")
        }
      }
      .navigationTitle("复制到我的行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") {
            dismiss()
          }
          .disabled(isCopying)
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            performCopy()
          } label: {
            if isCopying {
              ProgressView()
            } else {
              Text("复制")
                .fontWeight(.semibold)
            }
          }
          .disabled(isCopying || (isPartialCopy && selectedDays.isEmpty))
        }
      }
      .alert("复制成功", isPresented: $showSuccess) {
        Button("查看行程") {
          appState.selectedTab = .itinerary
          dismiss()
        }
        Button("继续浏览", role: .cancel) {
          dismiss()
        }
      } message: {
        Text("行程已保存到「我的行程」")
      }
    }
  }

  // MARK: - Day Selection View

  private var guideDaySelectionView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text("选择天数")
          .font(.subheadline)
          .foregroundStyle(.secondary)

        Spacer()

        Button(selectedDays.count == days.count ? "取消全选" : "全选") {
          if selectedDays.count == days.count {
            selectedDays.removeAll()
          } else {
            selectedDays = Set(days.map(\.dayNumber))
          }
        }
        .font(.caption)
      }

      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 70))],
        spacing: DesignTokens.Spacing.sm
      ) {
        ForEach(days) { day in
          DaySelectionChip(
            day: day,
            isSelected: selectedDays.contains(day.dayNumber)
          ) {
            if selectedDays.contains(day.dayNumber) {
              selectedDays.remove(day.dayNumber)
            } else {
              selectedDays.insert(day.dayNumber)
            }
          }
        }
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Copy Preview View

  private var copyPreviewView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "doc.on.doc.fill")
          .foregroundStyle(.blue)
        Text(guide.title)
          .font(.headline)
          .lineLimit(1)
      }

      HStack(spacing: DesignTokens.Spacing.md) {
        Label {
          Text(formattedDate(newStartDate))
        } icon: {
          Image(systemName: "calendar")
            .foregroundStyle(.orange)
        }

        Label {
          Text("\(daysToBecopied)天")
        } icon: {
          Image(systemName: "clock")
            .foregroundStyle(.green)
        }

        Label {
          Text("\(poisToBeCopied)景点")
        } icon: {
          Image(systemName: "mappin")
            .foregroundStyle(.red)
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Computed Properties

  private var daysToBecopied: Int {
    if isPartialCopy {
      return selectedDays.count
    }
    return days.count
  }

  private var poisToBeCopied: Int {
    if isPartialCopy {
      return days
        .filter { selectedDays.contains($0.dayNumber) }
        .reduce(0) { $0 + $1.pois.count }
    }
    return days.reduce(0) { $0 + $1.pois.count }
  }

  // MARK: - Helper Methods

  private func formattedDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy年M月d日"
    return formatter.string(from: date)
  }

  private func performCopy() {
    isCopying = true

    Task { @MainActor in
      let selectedDaysArray = isPartialCopy && !selectedDays.isEmpty
        ? Array(selectedDays).sorted()
        : nil

      let newItinerary = store.copyFromGuide(
        guide,
        selectedDays: selectedDaysArray,
        newStartDate: newStartDate
      )

      isCopying = false
      showSuccess = true
      onCopyComplete(newItinerary)
    }
  }
}

#Preview("Copy Itinerary") {
  CopyItinerarySheet(
    itinerary: SavedItinerary(
      title: "东京5日游",
      destination: "东京",
      daysCount: 5
    )
  ) { _ in }
    .environment(AppState())
}

#Preview("Copy Guide") {
  CopyGuideSheet(
    guide: BlogPost(
      id: "1",
      title: "京都赏樱攻略",
      authorName: "旅行达人",
      content: nil,
      summary: nil,
      coverImageUrl: nil,
      imageUrls: nil,
      sourcePlatform: "xiaohongshu",
      qualityScore: nil,
      viewsCount: nil,
      likesCount: nil,
      savesCount: nil,
      createdAt: nil,
      destinations: nil,
      aiSummary: nil,
      aiTips: nil,
      aiBestTime: nil,
      aiDuration: nil,
      aiBudget: nil,
      aiDays: [
        AiDay(dayNumber: 1, theme: "抵达", pois: []),
        AiDay(dayNumber: 2, theme: "赏樱", pois: []),
        AiDay(dayNumber: 3, theme: "寺庙", pois: [])
      ],
      aiProcessedAt: nil
    )
  ) { _ in }
    .environment(AppState())
}

// MARK: - Copy Public Itinerary Sheet

/// Sheet for copying a public itinerary from API with options
struct CopyPublicItinerarySheet: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(AppState.self) private var appState

  let itinerary: APIItinerary
  let onCopyComplete: (SavedItinerary) -> Void

  @State private var newStartDate = Date()
  @State private var newTitle: String = ""
  @State private var isPartialCopy = false
  @State private var selectedDays: Set<Int> = []
  @State private var isCopying = false
  @State private var showSuccess = false
  @State private var errorMessage: String?
  @State private var showError = false

  private var store: ItineraryStore { ItineraryStore.shared }
  private var days: [APIItineraryDay] { itinerary.days ?? [] }

  var body: some View {
    NavigationStack {
      Form {
        // MARK: - Basic Info Section
        Section {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(itinerary.title)
              .font(.headline)

            if let author = itinerary.originalAuthor?.displayName {
              HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "person.circle.fill")
                  .foregroundStyle(.secondary)
                Text("原作者: \(author)")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }

            if let cityName = itinerary.cityName {
              HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "mappin.circle.fill")
                  .foregroundStyle(.red.opacity(0.7))
                Text(cityName)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }

          TextField("新行程名称", text: $newTitle)
            .onAppear {
              newTitle = "\(itinerary.title)"
            }

          DatePicker(
            "开始日期",
            selection: $newStartDate,
            displayedComponents: .date
          )
        } header: {
          Text("行程信息")
        }

        // MARK: - Copy Mode Section
        if !days.isEmpty {
          Section {
            Toggle("仅复制部分天数", isOn: $isPartialCopy.animation())

            if isPartialCopy {
              apiDaySelectionView
            }
          } header: {
            Text("复制选项")
          } footer: {
            if isPartialCopy {
              Text("选择要复制的天数，其他天数将被跳过")
            } else {
              Text("将复制所有 \(days.count) 天的行程")
            }
          }
        }

        // MARK: - Preview Section
        Section {
          apiCopyPreviewView
        } header: {
          Text("复制预览")
        }

        // MARK: - Original Author Attribution
        if itinerary.originalAuthor != nil || itinerary.copiedFromId != nil {
          Section {
            HStack {
              Image(systemName: "link")
                .foregroundStyle(.blue)
              Text("复制后将保留原作者信息")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          } footer: {
            Text("尊重原创，感谢分享")
          }
        }
      }
      .navigationTitle("复制公开行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") {
            dismiss()
          }
          .disabled(isCopying)
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            performAPICopy()
          } label: {
            if isCopying {
              ProgressView()
            } else {
              Text("复制")
                .fontWeight(.semibold)
            }
          }
          .disabled(isCopying || (isPartialCopy && selectedDays.isEmpty))
        }
      }
      .alert("复制成功", isPresented: $showSuccess) {
        Button("查看行程") {
          appState.selectedTab = .itinerary
          dismiss()
        }
        Button("继续浏览", role: .cancel) {
          dismiss()
        }
      } message: {
        Text("行程已保存到「我的行程」")
      }
      .alert("复制失败", isPresented: $showError) {
        Button("确定", role: .cancel) {}
      } message: {
        Text(errorMessage ?? "未知错误，请稍后重试")
      }
    }
  }

  // MARK: - Day Selection View

  private var apiDaySelectionView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Text("选择天数")
          .font(.subheadline)
          .foregroundStyle(.secondary)

        Spacer()

        Button(selectedDays.count == days.count ? "取消全选" : "全选") {
          if selectedDays.count == days.count {
            selectedDays.removeAll()
          } else {
            selectedDays = Set(days.map(\.dayNumber))
          }
        }
        .font(.caption)
      }

      LazyVGrid(
        columns: [GridItem(.adaptive(minimum: 70))],
        spacing: DesignTokens.Spacing.sm
      ) {
        ForEach(days) { day in
          APIDaySelectionChip(
            day: day,
            isSelected: selectedDays.contains(day.dayNumber)
          ) {
            if selectedDays.contains(day.dayNumber) {
              selectedDays.remove(day.dayNumber)
            } else {
              selectedDays.insert(day.dayNumber)
            }
          }
        }
      }
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Copy Preview View

  private var apiCopyPreviewView: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "doc.on.doc.fill")
          .foregroundStyle(.blue)
        Text(newTitle.isEmpty ? itinerary.title : newTitle)
          .font(.headline)
          .lineLimit(1)
      }

      HStack(spacing: DesignTokens.Spacing.md) {
        Label {
          Text(formattedDate(newStartDate))
        } icon: {
          Image(systemName: "calendar")
            .foregroundStyle(.orange)
        }

        Label {
          Text("\(daysToBecopied)天")
        } icon: {
          Image(systemName: "clock")
            .foregroundStyle(.green)
        }

        Label {
          Text("\(poisToBeCopied)景点")
        } icon: {
          Image(systemName: "mappin")
            .foregroundStyle(.red)
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  // MARK: - Computed Properties

  private var daysToBecopied: Int {
    if isPartialCopy {
      return selectedDays.count
    }
    return days.count
  }

  private var poisToBeCopied: Int {
    if isPartialCopy {
      return days
        .filter { selectedDays.contains($0.dayNumber) }
        .reduce(0) { $0 + ($1.items?.count ?? 0) }
    }
    return days.reduce(0) { $0 + ($1.items?.count ?? 0) }
  }

  // MARK: - Helper Methods

  private func formattedDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy年M月d日"
    return formatter.string(from: date)
  }

  private func performAPICopy() {
    isCopying = true

    Task { @MainActor in
      do {
        let newItinerary: SavedItinerary

        if isPartialCopy && !selectedDays.isEmpty {
          newItinerary = try await store.copyItineraryPartialFromAPI(
            itineraryId: itinerary.id,
            newStartDate: newStartDate,
            selectedDays: Array(selectedDays).sorted(),
            newTitle: newTitle.isEmpty ? nil : newTitle
          )
        } else {
          newItinerary = try await store.copyItineraryFromAPI(
            itineraryId: itinerary.id,
            newStartDate: newStartDate
          )
        }

        isCopying = false
        showSuccess = true
        onCopyComplete(newItinerary)
      } catch {
        isCopying = false
        errorMessage = error.localizedDescription
        showError = true
      }
    }
  }
}

// MARK: - API Day Selection Chip

struct APIDaySelectionChip: View {
  let day: APIItineraryDay
  let isSelected: Bool
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(spacing: 2) {
        Text("Day \(day.dayNumber)")
          .font(.caption)
          .fontWeight(.medium)

        Text("\(day.items?.count ?? 0)点")
          .font(.caption2)
          .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
      }
      .frame(minWidth: 60)
      .padding(.horizontal, DesignTokens.Spacing.sm)
      .padding(.vertical, DesignTokens.Spacing.xs)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(isSelected ? Color.accentColor : Color(.systemGray6))
      )
      .foregroundStyle(isSelected ? .white : .primary)
    }
    .buttonStyle(.plain)
  }
}

// MARK: - Copy Stats View

/// View to display copy statistics for an itinerary
struct CopyStatsView: View {
  let itineraryId: String

  @State private var stats: ItineraryCopyStats?
  @State private var isLoading = true
  @State private var error: Error?

  var body: some View {
    Group {
      if isLoading {
        HStack(spacing: DesignTokens.Spacing.xs) {
          ProgressView()
            .scaleEffect(0.8)
          Text("加载中...")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      } else if let stats = stats {
        HStack(spacing: DesignTokens.Spacing.sm) {
          Image(systemName: "doc.on.doc")
            .foregroundStyle(.blue)

          VStack(alignment: .leading, spacing: 2) {
            Text("被复制 \(stats.copyCount) 次")
              .font(.caption)
              .fontWeight(.medium)

            if !stats.recentCopies.isEmpty {
              Text("最近有 \(stats.recentCopies.count) 次复制")
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
          }
        }
        .padding(DesignTokens.Spacing.sm)
        .background(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(Color.blue.opacity(0.1))
        )
      } else if error != nil {
        EmptyView()
      }
    }
    .task {
      await loadStats()
    }
  }

  private func loadStats() async {
    do {
      stats = try await ItineraryStore.shared.getCopyStats(itineraryId: itineraryId)
      isLoading = false
    } catch {
      self.error = error
      isLoading = false
    }
  }
}

// MARK: - Original Author Badge

/// Badge to display original author info for copied itineraries
struct OriginalAuthorBadge: View {
  let author: SavedItineraryOriginalAuthor

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      if let avatarUrl = author.avatarUrl, let url = URL(string: avatarUrl) {
        CachedAsyncImage(url: url) { image in
          image
            .resizable()
            .aspectRatio(contentMode: .fill)
        } placeholder: {
          Circle()
            .fill(Color(.systemGray5))
        }
        .frame(width: 20, height: 20)
        .clipShape(Circle())
      } else {
        Image(systemName: "person.circle.fill")
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }

      if let displayName = author.displayName {
        Text("来自 \(displayName)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.horizontal, DesignTokens.Spacing.sm)
    .padding(.vertical, DesignTokens.Spacing.xs)
    .background(
      Capsule()
        .fill(Color(.systemGray6))
    )
  }
}

#Preview("Copy Public Itinerary") {
  CopyPublicItinerarySheet(
    itinerary: APIItinerary(
      id: "test-id",
      userId: "user-1",
      title: "东京7日游",
      cityId: "tokyo",
      startDate: "2024-05-01",
      endDate: "2024-05-07",
      visibility: "public",
      coverImageUrl: nil,
      copiedFromId: nil,
      cityName: "东京",
      daysCount: 7,
      days: [
        APIItineraryDay(id: "d1", itineraryId: "test-id", dayNumber: 1, date: "2024-05-01", items: []),
        APIItineraryDay(id: "d2", itineraryId: "test-id", dayNumber: 2, date: "2024-05-02", items: []),
        APIItineraryDay(id: "d3", itineraryId: "test-id", dayNumber: 3, date: "2024-05-03", items: [])
      ],
      collaborators: nil,
      originalAuthor: OriginalAuthorInfo(
        userId: "author-1",
        displayName: "旅行大师",
        avatarUrl: nil
      )
    )
  ) { _ in }
    .environment(AppState())
}
