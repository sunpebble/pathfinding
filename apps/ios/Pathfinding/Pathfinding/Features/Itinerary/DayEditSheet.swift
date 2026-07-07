import SwiftUI

// MARK: - Day Edit Sheet

struct DayEditSheet: View {
  @Binding var localDays: [AiDay]
  @Binding var selectedDayIndex: Int?

  /// Index of a freshly added POI to open in the editor
  @State private var newPoiIndex: Int?

  var body: some View {
    if let index = selectedDayIndex, localDays.indices.contains(index) {
      NavigationStack {
        List {
          ForEach($localDays[index].pois) { $poi in
            NavigationLink {
              PoiEditView(poi: $poi)
            } label: {
              VStack(alignment: .leading, spacing: 4) {
                HStack {
                  Text(poi.name).font(.headline)
                  if let type = poi.type {
                    Text(type).font(.caption).padding(.horizontal, 6).padding(.vertical, 2).background(
                      .blue.opacity(0.1)
                    ).clipShape(Capsule())
                  }
                }
                if let time = poi.time {
                  Text("⏰ \(time)").font(.caption).foregroundStyle(.blue)
                }
                if let desc = poi.description {
                  Text(desc).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                }
              }
              .padding(.vertical, 4)
            }
          }
          .onMove { from, to in
            localDays[index].pois.move(fromOffsets: from, toOffset: to)
          }
          .onDelete { offsets in
            localDays[index].pois.remove(atOffsets: offsets)
          }

          // Add POI row — also the empty-day affordance
          Button {
            localDays[index].pois.append(AiPoi(name: ""))
            newPoiIndex = localDays[index].pois.count - 1
          } label: {
            Label("day_edit.add_poi".localized, systemImage: "plus.circle.fill")
          }
        }
        .navigationTitle("day_edit.title".localized(localDays[index].dayNumber))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) { EditButton() }
          ToolbarItem(placement: .topBarLeading) {
            Button("common.done".localized) { selectedDayIndex = nil }
          }
        }
        .navigationDestination(isPresented: Binding(
          get: { newPoiIndex != nil },
          set: { presented in
            if !presented {
              // Drop the placeholder if the user backed out without naming it
              if let poiIndex = newPoiIndex,
                 localDays[index].pois.indices.contains(poiIndex),
                 localDays[index].pois[poiIndex].name.trimmingCharacters(in: .whitespaces).isEmpty {
                localDays[index].pois.remove(at: poiIndex)
              }
              newPoiIndex = nil
            }
          }
        )) {
          if let poiIndex = newPoiIndex, localDays[index].pois.indices.contains(poiIndex) {
            PoiEditView(poi: $localDays[index].pois[poiIndex])
          }
        }
      }
      .presentationDetents([.medium, .large])
    } else {
      ContentUnavailableView("empty.no_data".localized, systemImage: "exclamationmark.triangle")
    }
  }
}
