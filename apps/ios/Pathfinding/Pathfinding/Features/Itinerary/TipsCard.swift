import SwiftUI

// MARK: - Tips Card

struct TipsCard: View {
  let tips: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Label("tips.title".localized, systemImage: "lightbulb").font(.headline)
      ForEach(tips, id: \.self) { tip in
        HStack(alignment: .top) {
          Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
          Text(tip)
        }
        .font(.subheadline)
      }
    }
    .padding()
    .cardSurface(tint: .green.opacity(0.15))
    .padding(.horizontal)
  }
}
