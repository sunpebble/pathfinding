import SwiftUI

struct LoginView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(\.dismiss) private var dismiss
  @Environment(\.colorScheme) private var colorScheme

  // Email login state
  @State private var email = ""
  @State private var password = ""

  // Common state
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showSignup = false

  // Animation
  @State private var headerAppeared = false
  @State private var formAppeared = false

  private let brandAccent = Sunpebble.sun
  private let brandInk = Sunpebble.ink

  var body: some View {
    NavigationStack {
      ZStack {
        DesignTokens.Colors.background
          .ignoresSafeArea()

        LinearGradient(
          colors: [
            brandAccent.opacity(colorScheme == .dark ? 0.14 : 0.10),
            brandInk.opacity(colorScheme == .dark ? 0.10 : 0.03),
            DesignTokens.Colors.background
          ],
          startPoint: .top,
          endPoint: .bottom
        )
        .ignoresSafeArea()

        ScrollView {
          VStack(spacing: 0) {
            // MARK: - Hero Header
            VStack(spacing: DesignTokens.Spacing.md) {
              ZStack {
                Circle()
                  .fill(brandAccent)
                  .frame(width: 76, height: 76)

                Image(systemName: "sun.max.fill")
                  .font(.system(size: 34, weight: .medium))
                  .foregroundStyle(brandInk)
              }
              .shadow(color: brandAccent.opacity(0.24), radius: 16, y: 8)
              .padding(.top, DesignTokens.Spacing.xxl)

              VStack(spacing: DesignTokens.Spacing.xs) {
                Text("login.welcome".localized)
                  .font(DesignTokens.Typography.Display.compact)
                  .fontWeight(.bold)

                Text("login.subtitle".localized)
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }
            }
            .padding(.bottom, DesignTokens.Spacing.xxl)
            .opacity(headerAppeared ? 1 : 0)
            .offset(y: headerAppeared ? 0 : 15)

            // MARK: - Form Card
            VStack(spacing: DesignTokens.Spacing.lg) {
              // Login Form Fields
              VStack(spacing: DesignTokens.Spacing.md) {
                emailLoginForm
              }
              .transition(.opacity.combined(with: .move(edge: .leading)))

              // Error Message
              if let errorMessage {
                HStack(spacing: DesignTokens.Spacing.xs) {
                  Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Colors.error)
                  Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(DesignTokens.Colors.error)
                }
                .padding(DesignTokens.Spacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DesignTokens.Colors.error.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
              }

              // Login Button
              Button {
                Task {
                  await handleLogin()
                }
              } label: {
                HStack {
                  if isLoading {
                    ProgressView()
                      .progressViewStyle(.circular)
                      .tint(Sunpebble.onPrimary)
                  }
                  Text(isLoading ? "login.signing_in".localized : "auth.login".localized)
                    .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
              }
              .buttonStyle(.sunpebblePrimary)
              .accessibilityIdentifier("login-submit-button")
              .disabled(isLoginDisabled)
            }
            .padding(DesignTokens.Spacing.lg)
            .background(
              RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .fill(DesignTokens.Colors.cardBackground)
                .shadow(
                  color: colorScheme == .dark ? .clear : .black.opacity(0.04),
                  radius: 12, y: 4
                )
            )
            .overlay(
              RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .stroke(DesignTokens.Colors.cardBorder(for: colorScheme), lineWidth: 1)
            )
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .opacity(formAppeared ? 1 : 0)
            .offset(y: formAppeared ? 0 : 20)

            // MARK: - Divider
            HStack(spacing: DesignTokens.Spacing.sm) {
              Rectangle()
                .fill(DesignTokens.Colors.separator)
                .frame(height: 0.5)

              Text("login.other_methods".localized)
                .font(.caption)
                .foregroundStyle(.tertiary)

              Rectangle()
                .fill(DesignTokens.Colors.separator)
                .frame(height: 0.5)
            }
            .padding(.horizontal, DesignTokens.Spacing.xxl)
            .padding(.vertical, DesignTokens.Spacing.lg)

            // MARK: - Social Login
            VStack(spacing: DesignTokens.Spacing.sm) {
              // Apple Sign In
              Button {
                Task {
                  await handleSocialLogin(.apple)
                }
              } label: {
                HStack(spacing: DesignTokens.Spacing.sm) {
                  Image(systemName: "apple.logo")
                    .font(.body)
                  Text("login.apple".localized)
                    .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(colorScheme == .dark ? .white : .black)
                .foregroundStyle(colorScheme == .dark ? .black : .white)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
              }
              .disabled(isLoading)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            // MARK: - Sign Up Link
            HStack(spacing: DesignTokens.Spacing.xxs) {
              Text("login.no_account".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)

              Button {
                showSignup = true
              } label: {
                Text("auth.signup".localized)
                  .font(.subheadline)
                  .fontWeight(.semibold)
                  .foregroundStyle(brandAccent)
              }
              .accessibilityIdentifier("show-signup-button")
            }
            .padding(.top, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xxl)
          }
        }
        .accessibilityIdentifier("login-screen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("login.skip".localized) {
              authViewModel.continueAsGuest()
              // When shown as a sheet (e.g. from Profile) guest mode may already
              // be active, so the state change alone won't close it — dismiss
              // explicitly. As the launch gate this is a harmless no-op.
              dismiss()
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
          }
        }
        .sheet(isPresented: $showSignup) {
          SignupView()
        }
        .onAppear {
          withAnimation(DesignTokens.Animation.smooth.delay(0.1)) {
            headerAppeared = true
          }
          withAnimation(DesignTokens.Animation.smooth.delay(0.3)) {
            formAppeared = true
          }
        }
      }
    }
  }

  // MARK: - Email Login Form

  private var emailLoginForm: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Email Field
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("auth.email".localized)
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(DesignTokens.Colors.textSecondary)

        TextField("login.email_placeholder".localized, text: $email)
          .textInputAutocapitalization(.never)
          .keyboardType(.emailAddress)
          .autocorrectionDisabled()
          .accessibilityIdentifier("login-email-field")
          .padding(DesignTokens.Spacing.sm)
          .background(DesignTokens.Colors.fillQuaternary)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
          .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
              .stroke(DesignTokens.Colors.border.opacity(0.5), lineWidth: 0.5)
          )
      }

      // Password Field
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("auth.password".localized)
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(DesignTokens.Colors.textSecondary)

        SecureField("login.password_placeholder".localized, text: $password)
          .textInputAutocapitalization(.never)
          .autocorrectionDisabled()
          .accessibilityIdentifier("login-password-field")
          .padding(DesignTokens.Spacing.sm)
          .background(DesignTokens.Colors.fillQuaternary)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
          .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
              .stroke(DesignTokens.Colors.border.opacity(0.5), lineWidth: 0.5)
          )
      }
    }
  }

  // MARK: - Computed Properties

  private var isLoginDisabled: Bool {
    isLoading || email.isEmpty || password.isEmpty
  }

  // MARK: - Actions

  private func handleLogin() async {
    isLoading = true
    errorMessage = nil

    do {
      try await AuthManager.shared.signIn(email: email, password: password)

      // Update auth state to trigger UI refresh
      await authViewModel.updateAuthState()

      await MainActor.run {
        isLoading = false
        dismiss()
      }
    } catch {
      await MainActor.run {
        errorMessage = error.localizedDescription
        isLoading = false
      }
    }
  }

  private func handleSocialLogin(_ provider: OAuthProvider) async {
    isLoading = true
    errorMessage = nil

    do {
      try await AuthManager.shared.signInWithOAuth(provider: provider)

      // Update auth state to trigger UI refresh
      await authViewModel.updateAuthState()
    } catch {
      await MainActor.run {
        errorMessage = error.localizedDescription
        isLoading = false
      }
    }
  }
}

#Preview {
  LoginView()
    .environmentObject(AuthViewModel())
}
