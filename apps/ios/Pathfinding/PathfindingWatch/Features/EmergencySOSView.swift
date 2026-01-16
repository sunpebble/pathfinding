import SwiftUI
import CoreLocation
import WatchKit

// MARK: - Emergency SOS View

/// Emergency SOS feature for Apple Watch
struct EmergencySOSView: View {
  @State private var sessionManager = WatchSessionManager.shared
  @State private var locationManager = WatchLocationManager()
  @State private var isSOSActive = false
  @State private var sosCountdown = 5
  @State private var showingConfirmation = false
  @State private var sosTimer: Timer?

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: 16) {
          if isSOSActive {
            sosActiveView
          } else {
            sosMainView
          }
        }
        .padding(.horizontal)
      }
      .navigationTitle("紧急求助")
      .onAppear {
        locationManager.startUpdating()
        sessionManager.requestEmergencyContacts()
      }
      .onDisappear {
        locationManager.stopUpdating()
        cancelSOS()
      }
    }
  }

  // MARK: - Main View

  private var sosMainView: some View {
    VStack(spacing: 16) {
      // SOS Button
      sosButton

      // Emergency Numbers
      emergencyNumbersSection

      // Emergency Contacts
      emergencyContactsSection
    }
  }

  // MARK: - SOS Button

  private var sosButton: some View {
    VStack(spacing: 8) {
      Button {
        startSOSCountdown()
      } label: {
        VStack {
          Image(systemName: "sos.circle.fill")
            .font(.system(size: 50))

          Text("紧急求助")
            .font(.headline)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(
          RoundedRectangle(cornerRadius: 16)
            .fill(.red)
        )
      }
      .buttonStyle(.plain)

      Text("长按发送紧急求助信号")
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }

  // MARK: - Emergency Numbers Section

  private var emergencyNumbersSection: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("紧急电话")
        .font(.caption)
        .foregroundStyle(.secondary)

      let services = sessionManager.emergencyServices

      HStack(spacing: 8) {
        EmergencyCallButton(
          title: "报警",
          number: services.police,
          icon: "shield.fill",
          color: .blue
        )

        EmergencyCallButton(
          title: "急救",
          number: services.ambulance,
          icon: "cross.fill",
          color: .red
        )

        EmergencyCallButton(
          title: "火警",
          number: services.fire,
          icon: "flame.fill",
          color: .orange
        )
      }

      Text("当前地区: \(services.countryName)")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
  }

  // MARK: - Emergency Contacts Section

  private var emergencyContactsSection: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("紧急联系人")
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        if !sessionManager.emergencyContacts.isEmpty {
          Text("\(sessionManager.emergencyContacts.count)人")
            .font(.caption2)
            .foregroundStyle(.tertiary)
        }
      }

      if sessionManager.emergencyContacts.isEmpty {
        emptyContactsView
      } else {
        ForEach(sessionManager.emergencyContacts.prefix(3)) { contact in
          EmergencyContactRow(contact: contact)
        }
      }
    }
  }

  private var emptyContactsView: some View {
    VStack(spacing: 4) {
      Image(systemName: "person.crop.circle.badge.exclamationmark")
        .font(.title3)
        .foregroundStyle(.secondary)

      Text("暂无紧急联系人")
        .font(.caption)
        .foregroundStyle(.secondary)

      Text("请在手机上添加")
        .font(.caption2)
        .foregroundStyle(.tertiary)
    }
    .frame(maxWidth: .infinity)
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 8)
        .fill(.ultraThinMaterial)
    )
  }

  // MARK: - SOS Active View

  private var sosActiveView: some View {
    VStack(spacing: 16) {
      // Countdown
      ZStack {
        Circle()
          .stroke(.red.opacity(0.3), lineWidth: 8)
          .frame(width: 100, height: 100)

        Circle()
          .trim(from: 0, to: CGFloat(sosCountdown) / 5.0)
          .stroke(.red, style: StrokeStyle(lineWidth: 8, lineCap: .round))
          .frame(width: 100, height: 100)
          .rotationEffect(.degrees(-90))
          .animation(.linear(duration: 1), value: sosCountdown)

        Text("\(sosCountdown)")
          .font(.largeTitle)
          .fontWeight(.bold)
          .foregroundStyle(.red)
      }

      Text("正在发送求助信号...")
        .font(.headline)

      if let location = locationManager.currentLocation {
        Text("位置: \(String(format: "%.4f, %.4f", location.coordinate.latitude, location.coordinate.longitude))")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }

      Button("取消") {
        cancelSOS()
      }
      .buttonStyle(.bordered)
      .tint(.red)
    }
  }

  // MARK: - Actions

  private func startSOSCountdown() {
    isSOSActive = true
    sosCountdown = 5

    // Haptic feedback
    WKInterfaceDevice.current().play(.notification)

    sosTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
      if sosCountdown > 1 {
        sosCountdown -= 1
        WKInterfaceDevice.current().play(.click)
      } else {
        timer.invalidate()
        triggerSOS()
      }
    }
  }

  private func cancelSOS() {
    sosTimer?.invalidate()
    sosTimer = nil
    isSOSActive = false
    sosCountdown = 5
  }

  private func triggerSOS() {
    var location: (latitude: Double, longitude: Double)?

    if let currentLocation = locationManager.currentLocation {
      location = (currentLocation.coordinate.latitude, currentLocation.coordinate.longitude)
    }

    // Send SOS to iPhone
    sessionManager.triggerSOS(location: location)

    // Strong haptic feedback
    WKInterfaceDevice.current().play(.notification)

    // Show confirmation
    showingConfirmation = true

    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
      isSOSActive = false
      showingConfirmation = false
    }
  }
}

