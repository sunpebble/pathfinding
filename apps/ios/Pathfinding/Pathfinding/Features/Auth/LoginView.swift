import SwiftUI

struct LoginView: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(AuthViewModel.self) private var authViewModel

  @State private var email = ""
  @State private var password = ""
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showSignup = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.xl) {
          // MARK: - Header
          VStack(spacing: DesignTokens.Spacing.sm) {
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
                .frame(width: 80, height: 80)

              Image(systemName: "map.fill")
                .font(.system(size: 36))
                .foregroundStyle(.white)
            }
            .shadow(color: .indigo.opacity(0.3), radius: 20, y: 10)
            .padding(.top, DesignTokens.Spacing.xl)

            Text("欢迎回来")
              .font(.title)
              .fontWeight(.bold)

            Text("登录 Pathfinding 继续你的旅程")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
          .padding(.bottom, DesignTokens.Spacing.lg)

          // MARK: - Login Form
          VStack(spacing: DesignTokens.Spacing.md) {
            // Email Field
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
              Text("邮箱")
                .font(.subheadline)
                .fontWeight(.medium)

              TextField("输入邮箱地址", text: $email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
                .autocorrectionDisabled()
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }

            // Password Field
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
              Text("密码")
                .font(.subheadline)
                .fontWeight(.medium)

              SecureField("输入密码", text: $password)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }

            // Error Message
            if let errorMessage {
              HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "exclamationmark.circle.fill")
                  .foregroundStyle(.red)
                Text(errorMessage)
                  .font(.caption)
                  .foregroundStyle(.red)
              }
              .padding(.vertical, DesignTokens.Spacing.xs)
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
                    .tint(.white)
                }
                Text(isLoading ? "登录中..." : "登录")
                  .fontWeight(.semibold)
              }
              .frame(maxWidth: .infinity)
            }
            .buttonStyle(.primary)
            .disabled(isLoading || email.isEmpty || password.isEmpty)
            .padding(.top, DesignTokens.Spacing.xs)

            // Forgot Password
            Button {
              // TODO: Implement forgot password
            } label: {
              Text("忘记密码？")
                .font(.subheadline)
                .foregroundStyle(.accent)
            }
            .padding(.top, DesignTokens.Spacing.xxs)
          }
          .padding(.horizontal, DesignTokens.Spacing.lg)

          // MARK: - Divider
          HStack(spacing: DesignTokens.Spacing.sm) {
            Rectangle()
              .fill(Color(.systemGray4))
              .frame(height: 1)

            Text("或")
              .font(.subheadline)
              .foregroundStyle(.secondary)

            Rectangle()
              .fill(Color(.systemGray4))
              .frame(height: 1)
          }
          .padding(.horizontal, DesignTokens.Spacing.lg)

          // MARK: - Social Login
          VStack(spacing: DesignTokens.Spacing.sm) {
            // Google Sign In
            Button {
              Task {
                await handleSocialLogin(.google)
              }
            } label: {
              HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "globe")
                  .font(.title3)
                Text("使用 Google 登录")
                  .fontWeight(.medium)
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, DesignTokens.Spacing.sm)
              .background(Color(.systemGray6))
              .foregroundStyle(.primary)
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .disabled(isLoading)

            // Apple Sign In
            Button {
              Task {
                await handleSocialLogin(.apple)
              }
            } label: {
              HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "apple.logo")
                  .font(.title3)
                Text("使用 Apple 登录")
                  .fontWeight(.medium)
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, DesignTokens.Spacing.sm)
              .background(.black)
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .disabled(isLoading)
          }
          .padding(.horizontal, DesignTokens.Spacing.lg)

          // MARK: - Sign Up Link
          HStack(spacing: 4) {
            Text("还没有账号？")
              .font(.subheadline)
              .foregroundStyle(.secondary)

            Button {
              showSignup = true
            } label: {
              Text("注册")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.accent)
            }
          }
          .padding(.top, DesignTokens.Spacing.sm)

          Spacer()
        }
      }
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("跳过") {
            dismiss()
          }
          .foregroundStyle(.secondary)
        }
      }
      .sheet(isPresented: $showSignup) {
        SignupView()
      }
    }
  }

  // MARK: - Actions

  private func handleLogin() async {
    guard !email.isEmpty, !password.isEmpty else { return }

    isLoading = true
    errorMessage = nil

    do {
      try await AuthManager.shared.signIn(email: email, password: password)

      // Update auth state to trigger UI refresh
      await authViewModel.updateAuthState()

      // No need to dismiss - the app will automatically show ContentView
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
    .environment(AuthViewModel())
}
