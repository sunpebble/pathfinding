import SwiftUI

struct ItineraryListView: View {
  var body: some View {
    NavigationStack {
      ContentUnavailableView("暂无行程", systemImage: "map", description: Text("从攻略页面导入行程"))
        .navigationTitle("我的行程")
    }
  }
}

#Preview { ItineraryListView() }
