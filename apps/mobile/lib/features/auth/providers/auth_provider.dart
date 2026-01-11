import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../data/models/user.dart';
import '../../../data/services/auth_service.dart';

part 'auth_provider.g.dart';

/// Auth state
enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  error,
}

/// Auth state notifier
@riverpod
class AuthNotifier extends _$AuthNotifier {
  @override
  AsyncValue<AuthStatus> build() {
    // Listen to auth state changes
    ref.listen(authStateChangesProvider, (previous, next) {
      next.when(
        data: (authState) {
          if (authState.session != null) {
            state = const AsyncValue.data(AuthStatus.authenticated);
          } else {
            state = const AsyncValue.data(AuthStatus.unauthenticated);
          }
        },
        error: (error, stack) {
          state = AsyncValue.error(error, stack);
        },
        loading: () {
          state = const AsyncValue.loading();
        },
      );
    });

    // Check initial auth state
    final authService = ref.read(authServiceProvider);
    if (authService.isAuthenticated) {
      return const AsyncValue.data(AuthStatus.authenticated);
    }
    return const AsyncValue.data(AuthStatus.unauthenticated);
  }

  /// Sign in with phone number
  Future<bool> signInWithPhone(String phone) async {
    state = const AsyncValue.loading();
    try {
      await ref.read(authServiceProvider).signInWithPhone(phone);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Verify OTP
  Future<bool> verifyOtp(String phone, String otp) async {
    state = const AsyncValue.loading();
    try {
      await ref.read(authServiceProvider).verifyOtp(phone, otp);
      state = const AsyncValue.data(AuthStatus.authenticated);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Sign in with email
  Future<bool> signInWithEmail(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await ref.read(authServiceProvider).signInWithEmail(email, password);
      state = const AsyncValue.data(AuthStatus.authenticated);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Sign up with email
  Future<bool> signUpWithEmail(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await ref.read(authServiceProvider).signUpWithEmail(email, password);
      state = const AsyncValue.data(AuthStatus.authenticated);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await ref.read(authServiceProvider).signOut();
      state = const AsyncValue.data(AuthStatus.unauthenticated);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

/// Current user profile provider
@riverpod
Future<UserProfile?> userProfile(Ref ref) async {
  return ref.watch(authServiceProvider).getUserProfile();
}
