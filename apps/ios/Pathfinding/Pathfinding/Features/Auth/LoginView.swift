import SwiftUI
import OSLog

private let authLogger = Logger(subsystem: "org.pathfinding.app", category: "Auth")

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
}

struct LoginView: View {
  @EnvironmentObject private var authViewModel: AuthViewModel
  @Environment(\.dismiss) private var dismiss

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

          // MARK: - Login Method Picker
          Picker("登录方式", selection: $loginMethod) {
            ForEach(LoginMethod.allCases, id: \.self) { method in
              Text(method.title).tag(method)
            }
          }
          .pickerStyle(.segmented)
          .padding(.horizontal, DesignTokens.Spacing.lg)

          // MARK: - Login Form
          VStack(spacing: DesignTokens.Spacing.md) {
            if loginMethod == .phone {
              phoneLoginForm
            } else {
              emailLoginForm
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

            // Login Button - using simple tappable view for debugging
            Text(isLoading ? "登录中..." : "登录 (点我)")
              .fontWeight(.semibold)
              .foregroundStyle(.white)
              .frame(maxWidth: .infinity)
              .padding(.vertical, 14)
              .background(isLoginDisabled ? Color.gray : Color.blue)
              .clipShape(RoundedRectangle(cornerRadius: 12))
              .simultaneousGesture(
                TapGesture()
                  .onEnded { _ in
                    guard !isLoginDisabled else { return }
                    authLogger.error("LOGIN BUTTON TAPPED!")
                    print("🔘🔘🔘 LOGIN BUTTON TAPPED! 🔘🔘🔘")

                    // Show alert to confirm tap is working
                    errorMessage = "按钮已点击，正在登录..."

                    Task {
                      await handleLogin()
                    }
                  }
              )
              .allowsHitTesting(!isLoginDisabled)
              .opacity(isLoginDisabled ? 0.6 : 1.0)
              .padding(.top, DesignTokens.Spacing.xs)

            // Debug info
            #if DEBUG
            VStack(alignment: .leading, spacing: 4) {
              Text(verbatim: "Debug: disabled=\(isLoginDisabled), email=\(email.isEmpty ? "empty" : "filled"), pwd=\(password.isEmpty ? "empty" : "filled"), method=\(loginMethod.rawValue)")
              Text(verbatim: "AuthVM: isAuth=\(authViewModel.isAuthenticated), isLoading=\(authViewModel.isLoading), isGuest=\(authViewModel.isGuestMode)")
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            #endif
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
            // WeChat Sign In
            Button {
              Task {
                await handleSocialLogin(.wechat)
              }
            } label: {
              HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "message.fill")
                  .font(.title3)
                Text("使用微信登录")
                  .fontWeight(.medium)
              }
              .frame(maxWidth: .infinity)
              .padding(.vertical, DesignTokens.Spacing.sm)
              .background(Color(red: 0.07, green: 0.73, blue: 0.31)) // WeChat green
              .foregroundStyle(.white)
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
            authViewModel.continueAsGuest()
          }
          .foregroundStyle(.secondary)
        }
      }
      .sheet(isPresented: $showSignup) {
        SignupView()
      }
      .onDisappear {
        countdownTimer?.invalidate()
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

        HStack {
          Text("+86")
            .foregroundStyle(.secondary)
            .padding(.leading, DesignTokens.Spacing.sm)

          Divider()
            .frame(height: 20)

          TextField("输入手机号", text: $phoneNumber)
            .textInputAutocapitalization(.never)
            .keyboardType(.phonePad)
            .autocorrectionDisabled()
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .padding(.horizontal, DesignTokens.Spacing.xs)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
      }

      // Verification Code Field
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
        Text("验证码")
          .font(.subheadline)
          .fontWeight(.medium)

        HStack {
          TextField("输入验证码", text: $verificationCode)
            .textInputAutocapitalization(.never)
            .keyboardType(.numberPad)
            .autocorrectionDisabled()
            .padding()

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
              Text(countdown > 0 ? "\(countdown)s 后重发" : "获取验证码")
                .font(.subheadline)
                .fontWeight(.medium)
                .frame(width: 100)
            }
          }
          .disabled(countdown > 0 || !isValidPhoneNumber || isSendingCode)
          .foregroundStyle(countdown > 0 || !isValidPhoneNumber ? .secondary : Color.accentColor)
          .padding(.trailing, DesignTokens.Spacing.sm)
        }
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
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

      // Forgot Password
      HStack {
        Spacer()
        Button {
          // TODO: Implement forgot password
        } label: {
          Text("忘记密码？")
            .font(.subheadline)
            .foregroundStyle(Color.accentColor)
        }
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
    print("🔐 handleLogin() called - loginMethod: \(loginMethod)")
    isLoading = true
    errorMessage = nil

    do {
      switch loginMethod {
      case .phone:
        print("🔐 Calling signInWithPhone...")
        try await AuthManager.shared.signInWithPhone(
          phoneNumber: phoneNumber,
          verificationCode: verificationCode
        )
      case .email:
        print("🔐 Calling signIn with email: \(email)")
        try await AuthManager.shared.signIn(email: email, password: password)
      }

      print("🔐 Auth successful, updating state...")

      // Check auth state before update
      let isAuthBefore = await AuthManager.shared.isAuthenticated
      print("🔐 isAuthenticated BEFORE update: \(isAuthBefore)")

      // Update auth state to trigger UI refresh
      await authViewModel.updateAuthState()

      // Check auth state after update
      print("🔐 authViewModel.isAuthenticated AFTER update: \(authViewModel.isAuthenticated)")

      await MainActor.run {
        isLoading = false
        // Dismiss the login view if presented as sheet
        dismiss()
      }
      print("🔐 Login complete!")
      // No need to dismiss - the app will automatically show ContentView
    } catch {
      print("🔐 Login error: \(error)")
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
