import SwiftUI

struct ProfileView: View {
  var body: some View {
    NavigationStack {
      List {
        Section {
          HStack(spacing: 16) {
            Image(systemName: "person.circle.fill").font(.system(size: 60)).foregroundStyle(
              .secondary)
            VStack(alignment: .leading) {
              Text("游客").font(.headline)
              Text("点击登录").font(.subheadline).foregroundStyle(.secondary)
            }
          }
          .padding(.vertical, 8)
        }

        Section("设置") {
          Label("API 配置", systemImage: "server.rack")
          Label("关于", systemImage: "info.circle")
        }

        Section {
          HStack {
            Text("版本")
            Spacer()
            Text("1.0.0").foregroundStyle(.secondary)
          }
        }
      }
      .navigationTitle("我的")
    }
  }
}

#Preview { ProfileView() }