// MARK: - Emergency Call Button

struct EmergencyCallButton: View {
  let title: String
  let number: String
  let icon: String
  let color: Color

  var body: some View {
    Button {
      makeCall()
    } label: {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.title3)

        Text(title)
          .font(.caption2)

        Text(number)
          .font(.caption)
          .fontWeight(.bold)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 8)
    }
    .buttonStyle(.bordered)
    .tint(color)
  }

  private func makeCall() {
    guard let url = URL(string: "tel://\(number)") else { return }

    // Note: On watchOS, this will prompt to call from iPhone
    WKExtension.shared().openSystemURL(url)
  }
}

// MARK: - Emergency Contact Row

struct EmergencyContactRow: View {
  let contact: WatchEmergencyContact

  var body: some View {
    Button {
      callContact()
    } label: {
      HStack(spacing: 8) {
        // Avatar placeholder
        Circle()
          .fill(contact.isPrimary ? .red : .gray.opacity(0.3))
          .frame(width: 32, height: 32)
          .overlay {
            Text(String(contact.name.prefix(1)))
              .font(.caption)
              .fontWeight(.bold)
              .foregroundStyle(contact.isPrimary ? .white : .primary)
          }

        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: 4) {
            Text(contact.name)
              .font(.caption)
              .fontWeight(.medium)

            if contact.isPrimary {
              Image(systemName: "star.fill")
                .font(.caption2)
                .foregroundStyle(.yellow)
            }
          }

          if let relationship = contact.relationship {
            Text(relationship)
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        Image(systemName: "phone.fill")
          .font(.caption)
          .foregroundStyle(.green)
      }
      .padding(8)
      .background(
        RoundedRectangle(cornerRadius: 8)
          .fill(.ultraThinMaterial)
      )
    }
    .buttonStyle(.plain)
  }

  private func callContact() {
    guard let url = URL(string: "tel://\(contact.phone)") else { return }
    WKExtension.shared().openSystemURL(url)
  }
}

// MARK: - Preview

#Preview {
  EmergencySOSView()
}
