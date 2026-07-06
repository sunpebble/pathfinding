import SwiftUI
import WatchKit

// MARK: - Watch App Entry Point

@main
struct PathfindingWatchApp: App {
  @State private var sessionManager = WatchSessionManager.shared

  init() {
    // Start WatchConnectivity session
    WatchSessionManager.shared.startSession()
  }

  var body: some Scene {
    WindowGroup {
      WatchContentView()
        .environment(sessionManager)
    }
  }
}

// MARK: - Watch Content View

struct WatchContentView: View {
  @State private var sessionManager = WatchSessionManager.shared
  @State private var selectedTab = 0

  var body: some View {
    TabView(selection: $selectedTab) {
      // Tab 1: Today's Itinerary (Main)
      TodayItineraryView()
        .tag(0)

      // Tab 2: Quick Note
      QuickNoteView()
        .tag(1)

      // Tab 3: Flight Alerts
      FlightAlertView()
        .tag(2)

      // Tab 4: Emergency SOS
      EmergencySOSView()
        .tag(3)
    }
    .tabViewStyle(.verticalPage)
    .onAppear {
      refreshData()
    }
  }

  private func refreshData() {
    sessionManager.requestTodayItinerary()
    sessionManager.requestFlights()
    sessionManager.requestEmergencyContacts()
  }
}

// MARK: - Watch Home View (Alternative List Style)

struct WatchHomeView: View {
  @State private var sessionManager = WatchSessionManager.shared

  var body: some View {
    NavigationStack {
      List {
        // Today's Itinerary Section
        Section {
          if let itinerary = sessionManager.todayItinerary {
            NavigationLink(destination: TodayItineraryView()) {
              HStack {
                Image(systemName: "calendar")
                  .foregroundStyle(.blue)

                VStack(alignment: .leading, spacing: 2) {
                  Text(itinerary.title)
                    .font(.caption)
                    .lineLimit(1)

                  Text("\(itinerary.completedPOIs)/\(itinerary.totalPOIs) 已完成")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }
              }
            }

            // Next POI shortcut
            if let nextPOI = nextUnvisitedPOI(in: itinerary) {
              NavigationLink(destination: POINavigationView(poi: nextPOI)) {
                HStack {
                  Image(systemName: "location.fill")
                    .foregroundStyle(.green)

                  VStack(alignment: .leading, spacing: 2) {
                    Text("下一站")
                      .font(.caption2)
                      .foregroundStyle(.secondary)

                    Text(nextPOI.name)
                      .font(.caption)
                      .lineLimit(1)
                  }
                }
              }
            }
          } else {
            NavigationLink(destination: TodayItineraryView()) {
              Label("今日行程", systemImage: "calendar")
            }
          }
        } header: {
          Text("行程")
        }

        // Quick Actions Section
        Section {
          NavigationLink(destination: QuickNoteView()) {
            Label("快速记录", systemImage: "note.text")
          }

          NavigationLink(destination: FlightAlertView()) {
            HStack {
              Label("航班提醒", systemImage: "airplane")

              Spacer()

              if !sessionManager.upcomingFlights.isEmpty {
                Text("\(sessionManager.upcomingFlights.count)")
                  .font(.caption2)
                  .padding(.horizontal, 6)
                  .padding(.vertical, 2)
                  .background(Capsule().fill(.blue))
                  .foregroundStyle(.white)
              }
            }
          }
        } header: {
          Text("工具")
        }

        // Emergency Section
        Section {
          NavigationLink(destination: EmergencySOSView()) {
            Label("紧急求助", systemImage: "sos.circle.fill")
              .foregroundStyle(.red)
          }
        } header: {
          Text("安全")
        }
      }
      .navigationTitle("Sunpebble Trips")
      .onAppear {
        sessionManager.requestTodayItinerary()
        sessionManager.requestFlights()
      }
    }
  }

  private func nextUnvisitedPOI(in itinerary: WatchItinerary) -> WatchPOI? {
    itinerary.pois.first { !$0.isVisited }
  }
}

// MARK: - Complication Views

struct ComplicationView: View {
  let itinerary: WatchItinerary?

  var body: some View {
    if let itinerary = itinerary {
      VStack {
        Text("\(itinerary.completedPOIs)/\(itinerary.totalPOIs)")
          .font(.caption)
          .fontWeight(.bold)

        ProgressView(value: itinerary.progress)
          .tint(.blue)
      }
    } else {
      Image(systemName: "map")
        .font(.title3)
    }
  }
}

// MARK: - Preview

#Preview {
  WatchContentView()
}

#Preview("Home List") {
  WatchHomeView()
}
