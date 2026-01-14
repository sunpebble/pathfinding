import SwiftUI

// MARK: - Flight Detail View

/// Detailed view for a single flight booking
struct FlightDetailView: View {
  let booking: FlightBooking
  @Environment(\.dismiss) private var dismiss
  @Environment(\.colorScheme) private var colorScheme
  @State private var flightStore = FlightStore.shared
  @State private var currentBooking: FlightBooking
  @State private var flightStatus: FlightStatusData?
  @State private var isRefreshingStatus = false
  @State private var showCheckIn = false
  @State private var showEditSheet = false
  @State private var showDeleteConfirmation = false
  @State private var showLinkItinerary = false

  init(booking: FlightBooking) {
    self.booking = booking
    self._currentBooking = State(initialValue: booking)
  }

  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        // Hero section with flight route
        flightHeroSection

        // Status section
        flightStatusSection

        // Booking info section
        bookingInfoSection

        // Passenger info section
        passengerInfoSection

        // Actions section
        actionsSection
      }
      .padding(DesignTokens.Spacing.md)
    }
    .background(DesignTokens.Colors.backgroundGrouped)
    .navigationTitle("航班详情")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .primaryAction) {
        Menu {
          Button {
            showEditSheet = true
          } label: {
            Label("编辑", systemImage: "pencil")
          }

          if currentBooking.canCheckIn {
            Button {
              showCheckIn = true
            } label: {
              Label("在线值机", systemImage: "checkmark.circle")
            }
          }

          Button {
            showLinkItinerary = true
          } label: {
            Label("关联行程", systemImage: "link")
          }

          Divider()

          Button(role: .destructive) {
            showDeleteConfirmation = true
          } label: {
            Label("删除", systemImage: "trash")
          }
        } label: {
          Image(systemName: "ellipsis.circle")
        }
      }
    }
    .refreshable {
      await refreshFlightStatus()
    }
    .sheet(isPresented: $showEditSheet) {
      EditFlightView(booking: currentBooking) { updated in
        currentBooking = updated
      }
    }
    .sheet(isPresented: $showCheckIn) {
      CheckInFlightSheet(booking: currentBooking) { updated in
        currentBooking = updated
      }
    }
    .sheet(isPresented: $showLinkItinerary) {
      LinkItinerarySheet(booking: currentBooking) { updated in
        currentBooking = updated
      }
    }
    .alert("确认删除", isPresented: $showDeleteConfirmation) {
      Button("取消", role: .cancel) {}
      Button("删除", role: .destructive) {
        Task {
          if await flightStore.deleteBooking(currentBooking.id) {
            dismiss()
          }
        }
      }
    } message: {
      Text("确定要删除这个航班记录吗？此操作无法撤销。")
    }
    .task {
      await refreshFlightStatus()
    }
  }

  // MARK: - Hero Section

  private var flightHeroSection: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Flight number header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(currentBooking.displayFlightNumber)
            .font(.title)
            .fontWeight(.bold)

          if let flight = currentBooking.flight {
            Text(flight.airline)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Status indicator
        if isRefreshingStatus {
          ProgressView()
        } else if let status = flightStatus ?? currentBooking.flight?.status {
          VStack(alignment: .trailing, spacing: 4) {
            StatusBadge(
              text: status.displayName,
              color: statusColor(for: status),
              icon: status.icon
            )

            if let gate = flightStatus?.gate ?? currentBooking.flight?.departureGate {
              Text("登机口: \(gate)")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
      }

      Divider()

      // Route visualization
      if let flight = currentBooking.flight {
        HStack(alignment: .center, spacing: DesignTokens.Spacing.md) {
          // Departure
          VStack(alignment: .leading, spacing: 8) {
            Text(flight.departureAirport)
              .font(.system(size: 36, weight: .bold, design: .rounded))
            Text(flight.departureCity ?? flight.departureAirportName ?? "")
              .font(.subheadline)
              .foregroundStyle(.secondary)
            Text(flight.scheduledDepartureDate, style: .time)
              .font(.headline)
            if let terminal = flight.departureTerminal {
              Label("T\(terminal)", systemImage: "building.2")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)

          // Flight path
          VStack(spacing: 8) {
            Image(systemName: "airplane")
              .font(.title2)
              .foregroundStyle(DesignTokens.Colors.accent)
              .rotationEffect(.degrees(90))

            Text(flight.durationFormatted)
              .font(.caption)
              .foregroundStyle(.secondary)

            if flight.isDelayed, let delay = flight.delayMinutes {
              Text("+\(delay)min")
                .font(.caption2)
                .foregroundStyle(.orange)
            }
          }

          // Arrival
          VStack(alignment: .trailing, spacing: 8) {
            Text(flight.arrivalAirport)
              .font(.system(size: 36, weight: .bold, design: .rounded))
            Text(flight.arrivalCity ?? flight.arrivalAirportName ?? "")
              .font(.subheadline)
              .foregroundStyle(.secondary)
            Text(flight.scheduledArrivalDate, style: .time)
              .font(.headline)
            if let terminal = flight.arrivalTerminal {
              Label("T\(terminal)", systemImage: "building.2")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
          .frame(maxWidth: .infinity, alignment: .trailing)
        }
      } else {
        // Fallback when no flight info
        Text(currentBooking.displayRoute)
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      // Date
      HStack {
        Image(systemName: "calendar")
          .foregroundStyle(DesignTokens.Colors.accent)
        Text(currentBooking.departureDate, style: .date)
          .font(.subheadline)

        Spacer()

        if let flight = currentBooking.flight, let distance = flight.distance {
          Label("\(distance) km", systemImage: "arrow.left.and.right")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding(DesignTokens.Spacing.lg)
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
  }

  // MARK: - Status Section

  private var flightStatusSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "航班状态", icon: "airplane.circle")

      VStack(spacing: DesignTokens.Spacing.sm) {
        // Booking status
        InfoRow(
          label: "预订状态",
          value: currentBooking.status.displayName,
          valueColor: bookingStatusColor(for: currentBooking.status)
        )

        // Check-in status
        if let checkInTime = currentBooking.checkInDate {
          InfoRow(
            label: "值机时间",
            value: checkInTime.formatted(date: .abbreviated, time: .shortened)
          )
        }

        // Flight status details
        if let flight = currentBooking.flight {
          if flight.isDelayed {
            InfoRow(
              label: "延误信息",
              value: flight.delayReason ?? "原因未知",
              valueColor: .orange
            )
          }

          if let estimated = flight.estimatedDepartureDate {
            InfoRow(
              label: "预计起飞",
              value: estimated.formatted(date: .omitted, time: .shortened),
              valueColor: flight.isDelayed ? .orange : nil
            )
          }

          if let aircraft = flight.aircraftType {
            InfoRow(label: "机型", value: aircraft)
          }
        }
      }
      .padding(DesignTokens.Spacing.md)
      .background(DesignTokens.Colors.cardBackground)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
  }

  // MARK: - Booking Info Section

  private var bookingInfoSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "预订信息", icon: "ticket")

      VStack(spacing: DesignTokens.Spacing.sm) {
        InfoRow(label: "确认码", value: currentBooking.confirmationCode, isCopyable: true)

        if let ticketNumber = currentBooking.ticketNumber {
          InfoRow(label: "票号", value: ticketNumber, isCopyable: true)
        }

        InfoRow(label: "舱位", value: currentBooking.cabinClass.displayName)

        if let seat = currentBooking.seatNumber {
          InfoRow(label: "座位", value: seat)
        }

        if let baggage = currentBooking.baggageAllowance {
          InfoRow(label: "行李额度", value: baggage)
        }

        if let ffn = currentBooking.frequentFlyerNumber {
          InfoRow(label: "常旅客号", value: ffn)
        }

        if let itineraryId = currentBooking.itineraryId {
          InfoRow(label: "关联行程", value: "已关联")
        }
      }
      .padding(DesignTokens.Spacing.md)
      .background(DesignTokens.Colors.cardBackground)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
  }

  // MARK: - Passenger Info Section

  private var passengerInfoSection: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      SectionHeader(title: "乘客信息", icon: "person")

      VStack(spacing: DesignTokens.Spacing.sm) {
        InfoRow(label: "姓名", value: currentBooking.passengerName)

        if let email = currentBooking.passengerEmail {
          InfoRow(label: "邮箱", value: email)
        }

        if let phone = currentBooking.passengerPhone {
          InfoRow(label: "手机", value: phone)
        }

        if let meal = currentBooking.mealPreference {
          InfoRow(label: "餐食偏好", value: meal)
        }

        if let requests = currentBooking.specialRequests {
          InfoRow(label: "特殊需求", value: requests)
        }

        if let notes = currentBooking.notes {
          InfoRow(label: "备注", value: notes)
        }
      }
      .padding(DesignTokens.Spacing.md)
      .background(DesignTokens.Colors.cardBackground)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
  }

  // MARK: - Actions Section

  private var actionsSection: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      // Check-in button
      if currentBooking.canCheckIn {
        Button {
          showCheckIn = true
        } label: {
          Label("在线值机", systemImage: "checkmark.circle")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.primary)
      }

      // Refresh status button
      Button {
        Task {
          await refreshFlightStatus()
        }
      } label: {
        Label("刷新航班状态", systemImage: "arrow.clockwise")
          .frame(maxWidth: .infinity)
      }
      .buttonStyle(.secondary)
      .disabled(isRefreshingStatus)
    }
    .padding(.top, DesignTokens.Spacing.md)
  }

  // MARK: - Actions

  private func refreshFlightStatus() async {
    isRefreshingStatus = true
    flightStatus = await flightStore.getFlightStatus(currentBooking.id)
    isRefreshingStatus = false
  }

  // MARK: - Helpers

  private func statusColor(for status: FlightStatus) -> Color {
    switch status {
    case .scheduled: return .blue
    case .delayed, .diverted: return .orange
    case .boarding: return .purple
    case .departed, .inAir: return .green
    case .landed, .arrived: return .gray
    case .cancelled: return .red
    }
  }

  private func bookingStatusColor(for status: BookingStatus) -> Color {
    switch status {
    case .confirmed, .checkedIn, .boarded: return .green
    case .pending: return .orange
    case .cancelled: return .red
    case .completed: return .gray
    }
  }
}

