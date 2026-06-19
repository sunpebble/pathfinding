import SwiftUI

// MARK: - Map Marker By Day

struct MapMarkerByDay: View {
  let index: Int
  let dayColor: Color
  let isSelected: Bool

  var body: some View {
    ZStack {
      Circle()
        .fill(dayColor.gradient)
        .frame(width: isSelected ? 40 : 32, height: isSelected ? 40 : 32)
        .shadow(color: dayColor.opacity(0.5), radius: isSelected ? 8 : 4, y: 2)

      Text("\(index)")
        .font(isSelected ? .headline : .caption)
        .fontWeight(.bold)
        .foregroundStyle(.white)
    }
    .animation(.spring(response: 0.3), value: isSelected)
  }
}
