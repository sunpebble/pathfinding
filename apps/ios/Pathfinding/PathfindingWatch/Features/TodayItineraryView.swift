import SwiftUI

// MARK: - Today's Itinerary View

/// Main view showing today's travel itinerary on Apple Watch
struct TodayItineraryView: View {
  @State private var sessionManager = WatchSessionManager.shared
  @State private var isRefreshing = false

  var body: some View {
    NavigationStack {
      Group {
        if let itinerary = sessionManager.todayItinerary {
          itineraryContent(itinerary)
        } else {
          emptyStateView
        }
      }
      .navigationTitle("今日行程")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            refreshData()
          } label: {
            Image(systemName: "arrow.clockwise")
          }
          .disabled(isRefreshing)
        }
      }
    }
  }

  // MARK: - Itinerary Content

  @ViewBuilder
  private func itineraryContent(_ itinerary: WatchItinerary) -> some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        // Header with progress
        headerSection(itinerary)

        Divider()

        // POI List
        ForEach(itinerary.pois) { poi in
          NavigationLink(destination: POINavigationView(poi: poi)) {
            POIRowView(poi: poi) {
              toggleVisited(poi)
            }
          }
          .buttonStyle(.plain)
        }
      }
      .padding(.horizontal)
    }
  }

  @ViewBuilder
  private func headerSection(_ itinerary: WatchItinerary) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(itinerary.title)
        .font(.headline)
        .lineLimit(2)

      if let destination = itinerary.destination {
        Label(destination, systemImage: "mappin.circle.fill")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      // Progress indicator
      HStack {
        ProgressView(value: itinerary.progress)
          .tint(.green)

        Text("\(itinerary.completedPOIs)/\(itinerary.totalPOIs)")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.vertical, 4)
  }

  // MARK: - Empty State

  private var emptyStateView: some View {
    VStack(spacing: 12) {
      Image(systemName: "calendar.badge.exclamationmark")
        .font(.largeTitle)
        .foregroundStyle(.secondary)

      Text("今日暂无行程")
        .font(.headline)

      Text("在手机上添加行程后\n会自动同步到手表")
        .font(.caption)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      Button("刷新") {
        refreshData()
      }
      .buttonStyle(.borderedProminent)
      .disabled(isRefreshing)
    }
    .padding()
  }

  // MARK: - Actions

  private func refreshData() {
    isRefreshing = true
    sessionManager.requestTodayItinerary()

    // Reset after delay
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      isRefreshing = false
    }
  }

  private func toggleVisited(_ poi: WatchPOI) {
    sessionManager.markPOIVisited(poiId: poi.id, visited: !poi.isVisited)
  }
}

// MARK: - POI Row View

struct POIRowView: View {
  let poi: WatchPOI
  let onToggleVisited: () -> Void

  var body: some View {
    HStack(spacing: 8) {
      // Visit toggle
      Button {
        onToggleVisited()
      } label: {
        Image(systemName: poi.isVisited ? "checkmark.circle.fill" : "circle")
          .foregroundStyle(poi.isVisited ? .green : .secondary)
          .font(.title3)
      }
      .buttonStyle(.plain)

      // POI Info
      VStack(alignment: .leading, spacing: 2) {
        HStack(spacing: 4) {
          Image(systemName: poi.iconName)
            .font(.caption)
            .foregroundStyle(.blue)

          Text(poi.name)
            .font(.footnote)
            .fontWeight(.medium)
            .lineLimit(1)
            .strikethrough(poi.isVisited)
        }

        if let time = poi.startTime {
          Text(time)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()

      // Navigation indicator
      if poi.hasCoordinates {
        Image(systemName: "location.fill")
          .font(.caption)
          .foregroundStyle(.blue)
      }
    }
    .padding(.vertical, 6)
    .opacity(poi.isVisited ? 0.6 : 1.0)
  }
}

// MARK: - Next POI Card

struct NextPOICardView: View {
  let poi: WatchPOI
  let onNavigate: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text("下一站")
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        if let time = poi.startTime {
          Text(time)
            .font(.caption)
            .foregroundStyle(.blue)
        }
      }

      HStack(spacing: 8) {
        Image(systemName: poi.iconName)
          .font(.title2)
          .foregroundStyle(.blue)

        VStack(alignment: .leading, spacing: 2) {
          Text(poi.name)
            .font(.headline)
            .lineLimit(1)

          if let address = poi.address {
            Text(address)
              .font(.caption2)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
        }
      }

      if poi.hasCoordinates {
        Button {
          onNavigate()
        } label: {
          Label("开始导航", systemImage: "location.fill")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .tint(.blue)
      }
    }
    .padding()
    .background(
      RoundedRectangle(cornerRadius: 12)
        .fill(.ultraThinMaterial)
    )
  }
}

// MARK: - Preview

#Preview {
  TodayItineraryView()
}
