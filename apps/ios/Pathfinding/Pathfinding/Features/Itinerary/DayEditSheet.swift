import SwiftUI

// MARK: - Day Edit Sheet

struct DayEditSheet: View {
  @Binding var localDays: [AiDay]
  @Binding var selectedDayIndex: Int?

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
        }
        .navigationTitle("第 \(localDays[index].dayNumber) 天 - 编辑")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) { EditButton() }
          ToolbarItem(placement: .topBarLeading) { Button("完成") { selectedDayIndex = nil } }
        }
      }
      .presentationDetents([.medium, .large])
    } else {
      ContentUnavailableView("无数据", systemImage: "exclamationmark.triangle")
    }
  }
}
