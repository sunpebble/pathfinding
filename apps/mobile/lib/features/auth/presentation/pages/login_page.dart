import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../providers/auth_provider.dart';

/// Login page with email/password and phone OTP options
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();

  bool _isPhoneLogin = false;
  bool _showOtpInput = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleEmailLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref
        .read(authNotifierProvider.notifier)
        .signInWithEmail(
          _emailController.text.trim(),
          _passwordController.text,
        );

    setState(() => _isLoading = false);

    if (success && mounted) {
      context.go('/');
    } else {
      setState(() {
        _errorMessage = '登录失败，请检查邮箱和密码';
      });
    }
  }

  Future<void> _handlePhoneLogin() async {
    if (_phoneController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref
        .read(authNotifierProvider.notifier)
        .signInWithPhone(_phoneController.text.trim());

    setState(() => _isLoading = false);

    if (success) {
      setState(() => _showOtpInput = true);
    } else {
      setState(() {
        _errorMessage = '发送验证码失败';
      });
    }
  }

  Future<void> _handleVerifyOtp() async {
    if (_otpController.text.isEmpty) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await ref
        .read(authNotifierProvider.notifier)
        .verifyOtp(_phoneController.text.trim(), _otpController.text.trim());

    setState(() => _isLoading = false);

    if (success && mounted) {
      context.go('/');
    } else {
      setState(() {
        _errorMessage = '验证码错误';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 60),

              // Logo and title
              Icon(Icons.explore, size: 80, color: AppColors.primary),
              const SizedBox(height: 16),
              Text(
                'Pathfinding',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.displaySmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '探索世界，规划旅程',
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
              ),

              const SizedBox(height: 48),

              // Toggle between email and phone login
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(
                    value: false,
                    label: Text('邮箱登录'),
                    icon: Icon(Icons.email_outlined),
                  ),
                  ButtonSegment(
                    value: true,
                    label: Text('手机登录'),
                    icon: Icon(Icons.phone_outlined),
                  ),
                ],
                selected: {_isPhoneLogin},
                onSelectionChanged: (selected) {
                  setState(() {
                    _isPhoneLogin = selected.first;
                    _showOtpInput = false;
                    _errorMessage = null;
                  });
                },
              ),

              const SizedBox(height: 24),

              // Error message
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: TextStyle(color: AppColors.error),
                    textAlign: TextAlign.center,
                  ),
                ),

              if (_errorMessage != null) const SizedBox(height: 16),

              // Email login form
              if (!_isPhoneLogin)
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: '邮箱',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '请输入邮箱';
                          }
                          if (!value.contains('@')) {
                            return '请输入有效的邮箱地址';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: '密码',
                          prefixIcon: Icon(Icons.lock_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '请输入密码';
                          }
                          if (value.length < 6) {
                            return '密码至少6位';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: AdaptiveButton(
                          onPressed: _isLoading ? null : _handleEmailLogin,
                          child: _isLoading
                              ? const CupertinoActivityIndicator(
                                  color: Colors.white,
                                )
                              : const Text('登录'),
                        ),
                      ),
                    ],
                  ),
                ),

              // Phone login form
              if (_isPhoneLogin)
                Column(
                  children: [
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      enabled: !_showOtpInput,
                      decoration: const InputDecoration(
                        labelText: '手机号',
                        prefixIcon: Icon(Icons.phone_outlined),
                        prefixText: '+86 ',
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_showOtpInput)
                      TextField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: '验证码',
                          prefixIcon: Icon(Icons.pin_outlined),
                        ),
                      ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _isLoading
                            ? null
                            : (_showOtpInput
                                  ? _handleVerifyOtp
                                  : _handlePhoneLogin),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(_showOtpInput ? '验证' : '获取验证码'),
                      ),
                    ),
                    if (_showOtpInput)
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _showOtpInput = false;
                            _otpController.clear();
                          });
                        },
                        child: const Text('重新获取验证码'),
                      ),
                  ],
                ),

              const SizedBox(height: 24),

              // Skip login for development
              OutlinedButton(
                onPressed: () => context.go('/'),
                child: const Text('跳过登录（开发模式）'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
