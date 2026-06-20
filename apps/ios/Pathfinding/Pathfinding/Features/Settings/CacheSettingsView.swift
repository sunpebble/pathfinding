import SwiftUI

// MARK: - Cache Settings View

struct CacheSettingsView: View {
  @State private var isClearing = false

  var body: some View {
    List {
      Section("cache.image".localized) {
        HStack {
          Text("cache.image_size_limit".localized)
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
            Text("cache.clear_image".localized)
            Spacer()
            if isClearing {
              ProgressView()
            }
          }
        }
        .disabled(isClearing)
      }

      Section("cache.api".localized) {
        HStack {
          Text("cache.api_validity".localized)
          Spacer()
          Text(String(format: "cache.api_validity_minutes".localized, Int(AppConfig.apiCacheValiditySeconds / 60)))
            .foregroundStyle(.secondary)
        }

        Button {
          Task {
            await NetworkClient.shared.clearCache()
            GuideStore.shared.clearCache()
          }
        } label: {
          Text("cache.clear_api".localized)
        }
      }
    }
    .navigationTitle("cache.title".localized)
  }
}
