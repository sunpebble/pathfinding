import EventKit
import SwiftUI

/// Calendar sync configuration and status view for itineraries
struct CalendarSyncView: View {
  let itinerary: SavedItinerary
  @Environment(\.dismiss) private var dismiss

  @State private var startDate = Date()
  @State private var enableReminders = true
  @State private var reminderMinutes = 30
  @State private var isSyncing = false
  @State private var syncError: String?
  @State private var showSuccess = false
  @State private var showExportSheet = false
  @State private var exportFileURL: URL?
  @State private var showSettings = false

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isSynced(itinerary.id.uuidString) }
  private var syncInfo: CalendarSyncInfo? { calendarManager.getSyncInfo(itinerary.id.uuidString) }

  var body: some View {
    NavigationStack {
      Form {
        // MARK: - Authorization Section
        authorizationSection

        // MARK: - Sync Status Section
        if isSynced, let info = syncInfo {
          syncStatusSection(info)
        }

        // MARK: - Sync Options Section
        if !isSynced {
          syncOptionsSection
        }

        // MARK: - Actions Section
        actionsSection

        // MARK: - Export Section
        exportSection

        // MARK: - Statistics Section
        statisticsSection
      }
      .navigationTitle("日历同步")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button {
            showSettings = true
          } label: {
            Image(systemName: "gear")
          }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
      .alert("同步成功", isPresented: $showSuccess) {
        Button("好的", role: .cancel) {}
      } message: {
        Text("行程已同步到日历，您可以在系统日历中查看。")
      }
      .alert(
        "同步失败",
        isPresented: .init(
          get: { syncError != nil },
          set: { if !$0 { syncError = nil } }
        )
      ) {
        Button("好的", role: .cancel) {}
      } message: {
        Text(syncError ?? "未知错误")
      }
      .sheet(isPresented: $showExportSheet) {
        if let url = exportFileURL {
          ActivityShareSheet(items: [url])
        }
      }
      .sheet(isPresented: $showSettings) {
        CalendarSettingsView()
      }
    }
  }

  // MARK: - Authorization Section

  @ViewBuilder
  private var authorizationSection: some View {
    Section {
      HStack {
        Image(
          systemName: calendarManager.isAuthorized
            ? "checkmark.circle.fill" : "exclamationmark.circle.fill"
        )
        .foregroundStyle(calendarManager.isAuthorized ? .green : .orange)

        VStack(alignment: .leading, spacing: 2) {
          Text("日历权限")
            .font(.subheadline)
          Text(calendarManager.isAuthorized ? "已授权" : "需要授权才能同步")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        if !calendarManager.isAuthorized {
          Button("授权") {
            Task {
              await calendarManager.requestAccess()
            }
          }
          .buttonStyle(.borderedProminent)
          .controlSize(.small)
        }
      }

      // Calendar selector
      if calendarManager.isAuthorized && !calendarManager.availableCalendars.isEmpty {
        Picker("目标日历", selection: .init(
          get: { calendarManager.selectedCalendarId ?? "" },
          set: { calendarManager.selectedCalendarId = $0.isEmpty ? nil : $0 }
        )) {
          Text("默认日历").tag("")
          ForEach(calendarManager.availableCalendars, id: \.calendarIdentifier) { calendar in
            HStack {
              Circle()
                .fill(Color(cgColor: calendar.cgColor))
                .frame(width: 12, height: 12)
              Text(calendar.title)
            }
            .tag(calendar.calendarIdentifier)
          }
        }
      }
    } header: {
      Text("权限状态")
    }
  }

  // MARK: - Sync Status Section

  @ViewBuilder
  private func syncStatusSection(_ info: CalendarSyncInfo) -> some View {
    Section {
      LabeledContent("同步状态") {
        HStack(spacing: 4) {
          Image(systemName: "checkmark.circle.fill")
            .foregroundStyle(.green)
          Text("已同步")
        }
      }

      LabeledContent("同步时间") {
        Text(info.syncedAt, style: .relative)
          .foregroundStyle(.secondary)
      }

      LabeledContent("开始日期") {
        Text(info.startDate, style: .date)
          .foregroundStyle(.secondary)
      }

      LabeledContent("事件数量") {
        Text("\(info.eventIds.count) 个")
          .foregroundStyle(.secondary)
      }

      if info.enableReminders {
        LabeledContent("提醒") {
          Text("提前 \(info.reminderMinutes) 分钟")
            .foregroundStyle(.secondary)
        }
      }
    } header: {
      Text("同步信息")
    }
  }

  // MARK: - Sync Options Section

  @ViewBuilder
  private var syncOptionsSection: some View {
    Section {
      DatePicker(
        "行程开始日期",
        selection: $startDate,
        displayedComponents: .date
      )

      Toggle("启用提醒", isOn: $enableReminders)

      if enableReminders {
        Picker("提前提醒", selection: $reminderMinutes) {
          Text("15 分钟").tag(15)
          Text("30 分钟").tag(30)
          Text("1 小时").tag(60)
          Text("2 小时").tag(120)
          Text("1 天").tag(1440)
        }
      }
    } header: {
      Text("同步选项")
    } footer: {
      Text("行程中的每个景点将创建为独立的日历事件")
    }
  }

  // MARK: - Actions Section

  @ViewBuilder
  private var actionsSection: some View {
    Section {
      if isSynced {
        // Re-sync button
        Button {
          Task { await syncToCalendar() }
        } label: {
          HStack {
            Image(systemName: "arrow.triangle.2.circlepath")
            Text("重新同步")
            Spacer()
            if isSyncing {
              ProgressView()
            }
          }
        }
        .disabled(isSyncing || !calendarManager.isAuthorized)

        // Unsync button
        Button(role: .destructive) {
          Task { await unsyncFromCalendar() }
        } label: {
          HStack {
            Image(systemName: "calendar.badge.minus")
            Text("取消同步")
            Spacer()
            if isSyncing {
              ProgressView()
            }
          }
        }
        .disabled(isSyncing)
      } else {
        // Sync button
        Button {
          Task { await syncToCalendar() }
        } label: {
          HStack {
            Image(systemName: "calendar.badge.plus")
            Text("同步到日历")
            Spacer()
            if isSyncing {
              ProgressView()
            }
          }
        }
        .disabled(isSyncing || !calendarManager.isAuthorized)
      }
    } header: {
      Text("操作")
    }
  }

  // MARK: - Export Section

  @ViewBuilder
  private var exportSection: some View {
    Section {
      Button {
        exportToICalFile()
      } label: {
        HStack {
          Image(systemName: "square.and.arrow.up")
          Text("导出 iCal 文件")
          Spacer()
          Image(systemName: "doc.text")
            .foregroundStyle(.secondary)
        }
      }
    } header: {
      Text("导出")
    } footer: {
      Text("导出为 .ics 文件，可导入到任何支持 iCal 的日历应用")
    }
  }

  // MARK: - Statistics Section

  @ViewBuilder
  private var statisticsSection: some View {
    let stats = calendarManager.syncStatistics
    if stats.totalEvents > 0 {
      Section {
        LabeledContent("已同步行程") {
          Text("\(stats.syncedItineraries) 个")
        }
        LabeledContent("已同步航班") {
          Text("\(stats.syncedFlights) 个")
        }
        LabeledContent("已同步酒店") {
          Text("\(stats.syncedHotels) 个")
        }
        LabeledContent("总事件数") {
          Text("\(stats.totalEvents) 个")
            .fontWeight(.medium)
        }
      } header: {
        Text("同步统计")
      }
    }
  }

  // MARK: - Actions

  private func syncToCalendar() async {
    isSyncing = true
    defer { isSyncing = false }

    // Request access if needed
    if !calendarManager.isAuthorized {
      let granted = await calendarManager.requestAccess()
      if !granted {
        syncError = "需要日历访问权限才能同步"
        return
      }
    }

    let result = await calendarManager.syncItinerary(
      itinerary,
      startDate: startDate,
      enableReminders: enableReminders,
      reminderMinutes: reminderMinutes
    )

    switch result {
    case .success:
      showSuccess = true
    case .failure(let error):
      syncError = error.localizedDescription
    }
  }

  private func unsyncFromCalendar() async {
    isSyncing = true
    defer { isSyncing = false }

    let result = await calendarManager.unsyncItinerary(itinerary.id.uuidString)

    switch result {
    case .success:
      // Success - UI will update automatically
      break
    case .failure(let error):
      syncError = error.localizedDescription
    }
  }

  private func exportToICalFile() {
    if let url = calendarManager.exportToFile(itinerary, startDate: startDate) {
      exportFileURL = url
      showExportSheet = true
    } else {
      syncError = "导出失败，请重试"
    }
  }
}

