import SwiftUI

// MARK: - About Sheet

struct AboutSheet: View {
  var body: some View {
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
          Text("about.app_name".localized)
            .font(.title)
            .fontWeight(.bold)

          Text(String(format: "about.version".localized, AppConfig.appVersion))
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }

        Text("about.tagline".localized)
          .font(.body)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal)

        Divider()
          .padding(.horizontal)

        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
          AboutRow(title: "about.developer".localized, value: "about.developer_name".localized)
          AboutRow(title: "about.build_number".localized, value: AppConfig.buildNumber)
          AboutRow(title: "about.swift_version".localized, value: "6.0")
          AboutRow(title: "about.min_ios".localized, value: "iOS 26.0")
        }
        .padding(.horizontal)

        Spacer()
      }
      .padding(.top, DesignTokens.Spacing.xl)
    }
    .navigationTitle("about.title".localized)
    .navigationBarTitleDisplayMode(.inline)
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
