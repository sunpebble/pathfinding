import SwiftUI

// MARK: - Profile Header View

struct ProfileHeaderView: View {
  let email: String?
  let isLoggedIn: Bool
  let colorScheme: ColorScheme
  var showChevron: Bool = false

  @State private var isGlowing = false
  @State private var pulseScale: CGFloat = 1.0

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.lg) {
      // Avatar with enhanced styling and dark mode glow
      ZStack {
        // Outer animated glow (dark mode only)
        if colorScheme == .dark {
          Circle()
            .fill(
              RadialGradient(
                colors: [.purple.opacity(0.4), .indigo.opacity(0.2), .clear],
                center: .center,
                startRadius: 30,
                endRadius: isGlowing ? 55 : 45
              )
            )
            .frame(width: 90, height: 90)
            .blur(radius: 8)
        }

        // Gradient blur background
        Circle()
          .fill(
            LinearGradient(
              colors: [.indigo.opacity(0.3), .purple.opacity(0.3)],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 80, height: 80)
          .blur(radius: 8)

        // Main avatar circle with pulse animation
        Circle()
          .fill(
            LinearGradient(
              colors: [.indigo, .purple],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 72, height: 72)
          .scaleEffect(pulseScale)
          .shadow(
            color: colorScheme == .dark ? .purple.opacity(0.5) : .indigo.opacity(0.4),
            radius: colorScheme == .dark ? 12 : 8,
            y: 4
          )

        Image(systemName: "person.fill")
          .font(.system(size: 32, weight: .medium))
          .foregroundStyle(.white)
      }
      .frame(width: 80, height: 80)
      .onAppear {
        if colorScheme == .dark {
          withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
            isGlowing = true
          }
        }
        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
          pulseScale = 1.03
        }
      }

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

      if showChevron {
        Image(systemName: "chevron.right")
          .font(.body)
          .fontWeight(.semibold)
          .foregroundStyle(.quaternary)
      }
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
  }
}
