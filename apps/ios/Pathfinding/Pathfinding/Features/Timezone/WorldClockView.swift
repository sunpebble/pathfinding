import SwiftUI

/// World Clock view displaying multiple timezone clocks
struct WorldClockView: View {
  @State private var store = TimezoneStore.shared
  @State private var showAddCity = false
  @State private var showSettings = false
  @State private var editMode: EditMode = .inactive

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Home timezone card
          if let homeCity = store.homeCity {
            HomeClockCard(city: homeCity, currentTime: store.currentTime, settings: store.settings)
          } else {
            HomeClockCard(
              timezone: store.settings.homeTimezone,
              currentTime: store.currentTime,
              settings: store.settings
            )
          }

          // World clock list
          if store.worldClockItems.isEmpty {
            EmptyWorldClockView(onAddCity: { showAddCity = true })
          } else {
            WorldClockList(
              items: store.worldClockItems,
              currentTime: store.currentTime,
              settings: store.settings,
              homeTimezone: store.settings.homeTimezone,
              editMode: $editMode,
              onDelete: { cityId in
                Task {
                  _ = await store.removeCityFromWorldClock(cityId: cityId)
                }
              },
              onReorder: { orderedIds in
                Task {
                  _ = await store.reorderClocks(orderedCityIds: orderedIds)
                }
              }
            )
          }
        }
        .padding()
      }
      .background(DesignTokens.Colors.backgroundGrouped)
      .navigationTitle("世界时钟")
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            showSettings = true
          } label: {
            Image(systemName: "gearshape")
          }
        }

        ToolbarItem(placement: .topBarTrailing) {
          HStack(spacing: DesignTokens.Spacing.sm) {
            if !store.worldClockItems.isEmpty {
              EditButton()
            }

            Button {
              showAddCity = true
            } label: {
              Image(systemName: "plus")
            }
          }
        }
      }
      .environment(\.editMode, $editMode)
      .sheet(isPresented: $showAddCity) {
        AddCitySheet(store: store)
      }
      .sheet(isPresented: $showSettings) {
        TimezoneSettingsSheet(store: store)
      }
      .refreshable {
        await store.loadWorldClock()
      }
      .task {
        await store.loadWorldClock()
      }
    }
  }
}

// MARK: - Home Clock Card

struct HomeClockCard: View {
  let timezone: String
  let currentTime: Date
  let settings: UserTimezoneSettings
  var city: City?

  init(city: City, currentTime: Date, settings: UserTimezoneSettings) {
    self.city = city
    self.timezone = city.timezone
    self.currentTime = currentTime
    self.settings = settings
  }

  init(timezone: String, currentTime: Date, settings: UserTimezoneSettings) {
    self.timezone = timezone
    self.currentTime = currentTime
    self.settings = settings
    self.city = nil
  }

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Header
      HStack {
        Image(systemName: "house.fill")
          .foregroundStyle(DesignTokens.Colors.accent)

        Text("主时区")
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(.secondary)

        Spacer()

        Text(formattedOffset)
          .font(.caption)
          .foregroundStyle(.secondary)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(Color(.systemGray5))
          .clipShape(Capsule())
      }

      // Time display
      HStack(alignment: .firstTextBaseline) {
        Text(formattedTime)
          .font(.system(size: 56, weight: .light, design: .rounded))
          .monospacedDigit()

        if settings.displayFormat == .hour12 {
          Text(amPmText)
            .font(.title3)
            .fontWeight(.medium)
            .foregroundStyle(.secondary)
        }
      }

      // Location and date
      VStack(spacing: 4) {
        Text(displayName)
          .font(.headline)

        Text(formattedDate)
          .font(.subheadline)
          .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.lg)
    .frame(maxWidth: .infinity)
    .background(
      LinearGradient(
        colors: [.indigo.opacity(0.1), .purple.opacity(0.05)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
        .stroke(DesignTokens.Colors.accent.opacity(0.2), lineWidth: 1)
    )
  }

  private var displayName: String {
    city?.displayName ?? formatTimezoneName(timezone)
  }

  private var formattedTime: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)

    switch settings.displayFormat {
    case .hour12:
      formatter.dateFormat = settings.showSeconds ? "h:mm:ss" : "h:mm"
    case .hour24:
      formatter.dateFormat = settings.showSeconds ? "HH:mm:ss" : "HH:mm"
    }

    return formatter.string(from: currentTime)
  }

  private var amPmText: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "a"
    return formatter.string(from: currentTime)
  }

  private var formattedDate: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: timezone)
    formatter.dateFormat = "M月d日 EEEE"
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.string(from: currentTime)
  }

  private var formattedOffset: String {
    guard let tz = TimeZone(identifier: timezone) else { return "" }
    let seconds = tz.secondsFromGMT(for: currentTime)
    let hours = seconds / 3600
    let minutes = abs(seconds / 60) % 60
    let sign = hours >= 0 ? "+" : ""
    return minutes > 0 ? "UTC\(sign)\(hours):\(String(format: "%02d", minutes))" : "UTC\(sign)\(hours)"
  }

  private func formatTimezoneName(_ identifier: String) -> String {
    // Extract city name from timezone identifier (e.g., "Asia/Shanghai" -> "Shanghai")
    if let lastComponent = identifier.split(separator: "/").last {
      return String(lastComponent).replacingOccurrences(of: "_", with: " ")
    }
    return identifier
  }
}

