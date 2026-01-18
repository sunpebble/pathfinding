import SwiftUI

struct SignupView: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var authViewModel: AuthViewModel

  @State private var email = ""
  @State private var password = ""
  @State private var confirmPassword = ""
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showLogin = false

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

            Text("创建账号")
              .font(.title)
              .fontWeight(.bold)

            Text("注册 Pathfinding 开始你的旅程")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
          .padding(.bottom, DesignTokens.Spacing.lg)

          // MARK: - Signup Form
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

            // Confirm Password Field
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
              Text("确认密码")
                .font(.subheadline)
                .fontWeight(.medium)

              SecureField("再次输入密码", text: $confirmPassword)
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

            // Signup Button
            Button {
              print("🔘 Signup button tapped!")
              Task {
                await handleSignup()
              }
            } label: {
              HStack {
                if isLoading {
                  ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
                }
                Text(isLoading ? "注册中..." : "注册")
                  .fontWeight(.semibold)
              }
              .frame(maxWidth: .infinity)
            }
            .buttonStyle(.primary)
            .disabled(isLoading || !isFormValid)
            .padding(.top, DesignTokens.Spacing.xs)
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

          // MARK: - Social Signup
          VStack(spacing: DesignTokens.Spacing.sm) {
            // WeChat Sign Up
            Button {
              Task {
                await handleSocialSignup(.wechat)
              }
            } label: {
              HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "message.fill")
                  .font(.title3)
                Text("使用微信注册")
                  .fontWeight(.medium)
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, DesignTokens.Spacing.sm)
              .background(Color(red: 0.07, green: 0.73, blue: 0.31)) // WeChat green
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
            .disabled(isLoading)

            // Apple Sign Up
            Button {
              Task {
                await handleSocialSignup(.apple)
              }
            } label: {
              HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "apple.logo")
                  .font(.title3)
                Text("使用 Apple 注册")
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

          // MARK: - Login Link
          HStack(spacing: 4) {
            Text("已有账号？")
              .font(.subheadline)
              .foregroundStyle(.secondary)

            Button {
              showLogin = true
            } label: {
              Text("登录")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(Color.accentColor)
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
      .sheet(isPresented: $showLogin) {
        LoginView()
      }
    }
  }

  // MARK: - Computed Properties

  private var isFormValid: Bool {
    !email.isEmpty && !password.isEmpty && !confirmPassword.isEmpty && password == confirmPassword
  }

  // MARK: - Actions

  private func handleSignup() async {
    print("📝 handleSignup() called")
    guard isFormValid else {
      print("📝 Form not valid")
      errorMessage = "请确保所有字段都已填写且密码匹配"
      return
    }

    print("📝 Starting signup with email: \(email)")
    isLoading = true
    errorMessage = nil

    do {
      print("📝 Calling AuthManager.signUp...")
      try await AuthManager.shared.signUp(email: email, password: password)

      print("📝 Signup successful, updating auth state...")
      // Update auth state to trigger UI refresh
      await authViewModel.updateAuthState()

      await MainActor.run {
        isLoading = false
        // Dismiss the signup view
        dismiss()
      }
      print("📝 Signup complete!")
      // No need to dismiss - the app will automatically show ContentView
    } catch {
      print("📝 Signup error: \(error)")
      await MainActor.run {
        errorMessage = error.localizedDescription
        isLoading = false
      }
    }
  }

  private func handleSocialSignup(_ provider: OAuthProvider) async {
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
  SignupView()
    .environmentObject(AuthViewModel())
}