// MARK: - Info Row

private struct InfoRow: View {
  let label: String
  let value: String
  var valueColor: Color? = nil
  var isCopyable: Bool = false

  var body: some View {
    HStack {
      Text(label)
        .foregroundStyle(.secondary)

      Spacer()

      if isCopyable {
        Button {
          UIPasteboard.general.string = value
        } label: {
          HStack(spacing: 4) {
            Text(value)
              .foregroundStyle(valueColor ?? DesignTokens.Colors.textPrimary)
            Image(systemName: "doc.on.doc")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
        .buttonStyle(.plain)
      } else {
        Text(value)
          .foregroundStyle(valueColor ?? DesignTokens.Colors.textPrimary)
      }
    }
    .font(.subheadline)
  }
}

// MARK: - Edit Flight View

struct EditFlightView: View {
  let booking: FlightBooking
  let onUpdate: (FlightBooking) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var flightStore = FlightStore.shared

  // Editable fields
  @State private var seatNumber: String
  @State private var cabinClass: CabinClass
  @State private var mealPreference: String
  @State private var specialRequests: String
  @State private var frequentFlyerNumber: String
  @State private var notes: String

  @State private var isSaving = false

  init(booking: FlightBooking, onUpdate: @escaping (FlightBooking) -> Void) {
    self.booking = booking
    self.onUpdate = onUpdate
    self._seatNumber = State(initialValue: booking.seatNumber ?? "")
    self._cabinClass = State(initialValue: booking.cabinClass)
    self._mealPreference = State(initialValue: booking.mealPreference ?? "")
    self._specialRequests = State(initialValue: booking.specialRequests ?? "")
    self._frequentFlyerNumber = State(initialValue: booking.frequentFlyerNumber ?? "")
    self._notes = State(initialValue: booking.notes ?? "")
  }

  var body: some View {
    NavigationStack {
      Form {
        Section("座位信息") {
          TextField("座位号", text: $seatNumber)
            .textInputAutocapitalization(.characters)

          Picker("舱位", selection: $cabinClass) {
            ForEach(CabinClass.allCases, id: \.self) { cabin in
              Label(cabin.displayName, systemImage: cabin.icon)
                .tag(cabin)
            }
          }
        }

        Section("偏好设置") {
          TextField("常旅客号", text: $frequentFlyerNumber)

          TextField("餐食偏好", text: $mealPreference)

          TextField("特殊需求", text: $specialRequests, axis: .vertical)
            .lineLimit(2...4)
        }

        Section("备注") {
          TextField("备注", text: $notes, axis: .vertical)
            .lineLimit(3...6)
        }
      }
      .navigationTitle("编辑航班")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
        ToolbarItem(placement: .confirmationAction) {
          Button("保存") {
            Task {
              await save()
            }
          }
          .disabled(isSaving)
        }
      }
      .overlay {
        if isSaving {
          ProgressView("保存中...")
            .padding()
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
      }
    }
  }

  private func save() async {
    isSaving = true

    let input = UpdateFlightBookingInput(
      seatNumber: seatNumber.isEmpty ? nil : seatNumber.uppercased(),
      cabinClass: cabinClass,
      mealPreference: mealPreference.isEmpty ? nil : mealPreference,
      specialRequests: specialRequests.isEmpty ? nil : specialRequests,
      frequentFlyerNumber: frequentFlyerNumber.isEmpty ? nil : frequentFlyerNumber,
      notes: notes.isEmpty ? nil : notes
    )

    if await flightStore.updateBooking(booking.id, input: input),
       let updated = flightStore.getBooking(booking.id) {
      onUpdate(updated)
      dismiss()
    }

    isSaving = false
  }
}

// MARK: - Check-In Sheet

struct CheckInFlightSheet: View {
  let booking: FlightBooking
  let onUpdate: (FlightBooking) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var flightStore = FlightStore.shared

  @State private var seatNumber: String
  @State private var isProcessing = false

  init(booking: FlightBooking, onUpdate: @escaping (FlightBooking) -> Void) {
    self.booking = booking
    self.onUpdate = onUpdate
    self._seatNumber = State(initialValue: booking.seatNumber ?? "")
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: DesignTokens.Spacing.xl) {
        // Header
        VStack(spacing: DesignTokens.Spacing.md) {
          Image(systemName: "checkmark.circle")
            .font(.system(size: 60))
            .foregroundStyle(DesignTokens.Colors.accent)

          Text("在线值机")
            .font(.title2)
            .fontWeight(.bold)

          Text(booking.displayFlightNumber)
            .font(.headline)
            .foregroundStyle(.secondary)
        }
        .padding(.top, DesignTokens.Spacing.xl)

        // Seat selection
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("选择座位 (可选)")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          TextField("座位号 (如 12A)", text: $seatNumber)
            .textFieldStyle(.roundedBorder)
            .textInputAutocapitalization(.characters)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)

        Spacer()

        // Check-in button
        Button {
          Task {
            await performCheckIn()
          }
        } label: {
          if isProcessing {
            ProgressView()
              .tint(.white)
          } else {
            Text("确认值机")
          }
        }
        .buttonStyle(.primary)
        .disabled(isProcessing)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.xl)
      }
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }
      }
    }
  }

  private func performCheckIn() async {
    isProcessing = true

    if await flightStore.checkIn(
      bookingId: booking.id,
      seatNumber: seatNumber.isEmpty ? nil : seatNumber.uppercased()
    ),
       let updated = flightStore.getBooking(booking.id) {
      onUpdate(updated)
      dismiss()
    }

    isProcessing = false
  }
}