// MARK: - Calendar Settings View

struct CalendarSettingsView: View {
  @Environment(\.dismiss) private var dismiss

  private var calendarManager: CalendarManager { CalendarManager.shared }

  @State private var bidirectionalSync: Bool = false
  @State private var defaultReminderMinutes: Int = 30
  @State private var autoSyncFlights: Bool = false
  @State private var autoSyncHotels: Bool = false

  var body: some View {
    NavigationStack {
      Form {
        // MARK: - Sync Settings
        Section {
          Toggle("双向同步", isOn: $bidirectionalSync)
            .onChange(of: bidirectionalSync) { _, newValue in
              calendarManager.bidirectionalSyncEnabled = newValue
            }
        } header: {
          Text("同步设置")
        } footer: {
          Text("启用后，当您在系统日历中删除或修改事件时，应用会自动更新同步状态。")
        }

        // MARK: - Default Reminders
        Section {
          Picker("默认提醒时间", selection: $defaultReminderMinutes) {
            Text("不提醒").tag(0)
            Text("15 分钟前").tag(15)
            Text("30 分钟前").tag(30)
            Text("1 小时前").tag(60)
            Text("2 小时前").tag(120)
            Text("1 天前").tag(1440)
          }
          .onChange(of: defaultReminderMinutes) { _, newValue in
            calendarManager.defaultReminderMinutes = newValue
          }
        } header: {
          Text("默认提醒")
        }

        // MARK: - Auto Sync
        Section {
          Toggle("自动同步航班", isOn: $autoSyncFlights)
            .onChange(of: autoSyncFlights) { _, newValue in
              calendarManager.autoSyncFlights = newValue
            }

          Toggle("自动同步酒店", isOn: $autoSyncHotels)
            .onChange(of: autoSyncHotels) { _, newValue in
              calendarManager.autoSyncHotels = newValue
            }
        } header: {
          Text("自动同步")
        } footer: {
          Text("启用后，新添加的航班和酒店预订将自动同步到日历。")
        }

        // MARK: - Calendar Selection
        Section {
          if calendarManager.availableCalendars.isEmpty {
            Button("加载日历列表") {
              calendarManager.loadAvailableCalendars()
            }
          } else {
            ForEach(calendarManager.availableCalendars, id: \.calendarIdentifier) { calendar in
              HStack {
                Circle()
                  .fill(Color(cgColor: calendar.cgColor))
                  .frame(width: 16, height: 16)

                VStack(alignment: .leading) {
                  Text(calendar.title)
                    .font(.subheadline)
                  Text(calendar.source.title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                if calendarManager.selectedCalendarId == calendar.calendarIdentifier {
                  Image(systemName: "checkmark")
                    .foregroundStyle(Color.accentColor)
                }
              }
              .contentShape(Rectangle())
              .onTapGesture {
                calendarManager.selectedCalendarId = calendar.calendarIdentifier
              }
            }
          }
        } header: {
          Text("目标日历")
        } footer: {
          Text("选择用于同步事件的日历。留空则使用系统默认日历。")
        }

        // MARK: - Statistics
        Section {
          let stats = calendarManager.syncStatistics

          HStack {
            VStack {
              Text("\(stats.syncedItineraries)")
                .font(.title2)
                .fontWeight(.bold)
              Text("行程")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider()

            VStack {
              Text("\(stats.syncedFlights)")
                .font(.title2)
                .fontWeight(.bold)
              Text("航班")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider()

            VStack {
              Text("\(stats.syncedHotels)")
                .font(.title2)
                .fontWeight(.bold)
              Text("酒店")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider()

            VStack {
              Text("\(stats.totalEvents)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(Color.accentColor)
              Text("总事件")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
          }
          .padding(.vertical, 8)
        } header: {
          Text("同步统计")
        }
      }
      .navigationTitle("日历设置")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
      .onAppear {
        bidirectionalSync = calendarManager.bidirectionalSyncEnabled
        defaultReminderMinutes = calendarManager.defaultReminderMinutes
        autoSyncFlights = calendarManager.autoSyncFlights
        autoSyncHotels = calendarManager.autoSyncHotels
      }
    }
  }
}

// MARK: - Flight Calendar Sync View

struct FlightCalendarSyncView: View {
  let booking: FlightBooking
  @Environment(\.dismiss) private var dismiss

  @State private var enableReminders = true
  @State private var reminderMinutes = 120
  @State private var isSyncing = false
  @State private var syncError: String?
  @State private var showSuccess = false
  @State private var showExportSheet = false
  @State private var exportFileURL: URL?

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isFlightSynced(booking.id) }

  var body: some View {
    NavigationStack {
      Form {
        // Flight Info Section
        Section {
          LabeledContent("航班号") {
            Text(booking.displayFlightNumber)
              .fontWeight(.medium)
          }

          LabeledContent("航线") {
            Text(booking.displayRoute)
          }

          LabeledContent("出发时间") {
            Text(booking.departureDate, style: .date)
            Text(booking.departureDate, style: .time)
          }

          LabeledContent("确认码") {
            Text(booking.confirmationCode)
              .font(.system(.body, design: .monospaced))
          }
        } header: {
          Text("航班信息")
        }

        // Sync Status
        if isSynced {
          Section {
            HStack {
              Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
              Text("已同步到日历")
              Spacer()
              Text(calendarManager.syncedFlights[booking.id]?.syncedAt ?? Date(), style: .relative)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }

        // Options
        if !isSynced {
          Section {
            Toggle("启用提醒", isOn: $enableReminders)

            if enableReminders {
              Picker("提前提醒", selection: $reminderMinutes) {
                Text("1 小时").tag(60)
                Text("2 小时").tag(120)
                Text("3 小时").tag(180)
                Text("1 天").tag(1440)
              }
            }
          } header: {
            Text("提醒设置")
          } footer: {
            Text("航班事件会自动添加出发前一天的提醒")
          }
        }

        // Actions
        Section {
          if isSynced {
            Button {
              Task { await syncFlight() }
            } label: {
              HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                Text("重新同步")
                Spacer()
                if isSyncing { ProgressView() }
              }
            }
            .disabled(isSyncing || !calendarManager.isAuthorized)

            Button(role: .destructive) {
              Task { await unsyncFlight() }
            } label: {
              HStack {
                Image(systemName: "calendar.badge.minus")
                Text("取消同步")
                Spacer()
                if isSyncing { ProgressView() }
              }
            }
            .disabled(isSyncing)
          } else {
            Button {
              Task { await syncFlight() }
            } label: {
              HStack {
                Image(systemName: "calendar.badge.plus")
                Text("同步到日历")
                Spacer()
                if isSyncing { ProgressView() }
              }
            }
            .disabled(isSyncing || !calendarManager.isAuthorized)
          }
        }

        // Export
        Section {
          Button {
            exportToICalFile()
          } label: {
            HStack {
              Image(systemName: "square.and.arrow.up")
              Text("导出 iCal 文件")
              Spacer()
              Image(systemName: "doc.text")
                .foregroundStyle(.secondary)
            }
          }
        }
      }
      .navigationTitle("航班日历同步")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
      .alert("同步成功", isPresented: $showSuccess) {
        Button("好的", role: .cancel) {}
      } message: {
        Text("航班已同步到日历")
      }
      .alert(
        "同步失败",
        isPresented: .init(
          get: { syncError != nil },
          set: { if !$0 { syncError = nil } }
        )
      ) {
        Button("好的", role: .cancel) {}
      } message: {
        Text(syncError ?? "未知错误")
      }
      .sheet(isPresented: $showExportSheet) {
        if let url = exportFileURL {
          ActivityShareSheet(items: [url])
        }
      }
    }
  }

  private func syncFlight() async {
    isSyncing = true
    defer { isSyncing = false }

    if !calendarManager.isAuthorized {
      let granted = await calendarManager.requestAccess()
      if !granted {
        syncError = "需要日历访问权限"
        return
      }
    }

    let result = await calendarManager.syncFlight(
      booking,
      enableReminders: enableReminders,
      reminderMinutes: reminderMinutes
    )

    switch result {
    case .success:
      showSuccess = true
    case .failure(let error):
      syncError = error.localizedDescription
    }
  }

  private func unsyncFlight() async {
    isSyncing = true
    defer { isSyncing = false }

    let result = await calendarManager.unsyncFlight(booking.id)
    if case .failure(let error) = result {
      syncError = error.localizedDescription
    }
  }

  private func exportToICalFile() {
    if let url = calendarManager.exportFlightToFile(booking) {
      exportFileURL = url
      showExportSheet = true
    } else {
      syncError = "导出失败"
    }
  }
}

// MARK: - Hotel Calendar Sync View

struct HotelCalendarSyncView: View {
  let booking: HotelBooking
  @Environment(\.dismiss) private var dismiss

  @State private var enableReminders = true
  @State private var reminderMinutes = 60
  @State private var isSyncing = false
  @State private var syncError: String?
  @State private var showSuccess = false

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isHotelSynced(booking.id) }

  var body: some View {
    NavigationStack {
      Form {
        // Hotel Info Section
        Section {
          LabeledContent("酒店名称") {
            Text(booking.hotelName)
              .fontWeight(.medium)
          }

          if let address = booking.address {
            LabeledContent("地址") {
              Text(address)
                .font(.caption)
            }
          }

          LabeledContent("入住日期") {
            Text(booking.formattedCheckInDate)
          }

          LabeledContent("退房日期") {
            Text(booking.formattedCheckOutDate)
          }

          LabeledContent("入住晚数") {
            Text("\(booking.numberOfNights) 晚")
          }

          if let confirmation = booking.confirmationNumber {
            LabeledContent("确认码") {
              Text(confirmation)
                .font(.system(.body, design: .monospaced))
            }
          }
        } header: {
          Text("酒店信息")
        }

        // Sync Status
        if isSynced {
          Section {
            HStack {
              Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
              Text("已同步到日历")
              Spacer()
              if let syncInfo = calendarManager.syncedHotels[booking.id] {
                Text("\(syncInfo.eventIds.count) 个事件")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
        }

        // Options
        if !isSynced {
          Section {
            Toggle("启用提醒", isOn: $enableReminders)

            if enableReminders {
              Picker("入住提醒", selection: $reminderMinutes) {
                Text("30 分钟前").tag(30)
                Text("1 小时前").tag(60)
                Text("2 小时前").tag(120)
                Text("1 天前").tag(1440)
              }
            }
          } header: {
            Text("提醒设置")
          } footer: {
            Text("将创建入住和退房两个日历事件")
          }
        }

        // Actions
        Section {
          if isSynced {
            Button {
              Task { await syncHotel() }
            } label: {
              HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                Text("重新同步")
                Spacer()
                if isSyncing { ProgressView() }
              }
            }
            .disabled(isSyncing || !calendarManager.isAuthorized)

            Button(role: .destructive) {
              Task { await unsyncHotel() }
            } label: {
              HStack {
                Image(systemName: "calendar.badge.minus")
                Text("取消同步")
                Spacer()
                if isSyncing { ProgressView() }
              }
            }
            .disabled(isSyncing)
          } else {
            Button {
              Task { await syncHotel() }
            } label: {
              HStack {
                Image(systemName: "calendar.badge.plus")
                Text("同步到日历")
                Spacer()
                if isSyncing { ProgressView() }
              }
            }
            .disabled(isSyncing || !calendarManager.isAuthorized)
          }
        }
      }
      .navigationTitle("酒店日历同步")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
      .alert("同步成功", isPresented: $showSuccess) {
        Button("好的", role: .cancel) {}
      } message: {
        Text("酒店入住/退房事件已同步到日历")
      }
      .alert(
        "同步失败",
        isPresented: .init(
          get: { syncError != nil },
          set: { if !$0 { syncError = nil } }
        )
      ) {
        Button("好的", role: .cancel) {}
      } message: {
        Text(syncError ?? "未知错误")
      }
    }
  }

  private func syncHotel() async {
    isSyncing = true
    defer { isSyncing = false }

    if !calendarManager.isAuthorized {
      let granted = await calendarManager.requestAccess()
      if !granted {
        syncError = "需要日历访问权限"
        return
      }
    }

    let result = await calendarManager.syncHotel(
      booking,
      enableReminders: enableReminders,
      reminderMinutes: reminderMinutes
    )

    switch result {
    case .success:
      showSuccess = true
    case .failure(let error):
      syncError = error.localizedDescription
    }
  }

  private func unsyncHotel() async {
    isSyncing = true
    defer { isSyncing = false }

    let result = await calendarManager.unsyncHotel(booking.id)
    if case .failure(let error) = result {
      syncError = error.localizedDescription
    }
  }
}

// MARK: - Calendar Sync Button

/// A button that shows calendar sync status and opens the sync sheet
struct CalendarSyncButton: View {
  let itinerary: SavedItinerary
  @State private var showSyncSheet = false

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isSynced(itinerary.id.uuidString) }

  var body: some View {
    Button {
      showSyncSheet = true
    } label: {
      Label(
        isSynced ? "已同步" : "同步日历",
        systemImage: isSynced ? "calendar.badge.checkmark" : "calendar.badge.plus"
      )
    }
    .sheet(isPresented: $showSyncSheet) {
      CalendarSyncView(itinerary: itinerary)
    }
  }
}

// MARK: - Compact Calendar Sync Button

/// A compact icon-only button for toolbar use
struct CalendarSyncToolbarButton: View {
  let itinerary: SavedItinerary
  @State private var showSyncSheet = false

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isSynced(itinerary.id.uuidString) }

  var body: some View {
    Button {
      showSyncSheet = true
    } label: {
      Image(systemName: isSynced ? "calendar.badge.checkmark" : "calendar")
        .symbolRenderingMode(.hierarchical)
        .foregroundStyle(isSynced ? .green : .primary)
    }
    .sheet(isPresented: $showSyncSheet) {
      CalendarSyncView(itinerary: itinerary)
    }
  }
}

// MARK: - Flight Calendar Sync Button

struct FlightCalendarSyncButton: View {
  let booking: FlightBooking
  @State private var showSyncSheet = false

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isFlightSynced(booking.id) }

  var body: some View {
    Button {
      showSyncSheet = true
    } label: {
      Label(
        isSynced ? "已同步" : "同步日历",
        systemImage: isSynced ? "calendar.badge.checkmark" : "calendar.badge.plus"
      )
    }
    .sheet(isPresented: $showSyncSheet) {
      FlightCalendarSyncView(booking: booking)
    }
  }
}

// MARK: - Hotel Calendar Sync Button

struct HotelCalendarSyncButton: View {
  let booking: HotelBooking
  @State private var showSyncSheet = false

  private var calendarManager: CalendarManager { CalendarManager.shared }
  private var isSynced: Bool { calendarManager.isHotelSynced(booking.id) }

  var body: some View {
    Button {
      showSyncSheet = true
    } label: {
      Label(
        isSynced ? "已同步" : "同步日历",
        systemImage: isSynced ? "calendar.badge.checkmark" : "calendar.badge.plus"
      )
    }
    .sheet(isPresented: $showSyncSheet) {
      HotelCalendarSyncView(booking: booking)
    }
  }
}

// MARK: - Quick Sync Row

/// A row component for quick calendar sync in list views
struct CalendarSyncRow: View {
  let title: String
  let subtitle: String?
  let isSynced: Bool
  let onSync: () async -> Void
  let onUnsync: () async -> Void

  @State private var isLoading = false

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.subheadline)
        if let subtitle = subtitle {
          Text(subtitle)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()

      if isLoading {
        ProgressView()
          .controlSize(.small)
      } else {
        Button {
          Task {
            isLoading = true
            if isSynced {
              await onUnsync()
            } else {
              await onSync()
            }
            isLoading = false
          }
        } label: {
          Image(systemName: isSynced ? "calendar.badge.checkmark" : "calendar.badge.plus")
            .foregroundStyle(isSynced ? .green : .accentColor)
        }
        .buttonStyle(.plain)
      }
    }
  }
}

// MARK: - Preview

#Preview {
  CalendarSyncView(
    itinerary: SavedItinerary(
      title: "东京5日游",
      destination: "东京",
      daysCount: 5
    )
  )
}

#Preview("Settings") {
  CalendarSettingsView()
}
