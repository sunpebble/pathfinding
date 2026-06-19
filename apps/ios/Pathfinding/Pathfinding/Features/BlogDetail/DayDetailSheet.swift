import SwiftUI

// MARK: - Day Detail Sheet

struct DayDetailSheet: View {
  let day: AiDay
  let onDismiss: () -> Void

  var body: some View {
    NavigationStack {
      List {
        ForEach(Array(day.pois.enumerated()), id: \.element.id) { index, poi in
          PoiRow(poi: poi, index: index + 1)
        }
      }
      .listStyle(.insetGrouped)
      .navigationTitle("第 \(day.dayNumber) 天")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { onDismiss() }
        }
      }
    }
  }
}
