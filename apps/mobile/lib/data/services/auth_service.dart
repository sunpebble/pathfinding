import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/user.dart';
import 'api_client.dart';

part 'auth_service.g.dart';

/// Auth service for handling authentication
class AuthService {
  final SupabaseClient _supabase;

  AuthService(this._supabase);

  /// Get current user
  User? get currentUser => _supabase.auth.currentUser;

  /// Get current session
  Session? get currentSession => _supabase.auth.currentSession;

  /// Check if user is authenticated
  bool get isAuthenticated => currentSession != null;

  /// Stream of auth state changes
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  /// Sign in with phone number (sends OTP)
  Future<void> signInWithPhone(String phone) async {
    await _supabase.auth.signInWithOtp(phone: phone);
  }

  /// Verify OTP
  Future<AuthResponse> verifyOtp(String phone, String otp) async {
    return await _supabase.auth.verifyOTP(
      phone: phone,
      token: otp,
      type: OtpType.sms,
    );
  }

  /// Sign in with email and password
  Future<AuthResponse> signInWithEmail(String email, String password) async {
    return await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  /// Sign up with email and password
  Future<AuthResponse> signUpWithEmail(String email, String password) async {
    return await _supabase.auth.signUp(email: email, password: password);
  }

  /// Sign out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  /// Get user profile
  Future<UserProfile?> getUserProfile() async {
    final user = currentUser;
    if (user == null) return null;

    final response = await _supabase
        .from('profiles')
        .select()
        .eq('id', user.id)
        .maybeSingle();

    if (response == null) return null;

    return UserProfile(
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: response['display_name'] as String?,
      avatarUrl: response['avatar_url'] as String?,
      bio: response['bio'] as String?,
      createdAt: DateTime.parse(user.createdAt),
    );
  }
}

/// Auth service provider
@riverpod
AuthService authService(Ref ref) {
  return AuthService(ref.watch(supabaseProvider));
}

/// Current user provider
@riverpod
Stream<AuthState> authStateChanges(Ref ref) {
  return ref.watch(authServiceProvider).authStateChanges;
}

/// Is authenticated provider
@riverpod
bool isAuthenticated(Ref ref) {
  return ref.watch(authServiceProvider).isAuthenticated;
}
