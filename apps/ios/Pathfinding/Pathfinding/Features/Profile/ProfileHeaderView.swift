import SwiftUI

// MARK: - Profile Header View

struct ProfileHeaderView: View {
  let email: String?
  let isLoggedIn: Bool
  var showChevron: Bool = false

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.lg) {
      Image(systemName: "person.fill")
        .font(.system(size: 32, weight: .medium))
        .foregroundStyle(.white)
        .padding(DesignTokens.Spacing.lg)
        .glassEffect(.regular.tint(.purple.opacity(0.25)), in: Circle())

      VStack(alignment: .leading, spacing: 6) {
        Text(isLoggedIn ? (email ?? "User") : "profile.guest".localized)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(.primary)

        if isLoggedIn {
          Text("profile.logged_in".localized)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        } else {
          HStack(spacing: 4) {
            Image(systemName: "arrow.right.circle.fill")
              .font(.caption)
              .foregroundStyle(.indigo)
            Text("profile.login_prompt".localized)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }
      }

      Spacer()
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}
