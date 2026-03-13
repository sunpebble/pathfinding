import SwiftUI

/// Login method options
enum LoginMethod: String, CaseIterable {
  case phone = "phone"
  case email = "email"

  var title: String {
    switch self {
    case .phone: return "手机号登录"
    case .email: return "邮箱登录"
    }
  }

  var icon: String {
    switch self {
    case .phone: return "phone.fill"
    case .email: return "envelope.fill"
    }
  }
}

struct LoginView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(\.dismiss) private var dismiss
  @Environment(\.colorScheme) private var colorScheme

  // Login method state
  @State private var loginMethod: LoginMethod = .phone

  // Phone login state
  @State private var phoneNumber = ""
  @State private var verificationCode = ""
  @State private var isCodeSent = false
  @State private var countdown = 0

  // Email login state
  @State private var email = ""
  @State private var password = ""

  // Common state
  @State private var isLoading = false
  @State private var isSendingCode = false
  @State private var errorMessage: String?
  @State private var showSignup = false

  // Timer for countdown
  @State private var countdownTimer: Timer?

  // Animation
  @State private var headerAppeared = false
  @State private var formAppeared = false

  var body: some View {
    NavigationStack {
      ZStack {
        // Full-screen explorer background
        Color(.systemGroupedBackground)
          .ignoresSafeArea()

        // Full-screen teal gradient (top → bottom)
        LinearGradient(
          colors: [
            Color.teal.opacity(colorScheme == .dark ? 0.18 : 0.10),
            Color.teal.opacity(colorScheme == .dark ? 0.06 : 0.03),
            Color.teal.opacity(colorScheme == .dark ? 0.02 : 0.01)
          ],
          startPoint: .top,
          endPoint: .bottom
        )
        .ignoresSafeArea()

        // Topographic lines — full screen
        TopographicLinesView(
          lineCount: 8,
          lineColor: Color.teal.opacity(colorScheme == .dark ? 0.08 : 0.04)
        )
        .ignoresSafeArea()

        // Compass decoration (top-right)
        VStack {
          HStack {
            Spacer()
            CompassRoseDecoration(
              size: 180,
              color: .teal,
              opacity: colorScheme == .dark ? 0.08 : 0.05
            )
          }
          .padding(.trailing, -40)
          .padding(.top, 60)
          Spacer()
        }
        .ignoresSafeArea()

        // Noise texture overlay
        NoiseTextureOverlay(opacity: colorScheme == .dark ? 0.02 : 0.015)
          .ignoresSafeArea()

        ScrollView {
          VStack(spacing: 0) {
            // MARK: - Hero Header
            VStack(spacing: DesignTokens.Spacing.md) {
              // App Icon — Compass
              ZStack {
                Circle()
                  .fill(
                    LinearGradient(
                      colors: [
                        Color(red: 0.05, green: 0.60, blue: 0.45),
                        Color(red: 0.10, green: 0.75, blue: 0.55)
                      ],
                      startPoint: .topLeading,
                      endPoint: .bottomTrailing
                    )
                  )
                  .frame(width: 76, height: 76)

                Image(systemName: "safari.fill")
                  .font(.system(size: 34, weight: .medium))
                  .foregroundStyle(.white)
              }
              .shadow(color: Color.teal.opacity(0.3), radius: 20, y: 10)
              .padding(.top, DesignTokens.Spacing.xxl)

              VStack(spacing: DesignTokens.Spacing.xs) {
                Text("欢迎回来")
                  .font(DesignTokens.Typography.Display.compact)
                  .fontWeight(.bold)

                Text("登录探路，继续你的冒险旅程")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }
            }
            .padding(.bottom, DesignTokens.Spacing.xxl)
            .opacity(headerAppeared ? 1 : 0)
            .offset(y: headerAppeared ? 0 : 15)

            // MARK: - Form Card
            VStack(spacing: DesignTokens.Spacing.lg) {
              // Login Method Picker
              HStack(spacing: 0) {
                ForEach(LoginMethod.allCases, id: \.self) { method in
                  Button {
                    withAnimation(DesignTokens.Animation.standard) {
                      loginMethod = method
                    }
                  } label: {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                      Image(systemName: method.icon)
                        .font(.caption)
                      Text(method.title)
                        .font(.subheadline)
                        .fontWeight(loginMethod == method ? .semibold : .regular)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(
                      loginMethod == method
                        ? DesignTokens.Colors.cardBackground
                        : Color.clear
                    )
                    .foregroundStyle(
                      loginMethod == method
                        ? DesignTokens.Colors.textPrimary
                        : DesignTokens.Colors.textTertiary
                    )
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                  }
                }
              }
              .padding(3)
              .background(DesignTokens.Colors.fillQuaternary)
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
              .accessibilityIdentifier("login-method-picker")

              // Login Form Fields
              VStack(spacing: DesignTokens.Spacing.md) {
                if loginMethod == .phone {
                  phoneLoginForm
                } else {
                  emailLoginForm
                }
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
                      .tint(.white)
                  }
                  Text(isLoading ? "登录中..." : "登录")
                    .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
              }
              .buttonStyle(.primary)
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

              Text("其他方式")
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
              // WeChat Sign In
              Button {
                Task {
                  await handleSocialLogin(.wechat)
                }
              } label: {
                HStack(spacing: DesignTokens.Spacing.sm) {
                  Image(systemName: "message.fill")
                    .font(.body)
                  Text("微信登录")
                    .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(Color(red: 0.07, green: 0.73, blue: 0.31))
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
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
                    .font(.body)
                  Text("Apple 登录")
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
              Text("还没有账号？")
                .font(.subheadline)
                .foregroundStyle(.secondary)

              Button {
                showSignup = true
              } label: {
                Text("注册")
                  .font(.subheadline)
                  .fontWeight(.semibold)
                  .foregroundStyle(Color.teal)
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
            Button("跳过") {
              authViewModel.continueAsGuest()
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
          }
        }
        .sheet(isPresented: $showSignup) {
          SignupView()
        }
        .onDisappear {
          countdownTimer?.invalidate()
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

  // MARK: - Phone Login Form

  private var phoneLoginForm: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Phone Number Field
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("手机号")
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(DesignTokens.Colors.textSecondary)

        HStack(spacing: 0) {
          Text("+86")
            .font(.subheadline)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .padding(.horizontal, DesignTokens.Spacing.sm)

          Divider()
            .frame(height: 20)

          TextField("输入手机号", text: $phoneNumber)
            .textInputAutocapitalization(.never)
            .keyboardType(.phonePad)
            .autocorrectionDisabled()
            .padding(.horizontal, DesignTokens.Spacing.sm)
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Colors.fillQuaternary)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .overlay(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .stroke(DesignTokens.Colors.border.opacity(0.5), lineWidth: 0.5)
        )
      }

      // Verification Code Field
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("验证码")
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(DesignTokens.Colors.textSecondary)

        HStack {
          TextField("输入验证码", text: $verificationCode)
            .textInputAutocapitalization(.never)
            .keyboardType(.numberPad)
            .autocorrectionDisabled()
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.sm)

          Button {
            Task {
              await sendVerificationCode()
            }
          } label: {
            if isSendingCode {
              ProgressView()
                .progressViewStyle(.circular)
                .frame(width: 100)
            } else {
              Text(countdown > 0 ? "\(countdown)s" : "获取验证码")
                .font(.subheadline)
                .fontWeight(.medium)
                .frame(width: 100)
            }
          }
          .disabled(countdown > 0 || !isValidPhoneNumber || isSendingCode)
          .foregroundStyle(countdown > 0 || !isValidPhoneNumber ? .secondary : Color.teal)
          .padding(.trailing, DesignTokens.Spacing.xs)
        }
        .background(DesignTokens.Colors.fillQuaternary)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .overlay(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .stroke(DesignTokens.Colors.border.opacity(0.5), lineWidth: 0.5)
        )
      }
    }
  }

  // MARK: - Email Login Form

  private var emailLoginForm: some View {
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
        HStack {
          Text("密码")
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(DesignTokens.Colors.textSecondary)

          Spacer()

          Button {
            // TODO: Implement forgot password
          } label: {
            Text("忘记密码？")
              .font(.caption)
              .foregroundStyle(Color.teal)
          }
        }

        SecureField("输入密码", text: $password)
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

  private var isValidPhoneNumber: Bool {
    let phoneRegex = "^1[3-9]\\d{9}$"
    return phoneNumber.range(of: phoneRegex, options: .regularExpression) != nil
  }

  private var isLoginDisabled: Bool {
    if isLoading { return true }

    switch loginMethod {
    case .phone:
      return phoneNumber.isEmpty || verificationCode.isEmpty || verificationCode.count != 6
    case .email:
      return email.isEmpty || password.isEmpty
    }
  }

  // MARK: - Actions

  private func sendVerificationCode() async {
    guard isValidPhoneNumber else {
      errorMessage = "请输入正确的手机号"
      return
    }

    isSendingCode = true
    errorMessage = nil

    do {
      try await AuthManager.shared.requestVerificationCode(phoneNumber: phoneNumber)
      isCodeSent = true
      startCountdown()
    } catch {
      await MainActor.run {
        errorMessage = error.localizedDescription
      }
    }

    isSendingCode = false
  }

  private func startCountdown() {
    countdown = 60
    countdownTimer?.invalidate()
    countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
      Task { @MainActor in
        if countdown > 0 {
          countdown -= 1
        } else {
          countdownTimer?.invalidate()
        }
      }
    }
  }

  private func handleLogin() async {
    isLoading = true
    errorMessage = nil

    do {
      switch loginMethod {
      case .phone:
        try await AuthManager.shared.signInWithPhone(
          phoneNumber: phoneNumber,
          verificationCode: verificationCode
        )
      case .email:
        try await AuthManager.shared.signIn(email: email, password: password)
      }

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
