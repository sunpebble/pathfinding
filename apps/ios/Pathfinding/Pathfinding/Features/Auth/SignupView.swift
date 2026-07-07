import SwiftUI

struct SignupView: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(\.colorScheme) private var colorScheme

  @State private var email = ""
  @State private var password = ""
  @State private var confirmPassword = ""
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showLogin = false

  // Animation
  @State private var headerAppeared = false
  @State private var formAppeared = false

  private let brandAccent = Color(red: 0.97, green: 0.72, blue: 0.20)
  private let brandInk = Color(red: 0.14, green: 0.15, blue: 0.20)

  var body: some View {
    NavigationStack {
      ZStack {
        Color(.systemGroupedBackground)
          .ignoresSafeArea()

        LinearGradient(
          colors: [
            brandAccent.opacity(colorScheme == .dark ? 0.14 : 0.10),
            brandInk.opacity(colorScheme == .dark ? 0.10 : 0.03),
            Color(.systemGroupedBackground)
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
                Text("创建账号")
                  .font(DesignTokens.Typography.Display.compact)
                  .fontWeight(.bold)

                Text("注册 Sunpebble Trips，开始整理你的行程")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }
            }
            .padding(.bottom, DesignTokens.Spacing.xxl)
            .opacity(headerAppeared ? 1 : 0)
            .offset(y: headerAppeared ? 0 : 15)

            // MARK: - Signup Form Card
            VStack(spacing: DesignTokens.Spacing.lg) {
              VStack(spacing: DesignTokens.Spacing.md) {
                // Email Field
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                  Text("邮箱")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)

                  TextField("输入邮箱地址", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("signup-email-field")
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
                  Text("密码")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)

                  SecureField("输入密码（至少8位）", text: $password)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("signup-password-field")
                    .padding(DesignTokens.Spacing.sm)
                    .background(DesignTokens.Colors.fillQuaternary)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    .overlay(
                      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .stroke(DesignTokens.Colors.border.opacity(0.5), lineWidth: 0.5)
                    )

                  if let message = passwordValidationMessage {
                    HStack(spacing: 4) {
                      Image(systemName: "info.circle.fill")
                        .font(.caption2)
                      Text(message)
                        .font(.caption)
                    }
                    .foregroundStyle(.orange)
                  }
                }

                // Confirm Password Field
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                  Text("确认密码")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)

                  SecureField("再次输入密码", text: $confirmPassword)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .accessibilityIdentifier("signup-confirm-password-field")
                    .padding(DesignTokens.Spacing.sm)
                    .background(DesignTokens.Colors.fillQuaternary)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    .overlay(
                      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .stroke(DesignTokens.Colors.border.opacity(0.5), lineWidth: 0.5)
                    )
                }
              }

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

              // Signup Button
              Button {
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
              .buttonStyle(.glassProminent)
              .accessibilityIdentifier("signup-submit-button")
              .disabled(isLoading || !isFormValid)
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

              Text("其他方式")
                .font(.caption)
                .foregroundStyle(.tertiary)

              Rectangle()
                .fill(DesignTokens.Colors.separator)
                .frame(height: 0.5)
            }
            .padding(.horizontal, DesignTokens.Spacing.xxl)
            .padding(.vertical, DesignTokens.Spacing.lg)

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
                    .font(.body)
                  Text("微信注册")
                    .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(Color(red: 0.07, green: 0.73, blue: 0.31))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
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
                    .font(.body)
                  Text("Apple 注册")
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
                  .foregroundStyle(brandAccent)
              }
            }
            .padding(.top, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xxl)
          }
        }
        .accessibilityIdentifier("signup-screen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .topBarTrailing) {
            Button("跳过") {
              dismiss()
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
          }
        }
        .sheet(isPresented: $showLogin) {
          LoginView()
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

  // MARK: - Computed Properties

  private var isFormValid: Bool {
    !email.isEmpty && !password.isEmpty && !confirmPassword.isEmpty && password == confirmPassword && password.count >= 8
  }

  private var passwordValidationMessage: String? {
    if password.isEmpty {
      return nil
    }
    if password.count < 8 {
      return "密码至少需要8个字符"
    }
    if !confirmPassword.isEmpty && password != confirmPassword {
      return "两次输入的密码不一致"
    }
    return nil
  }

  // MARK: - Actions

  private func handleSignup() async {
    guard isFormValid else {
      errorMessage = "请确保所有字段都已填写且密码匹配"
      return
    }

    isLoading = true
    errorMessage = nil

    do {
      try await AuthManager.shared.signUp(email: email, password: password)

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
