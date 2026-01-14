import SwiftUI

// MARK: - Add Flight View

/// View for adding a new flight booking
struct AddFlightView: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(\.colorScheme) private var colorScheme
  @State private var flightStore = FlightStore.shared

  // Form fields
  @State private var flightNumber = ""
  @State private var departureDate = Date()
  @State private var confirmationCode = ""
  @State private var passengerName = ""
  @State private var passengerEmail = ""
  @State private var passengerPhone = ""
  @State private var seatNumber = ""
  @State private var cabinClass: CabinClass = .economy
  @State private var ticketNumber = ""
  @State private var mealPreference = ""
  @State private var specialRequests = ""
  @State private var baggageAllowance = ""
  @State private var frequentFlyerNumber = ""
  @State private var notes = ""

  // State
  @State private var isLookingUp = false
  @State private var lookupResult: FlightInfo?
  @State private var lookupError: String?
  @State private var isSaving = false
  @State private var showAdvancedOptions = false

  private var isFormValid: Bool {
    !flightNumber.isEmpty && !confirmationCode.isEmpty && !passengerName.isEmpty
  }

  private var dateFormatter: DateFormatter {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }

  var body: some View {
    NavigationStack {
      Form {
        // Flight lookup section
        flightLookupSection

        // Flight info preview (if looked up)
        if let flight = lookupResult {
          flightPreviewSection(flight)
        }

        // Booking info section
        bookingInfoSection

        // Passenger info section
        passengerInfoSection

        // Advanced options section
        advancedOptionsSection
      }
      .navigationTitle("添加航班")
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
              await saveBooking()
            }
          }
          .disabled(!isFormValid || isSaving)
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

  // MARK: - Sections

  private var flightLookupSection: some View {
    Section {
      // Flight number
      HStack {
        TextField("航班号", text: $flightNumber)
          .textInputAutocapitalization(.characters)
          .autocorrectionDisabled()
          .onChange(of: flightNumber) { _, newValue in
            // Clear lookup result when flight number changes
            lookupResult = nil
            lookupError = nil
          }

        if isLookingUp {
          ProgressView()
        } else if !flightNumber.isEmpty {
          Button {
            Task {
              await lookupFlight()
            }
          } label: {
            Image(systemName: "magnifyingglass")
          }
        }
      }

      // Departure date
      DatePicker("出发日期", selection: $departureDate, displayedComponents: .date)
        .onChange(of: departureDate) { _, _ in
          // Clear lookup result when date changes
          lookupResult = nil
          lookupError = nil
        }

      // Lookup button
      if !flightNumber.isEmpty && lookupResult == nil {
        Button {
          Task {
            await lookupFlight()
          }
        } label: {
          HStack {
            Image(systemName: "airplane.circle")
            Text("查询航班信息")
          }
        }
        .disabled(isLookingUp || flightNumber.isEmpty)
      }

      // Lookup error
      if let error = lookupError {
        HStack {
          Image(systemName: "exclamationmark.triangle")
            .foregroundStyle(.orange)
          Text(error)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
    } header: {
      Text("航班信息")
    } footer: {
      Text("输入航班号和日期后可自动查询航班详情")
    }
  }

  private func flightPreviewSection(_ flight: FlightInfo) -> some View {
    Section {
      // Route
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(flight.departureAirport)
            .font(.title2)
            .fontWeight(.bold)
          Text(flight.departureCity ?? flight.departureAirportName ?? "")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        VStack(spacing: 4) {
          Image(systemName: "airplane")
            .foregroundStyle(DesignTokens.Colors.accent)
          if let duration = flight.duration {
            Text(flight.durationFormatted)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 4) {
          Text(flight.arrivalAirport)
            .font(.title2)
            .fontWeight(.bold)
          Text(flight.arrivalCity ?? flight.arrivalAirportName ?? "")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .padding(.vertical, 8)

      // Times
      HStack {
        VStack(alignment: .leading) {
          Text("起飞")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(flight.scheduledDepartureDate, style: .time)
            .font(.headline)
        }

        Spacer()

        VStack(alignment: .trailing) {
          Text("到达")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(flight.scheduledArrivalDate, style: .time)
            .font(.headline)
        }
      }

      // Airline
      LabeledContent("航空公司", value: flight.airline)

      // Terminal
      if let terminal = flight.departureTerminal {
        LabeledContent("航站楼", value: "T\(terminal)")
      }

      // Aircraft
      if let aircraft = flight.aircraftType {
        LabeledContent("机型", value: aircraft)
      }

      // Status badge
      HStack {
        Text("航班状态")
        Spacer()
        StatusBadge(text: flight.status.displayName, color: statusColor(for: flight.status))
      }
    } header: {
      HStack {
        Text("航班详情")
        Spacer()
        Image(systemName: "checkmark.circle.fill")
          .foregroundStyle(.green)
      }
    }
  }

  private var bookingInfoSection: some View {
    Section {
      TextField("确认码 / PNR", text: $confirmationCode)
        .textInputAutocapitalization(.characters)
        .autocorrectionDisabled()

      TextField("票号 (可选)", text: $ticketNumber)
        .keyboardType(.numberPad)

      Picker("舱位", selection: $cabinClass) {
        ForEach(CabinClass.allCases, id: \.self) { cabin in
          Label(cabin.displayName, systemImage: cabin.icon)
            .tag(cabin)
        }
      }

      TextField("座位号 (可选)", text: $seatNumber)
        .textInputAutocapitalization(.characters)
    } header: {
      Text("预订信息")
    }
  }

  private var passengerInfoSection: some View {
    Section {
      TextField("乘客姓名", text: $passengerName)

      TextField("邮箱 (可选)", text: $passengerEmail)
        .keyboardType(.emailAddress)
        .textInputAutocapitalization(.never)

      TextField("手机号 (可选)", text: $passengerPhone)
        .keyboardType(.phonePad)
    } header: {
      Text("乘客信息")
    }
  }

  private var advancedOptionsSection: some View {
    Section {
      DisclosureGroup("更多选项", isExpanded: $showAdvancedOptions) {
        TextField("常旅客号 (可选)", text: $frequentFlyerNumber)

        TextField("行李额度 (可选)", text: $baggageAllowance)

        TextField("餐食偏好 (可选)", text: $mealPreference)

        TextField("特殊需求 (可选)", text: $specialRequests, axis: .vertical)
          .lineLimit(2...4)

        TextField("备注 (可选)", text: $notes, axis: .vertical)
          .lineLimit(2...4)
      }
    }
  }

  // MARK: - Actions

  private func lookupFlight() async {
    guard !flightNumber.isEmpty else { return }

    isLookingUp = true
    lookupError = nil

    let dateString = dateFormatter.string(from: departureDate)
    if let flight = await flightStore.lookupFlight(flightNumber: flightNumber, date: dateString) {
      lookupResult = flight
    } else {
      lookupError = "未找到航班信息，请检查航班号和日期"
    }

    isLookingUp = false
  }

  private func saveBooking() async {
    isSaving = true

    let input = CreateFlightBookingInput(
      flightNumber: flightNumber.uppercased(),
      departureDate: dateFormatter.string(from: departureDate),
      confirmationCode: confirmationCode.uppercased(),
      passengerName: passengerName,
      passengerEmail: passengerEmail.isEmpty ? nil : passengerEmail,
      passengerPhone: passengerPhone.isEmpty ? nil : passengerPhone,
      seatNumber: seatNumber.isEmpty ? nil : seatNumber.uppercased(),
      cabinClass: cabinClass,
      ticketNumber: ticketNumber.isEmpty ? nil : ticketNumber,
      mealPreference: mealPreference.isEmpty ? nil : mealPreference,
      specialRequests: specialRequests.isEmpty ? nil : specialRequests,
      baggageAllowance: baggageAllowance.isEmpty ? nil : baggageAllowance,
      frequentFlyerNumber: frequentFlyerNumber.isEmpty ? nil : frequentFlyerNumber,
      notes: notes.isEmpty ? nil : notes
    )

    if await flightStore.createBooking(input) != nil {
      dismiss()
    }

    isSaving = false
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
}

// MARK: - Preview

#Preview("Add Flight") {
  AddFlightView()
}