// MARK: - Link Itinerary Sheet

struct LinkItinerarySheet: View {
  let booking: FlightBooking
  let onUpdate: (FlightBooking) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var flightStore = FlightStore.shared
  @State private var itineraryStore = ItineraryStore.shared

  @State private var isLinking = false

  var body: some View {
    NavigationStack {
      Group {
        if itineraryStore.itineraries.isEmpty {
          ContentUnavailableView {
            Label("暂无行程", systemImage: "map")
          } description: {
            Text("创建行程后可将航班关联到行程")
          }
        } else {
          List(itineraryStore.itineraries, id: \.id) { itinerary in
            Button {
              Task {
                await linkToItinerary(itinerary.id.uuidString)
              }
            } label: {
              HStack {
                VStack(alignment: .leading, spacing: 4) {
                  Text(itinerary.title)
                    .font(.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)

                  HStack(spacing: 8) {
                    if let destination = itinerary.destination {
                      Text(destination)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    Text(itinerary.savedAt, style: .date)
                      .font(.caption)
                      .foregroundStyle(.tertiary)
                  }
                }

                Spacer()

                if booking.itineraryId == itinerary.id.uuidString {
                  Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Colors.accent)
                }
              }
            }
            .disabled(isLinking)
          }
        }
      }
      .navigationTitle("关联行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("取消") {
            dismiss()
          }
        }

        if booking.itineraryId != nil {
          ToolbarItem(placement: .destructiveAction) {
            Button("取消关联") {
              Task {
                await unlinkFromItinerary()
              }
            }
            .foregroundStyle(.red)
            .disabled(isLinking)
          }
        }
      }
      .overlay {
        if isLinking {
          ProgressView()
            .padding()
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
      }
    }
  }

  private func linkToItinerary(_ itineraryId: String) async {
    isLinking = true

    if await flightStore.linkToItinerary(bookingId: booking.id, itineraryId: itineraryId),
       let updated = flightStore.getBooking(booking.id) {
      onUpdate(updated)
      dismiss()
    }

    isLinking = false
  }

  private func unlinkFromItinerary() async {
    isLinking = true

    if await flightStore.unlinkFromItinerary(bookingId: booking.id),
       let updated = flightStore.getBooking(booking.id) {
      onUpdate(updated)
      dismiss()
    }

    isLinking = false
  }
}

// MARK: - Previews

#Preview("Flight Detail") {
  NavigationStack {
    FlightDetailView(
      booking: FlightBooking(
        id: "1",
        userId: "user1",
        flightId: "flight1",
        confirmationCode: "ABC123",
        passengerName: "Zhang San",
        passengerEmail: "zhang@example.com",
        passengerPhone: nil,
        seatNumber: "12A",
        cabinClass: .economy,
        status: .confirmed,
        departureTime: Int64(Date().addingTimeInterval(86400).timeIntervalSince1970 * 1000),
        arrivalTime: Int64(Date().addingTimeInterval(86400 + 7200).timeIntervalSince1970 * 1000),
        ticketNumber: nil,
        mealPreference: nil,
        specialRequests: nil,
        baggageAllowance: "23kg",
        frequentFlyerNumber: nil,
        itineraryId: nil,
        notes: nil,
        importedFrom: nil,
        checkInTime: nil,
        createdAt: Int64(Date().timeIntervalSince1970 * 1000),
        updatedAt: Int64(Date().timeIntervalSince1970 * 1000)
      )
    )
  }
}