// MARK: - World Clock List

struct WorldClockList: View {
  let items: [WorldClockItem]
  let currentTime: Date
  let settings: UserTimezoneSettings
  let homeTimezone: String
  @Binding var editMode: EditMode
  let onDelete: (String) -> Void
  let onReorder: ([String]) -> Void

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      ForEach(items) { item in
        WorldClockItemCard(
          item: item,
          currentTime: currentTime,
          settings: settings,
          homeTimezone: homeTimezone,
          isEditing: editMode == .active,
          onDelete: { onDelete(item.city.id) }
        )
      }
    }
  }
}

// MARK: - World Clock Item Card

struct WorldClockItemCard: View {
  let item: WorldClockItem
  let currentTime: Date
  let settings: UserTimezoneSettings
  let homeTimezone: String
  let isEditing: Bool
  let onDelete: () -> Void

  @State private var showEditLabel = false
  @State private var editedLabel = ""

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      // Delete button (when editing)
      if isEditing {
        Button {
          onDelete()
        } label: {
          Image(systemName: "minus.circle.fill")
            .foregroundStyle(.red)
            .font(.title2)
        }
      }

      // City info
      VStack(alignment: .leading, spacing: 4) {
        Text(item.displayLabel)
          .font(.headline)

        HStack(spacing: 4) {
          Text(item.city.countryCode)
            .font(.caption)
            .foregroundStyle(.secondary)

          Text("·")
            .foregroundStyle(.secondary)

          Text(timeDifferenceText)
            .font(.caption)
            .foregroundStyle(timeDifferenceColor)
        }
      }

      Spacer()

      // Time display
      VStack(alignment: .trailing, spacing: 2) {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
          Text(formattedTime)
            .font(.system(size: 28, weight: .medium, design: .rounded))
            .monospacedDigit()

          if settings.displayFormat == .hour12 {
            Text(amPmText)
              .font(.caption)
              .fontWeight(.medium)
              .foregroundStyle(.secondary)
          }
        }

        // Day indicator if different
        if dayDifference != 0 {
          Text(dayDifferenceText)
            .font(.caption2)
            .foregroundStyle(.orange)
        }
      }

      // Reorder handle (when editing)
      if isEditing {
        Image(systemName: "line.3.horizontal")
          .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .contentShape(Rectangle())
    .onTapGesture {
      if !isEditing {
        editedLabel = item.label ?? ""
        showEditLabel = true
      }
    }
    .sheet(isPresented: $showEditLabel) {
      EditClockLabelSheet(
        cityName: item.city.displayName,
        label: $editedLabel,
        onSave: {
          Task {
            _ = await TimezoneStore.shared.updateClockLabel(
              cityId: item.city.id,
              label: editedLabel.isEmpty ? nil : editedLabel
            )
          }
        }
      )
    }
  }

  private var formattedTime: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: item.city.timezone)

    switch settings.displayFormat {
    case .hour12:
      formatter.dateFormat = settings.showSeconds ? "h:mm:ss" : "h:mm"
    case .hour24:
      formatter.dateFormat = settings.showSeconds ? "HH:mm:ss" : "HH:mm"
    }

    return formatter.string(from: currentTime)
  }

  private var amPmText: String {
    let formatter = DateFormatter()
    formatter.timeZone = TimeZone(identifier: item.city.timezone)
    formatter.dateFormat = "a"
    return formatter.string(from: currentTime)
  }

  private var timeDifference: TimeDifference {
    TimezoneStore.shared.calculateTimeDifference(from: homeTimezone, to: item.city.timezone)
  }

  private var timeDifferenceText: String {
    let diff = timeDifference
    if diff.hours == 0 && diff.minutes == 0 {
      return "相同时区"
    }
    return diff.formatted
  }

  private var timeDifferenceColor: Color {
    let diff = timeDifference
    if diff.hours == 0 && diff.minutes == 0 {
      return .secondary
    }
    return diff.isAhead ? .green : .orange
  }

  private var dayDifference: Int {
    guard let homeTz = TimeZone(identifier: homeTimezone),
          let cityTz = TimeZone(identifier: item.city.timezone) else { return 0 }

    let calendar = Calendar.current
    let homeDay = calendar.component(.day, from: currentTime.addingTimeInterval(TimeInterval(homeTz.secondsFromGMT(for: currentTime))))
    let cityDay = calendar.component(.day, from: currentTime.addingTimeInterval(TimeInterval(cityTz.secondsFromGMT(for: currentTime))))

    return cityDay - homeDay
  }

  private var dayDifferenceText: String {
    if dayDifference > 0 {
      return "+\(dayDifference)天"
    } else if dayDifference < 0 {
      return "\(dayDifference)天"
    }
    return ""
  }
}

