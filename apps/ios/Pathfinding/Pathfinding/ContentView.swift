import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("首页", systemImage: "house")
                }
            
            BlogListView()
                .tabItem {
                    Label("攻略", systemImage: "book")
                }
            
            ItineraryListView()
                .tabItem {
                    Label("行程", systemImage: "map")
                }
            
            ProfileView()
                .tabItem {
                    Label("我的", systemImage: "person")
                }
        }
    }
}

#Preview {
    ContentView()
}
