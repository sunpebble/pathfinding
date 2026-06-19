import SwiftUI

// MARK: - Tips Card

struct TipsCard: View {
  let tips: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Label("旅行贴士", systemImage: "lightbulb").font(.headline)
      ForEach(tips, id: \.self) { tip in
        HStack(alignment: .top) {
          Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
          Text(tip)
        }
        .font(.subheadline)
      }
    }
    .padding()
    .background(.green.opacity(0.1))
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .padding(.horizontal)
  }
}