// MARK: - Empty World Clock View

struct EmptyWorldClockView: View {
  let onAddCity: () -> Void

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      Image(systemName: "globe")
        .font(.system(size: 60))
        .foregroundStyle(.secondary)

      VStack(spacing: DesignTokens.Spacing.xs) {
        Text("还没有添加城市")
          .font(.headline)

        Text("添加城市来追踪不同时区的时间")
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
      }

      Button {
        onAddCity()
      } label: {
        Label("添加城市", systemImage: "plus.circle.fill")
      }
      .buttonStyle(.primary)
    }
    .padding(DesignTokens.Spacing.xxl)
  }
}

// MARK: - Add City Sheet

struct AddCitySheet: View {
  let store: TimezoneStore
  @Environment(\.dismiss) private var dismiss
  @State private var searchText = ""

  var body: some View {
    NavigationStack {
      List {
        if store.isSearching {
          HStack {
            Spacer()
            ProgressView()
            Spacer()
          }
        } else if !searchText.isEmpty {
          if store.searchResults.isEmpty {
            ContentUnavailableView(
              "未找到城市",
              systemImage: "magnifyingglass",
              description: Text("尝试搜索其他城市名称")
            )
          } else {
            ForEach(store.searchResults) { city in
              CityRow(city: city) {
                Task {
                  if await store.addCityToWorldClock(cityId: city.id) {
                    dismiss()
                  }
                }
              }
            }
          }
        } else {
          // Show popular cities or all cities
          Section("热门城市") {
            ForEach(popularCities) { city in
              CityRow(city: city) {
                Task {
                  if await store.addCityToWorldClock(cityId: city.id) {
                    dismiss()
                  }
                }
              }
            }
          }
        }
      }
      .searchable(text: $searchText, prompt: "搜索城市")
      .onChange(of: searchText) { _, newValue in
        Task {
          await store.searchCities(query: newValue)
        }
      }
      .navigationTitle("添加城市")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
      }
    }
  }

  // Placeholder popular cities (would come from API in production)
  private var popularCities: [City] {
    store.availableCities.isEmpty ? [] : Array(store.availableCities.prefix(10))
  }
}

// MARK: - City Row

struct CityRow: View {
  let city: City
  let onSelect: () -> Void

  var body: some View {
    Button {
      onSelect()
    } label: {
      HStack {
        VStack(alignment: .leading, spacing: 2) {
          Text(city.displayName)
            .font(.body)
            .foregroundStyle(.primary)

          HStack(spacing: 4) {
            Text(city.countryCode)
            Text("·")
            Text(city.formattedUtcOffset)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        Spacer()

        Text(city.formattedCurrentTime())
          .font(.subheadline)
          .monospacedDigit()
          .foregroundStyle(.secondary)
      }
    }
  }
}

// MARK: - Edit Clock Label Sheet

struct EditClockLabelSheet: View {
  let cityName: String
  @Binding var label: String
  let onSave: () -> Void
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      Form {
        Section {
          TextField("自定义标签", text: $label)
        } header: {
          Text("为 \(cityName) 设置自定义标签")
        } footer: {
          Text("留空将显示城市名称")
        }
      }
      .navigationTitle("编辑标签")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("保存") {
            onSave()
            dismiss()
          }
          .fontWeight(.semibold)
        }
      }
    }
    .presentationDetents([.medium])
  }
}

// MARK: - Timezone Settings Sheet

struct TimezoneSettingsSheet: View {
  let store: TimezoneStore
  @Environment(\.dismiss) private var dismiss
  @State private var displayFormat: TimeDisplayFormat
  @State private var showSeconds: Bool

  init(store: TimezoneStore) {
    self.store = store
    _displayFormat = State(initialValue: store.settings.displayFormat)
    _showSeconds = State(initialValue: store.settings.showSeconds)
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("时间格式") {
          Picker("显示格式", selection: $displayFormat) {
            Text("24小时制").tag(TimeDisplayFormat.hour24)
            Text("12小时制").tag(TimeDisplayFormat.hour12)
          }
          .pickerStyle(.segmented)

          Toggle("显示秒", isOn: $showSeconds)
        }

        Section("主时区") {
          HStack {
            Text("当前时区")
            Spacer()
            Text(store.settings.homeTimezone)
              .foregroundStyle(.secondary)
          }

          if store.settings.autoDetect {
            HStack {
              Image(systemName: "location.fill")
                .foregroundStyle(.blue)
              Text("自动检测")
                .foregroundStyle(.secondary)
            }
          }
        }
      }
      .navigationTitle("时钟设置")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("保存") {
            Task {
              _ = await store.updateDisplayFormat(format: displayFormat, showSeconds: showSeconds)
              dismiss()
            }
          }
          .fontWeight(.semibold)
        }
      }
    }
  }
}

// MARK: - Preview

#Preview {
  WorldClockView()
}
