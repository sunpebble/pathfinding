import SwiftUI
import MapKit

// MARK: - Debouncer

@MainActor
final class PoiSearchDebouncer {
  private let interval: Duration
  private let onFire: (String) -> Void
  private var task: Task<Void, Never>?

  init(interval: Duration, onFire: @escaping (String) -> Void) {
    self.interval = interval
    self.onFire = onFire
  }

  func send(_ text: String) {
    task?.cancel()
    task = Task { [interval, onFire] in
      try? await Task.sleep(for: interval)
      guard !Task.isCancelled else { return }
      onFire(text)
    }
  }
}

// MARK: - View

struct PoiEditView: View {
  @Binding var poi: AiPoi
  @Environment(\.dismiss) var dismiss
  @State private var searchResults: [MKMapItem] = []
  @State private var debouncer = PoiSearchDebouncer(interval: .milliseconds(300)) { _ in }

  var body: some View {
    Form {
      Section("poi_edit.section.basic".localized) {
        TextField("poi_edit.name_placeholder".localized, text: $poi.name)
          .onChange(of: poi.name) { _, newValue in
            debouncer.send(newValue)
          }

        if !searchResults.isEmpty {
          ForEach(searchResults, id: \.self) { item in
            Button {
              selectLocation(item)
            } label: {
              VStack(alignment: .leading) {
                Text(item.name ?? "poi_edit.unknown_place".localized)
                  .foregroundStyle(.primary)
                if let title = item.address?.fullAddress {
                  Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
            }
          }
        }

        HStack {
          Text("poi_edit.time".localized)
          Spacer()
          TextField("poi_edit.time_placeholder".localized, text: Binding(
            get: { poi.time ?? "" },
            set: { poi.time = $0.isEmpty ? nil : $0 }
          ))
          .multilineTextAlignment(.trailing)
        }
      }

      Section("itinerary.notes".localized) {
        TextField("poi_edit.notes_placeholder".localized, text: Binding(
          get: { poi.description ?? "" },
          set: { poi.description = $0.isEmpty ? nil : $0 }
        ), axis: .vertical)
        .lineLimit(3...6)
      }
    }
    .navigationTitle("poi_edit.title".localized)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .confirmationAction) {
        Button("common.done".localized) { dismiss() }
      }
    }
    .task {
      debouncer = PoiSearchDebouncer(interval: .milliseconds(300)) { [self] query in
        performSearch(query)
      }
    }
  }

  private func performSearch(_ query: String) {
    guard !query.isEmpty else {
      searchResults = []
      return
    }

    let request = MKLocalSearch.Request()
    request.naturalLanguageQuery = query
    request.resultTypes = .pointOfInterest

    let search = MKLocalSearch(request: request)
    search.start { response, error in
      guard let items = response?.mapItems else { return }
      DispatchQueue.main.async {
        self.searchResults = items
      }
    }
  }

  private func selectLocation(_ item: MKMapItem) {
    poi.name = item.name ?? poi.name
    poi.latitude = item.location.coordinate.latitude
    poi.longitude = item.location.coordinate.longitude
    searchResults = []
  }
}
