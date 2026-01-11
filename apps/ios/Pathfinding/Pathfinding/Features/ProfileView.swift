import SwiftUI

struct ProfileView: View {
  @State private var showAPISettings = false
  @State private var showAbout = false

  var body: some View {
    NavigationStack {
      List {
        // MARK: - Profile Section
        Section {
          HStack(spacing: DesignTokens.Spacing.md) {
            // Avatar
            ZStack {
              Circle()
                .fill(
                  LinearGradient(
                    colors: [.indigo, .purple],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                  )
                )
                .frame(width: 70, height: 70)

              Image(systemName: "person.fill")
                .font(.system(size: 30))
                .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
              Text("游客")
                .font(.title3)
                .fontWeight(.semibold)

              Text("点击登录体验更多功能")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
              .font(.caption)
              .foregroundStyle(.tertiary)
          }
          .padding(.vertical, DesignTokens.Spacing.xs)
        }

        // MARK: - Stats Section
        Section {
          HStack(spacing: 0) {
            StatItem(value: "0", label: "收藏", icon: "bookmark.fill", color: .orange)
            Divider().frame(height: 40)
            StatItem(value: "0", label: "行程", icon: "map.fill", color: .indigo)
            Divider().frame(height: 40)
            StatItem(value: "0", label: "足迹", icon: "shoeprints.fill", color: .green)
          }
          .listRowInsets(EdgeInsets())
        }

        // MARK: - Settings Section
        Section("设置") {
          Button {
            showAPISettings = true
          } label: {
            SettingsRow(
              icon: "server.rack",
              title: "API 配置",
              subtitle: AppConfig.apiBaseURL,
              iconColor: .blue
            )
          }

          NavigationLink {
            CacheSettingsView()
          } label: {
            SettingsRow(
              icon: "internaldrive",
              title: "缓存管理",
              subtitle: "清理图片和数据缓存",
              iconColor: .orange
            )
          }

          Button {
            showAbout = true
          } label: {
            SettingsRow(
              icon: "info.circle",
              title: "关于",
              subtitle: "版本信息与开发者",
              iconColor: .purple
            )
          }
        }

        // MARK: - Version Section
        Section {
          HStack {
            Text("版本")
            Spacer()
            Text("\(AppConfig.appVersion) (\(AppConfig.buildNumber))")
              .foregroundStyle(.secondary)
          }

          #if DEBUG
            HStack {
              Text("环境")
              Spacer()
              Text(AppConfig.Environment.current.rawValue.capitalized)
                .foregroundStyle(.orange)
            }
          #endif
        }
      }
      .navigationTitle("我的")
      .sheet(isPresented: $showAPISettings) {
        APISettingsSheet()
      }
      .sheet(isPresented: $showAbout) {
        AboutSheet()
      }
    }
  }
}

// MARK: - Stat Item

struct StatItem: View {
  let value: String
  let label: String
  let icon: String
  let color: Color

  var body: some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)

      Text(value)
        .font(.title2)
        .fontWeight(.bold)

      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}

// MARK: - Settings Row

struct SettingsRow: View {
  let icon: String
  let title: String
  let subtitle: String
  let iconColor: Color

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(iconColor)
        .frame(width: 28)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .foregroundStyle(.primary)

        Text(subtitle)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
    }
  }
}

// MARK: - API Settings Sheet

struct APISettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var apiURL = AppConfig.apiBaseURL

  var body: some View {
    NavigationStack {
      Form {
        Section("API 服务器") {
          TextField("API URL", text: $apiURL)
            .textInputAutocapitalization(.never)
            .keyboardType(.URL)
        }

        Section {
          Text("当前环境: \(AppConfig.Environment.current.rawValue.capitalized)")
            .foregroundStyle(.secondary)
        } footer: {
          Text("修改 API 地址需要重启应用才能生效")
        }
      }
      .navigationTitle("API 配置")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("保存") {
            // Save to UserDefaults
            dismiss()
          }
          .fontWeight(.semibold)
        }
      }
    }
  }
}

// MARK: - Cache Settings View

struct CacheSettingsView: View {
  @State private var isClearing = false

  var body: some View {
    List {
      Section("图片缓存") {
        HStack {
          Text("缓存大小限制")
          Spacer()
          Text("\(AppConfig.imageCacheSizeLimit / 1024 / 1024) MB")
            .foregroundStyle(.secondary)
        }

        Button {
          Task {
            isClearing = true
            ImageCache.shared.clearCache()
            try? await Task.sleep(for: .seconds(0.5))
            isClearing = false
          }
        } label: {
          HStack {
            Text("清除图片缓存")
            Spacer()
            if isClearing {
              ProgressView()
            }
          }
        }
        .disabled(isClearing)
      }

      Section("API 缓存") {
        HStack {
          Text("缓存有效期")
          Spacer()
          Text("\(Int(AppConfig.apiCacheValiditySeconds / 60)) 分钟")
            .foregroundStyle(.secondary)
        }

        Button {
          Task {
            await APIClient.shared.clearCache()
            GuideStore.shared.clearCache()
          }
        } label: {
          Text("清除 API 缓存")
        }
      }
    }
    .navigationTitle("缓存管理")
  }
}

// MARK: - About Sheet

struct AboutSheet: View {
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.xl) {
          // App Icon
          ZStack {
            RoundedRectangle(cornerRadius: 24)
              .fill(
                LinearGradient(
                  colors: [.indigo, .purple],
                  startPoint: .topLeading,
                  endPoint: .bottomTrailing
                )
              )
              .frame(width: 100, height: 100)

            Image(systemName: "map.fill")
              .font(.system(size: 44))
              .foregroundStyle(.white)
          }
          .shadow(color: .indigo.opacity(0.3), radius: 20, y: 10)

          VStack(spacing: 4) {
            Text("Pathfinding")
              .font(.title)
              .fontWeight(.bold)

            Text("版本 \(AppConfig.appVersion)")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          Text("发现精彩旅途，AI 智能规划你的每一段旅程")
            .font(.body)
            .foregroundStyle(.secondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal)

          Divider()
            .padding(.horizontal)

          VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            AboutRow(title: "开发者", value: "Pathfinding Team")
            AboutRow(title: "版本号", value: AppConfig.buildNumber)
            AboutRow(title: "Swift 版本", value: "6.0")
            AboutRow(title: "最低支持系统", value: "iOS 17.0")
          }
          .padding(.horizontal)

          Spacer()
        }
        .padding(.top, DesignTokens.Spacing.xl)
      }
      .navigationTitle("关于")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
    }
  }
}

struct AboutRow: View {
  let title: String
  let value: String

  var body: some View {
    HStack {
      Text(title)
        .foregroundStyle(.secondary)
      Spacer()
      Text(value)
    }
  }
}

#Preview {
  ProfileView()
}
