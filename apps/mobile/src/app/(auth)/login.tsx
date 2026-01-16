import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Login screen - Phone number OTP authentication
 */
export default function LoginScreen() {
  const { signInWithPhone, verifyOtp, isLoading, error, clearError } =
    useAuth();

  // Phone login state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, [cooldown > 0]);

  const handleSendOtp = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    // Basic phone number validation
    if (
      !/^1[3-9]\d{9}$/.test(trimmedPhone) &&
      !/^\+861[3-9]\d{9}$/.test(trimmedPhone)
    ) {
      Alert.alert('提示', '请输入有效的中国大陆手机号');
      return;
    }

    clearError();
    const result = await signInWithPhone(trimmedPhone);

    if (result.needsVerification) {
      setStep('otp');
      if (result.cooldown) {
        setCooldown(result.cooldown);
      }
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0) return;

    clearError();
    const result = await signInWithPhone(phone);

    if (result.needsVerification && result.cooldown) {
      setCooldown(result.cooldown);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('提示', '请输入验证码');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('提示', '验证码必须是6位数字');
      return;
    }

    clearError();
    try {
      const result = await verifyOtp(phone, otp);
      if (result.isNewUser) {
        // New user - could show onboarding or welcome message
        Alert.alert('欢迎', '注册成功！', [
          { text: '开始探索', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      // Error is already handled by AuthProvider and displayed in UI
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setCooldown(0);
    clearError();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>探路</Text>
        <Text style={styles.subtitle}>智能旅行攻略助手</Text>
      </View>

      <View style={styles.formContainer}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}

        {step === 'phone' ? (
          <>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入手机号"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!isLoading}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>获取验证码</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backText}>← 返回</Text>
            </TouchableOpacity>

            <Text style={styles.label}>验证码</Text>
            <Text style={styles.hint}>验证码已发送至 {phone}</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入6位验证码"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              editable={!isLoading}
              autoFocus
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>验证并登录</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resendButton,
                cooldown > 0 && styles.resendButtonDisabled,
              ]}
              onPress={handleResendOtp}
              disabled={cooldown > 0 || isLoading}
            >
              <Text
                style={[
                  styles.resendText,
                  cooldown > 0 && styles.resendTextDisabled,
                ]}
              >
                {cooldown > 0 ? `${cooldown}秒后可重新获取` : '重新获取验证码'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
  },
  resendTextDisabled: {
    color: '#999',
  },
});
