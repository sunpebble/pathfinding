import { router } from 'expo-router';
import { useState } from 'react';
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
 * Login screen - Phone number authentication (production)
 * or Email/Password authentication (development with local Supabase)
 */
export default function LoginScreen() {
  const {
    signInWithPhone,
    signInWithEmail,
    signUpWithEmail,
    verifyOtp,
    isLoading,
    error,
    clearError,
    isDevelopment,
  } = useAuth();

  // Phone login state (production)
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Email login state (development)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Development mode: Email/Password login
  const handleEmailLogin = async () => {
    if (!email.trim()) {
      Alert.alert('提示', '请输入邮箱');
      return;
    }
    if (!password.trim()) {
      Alert.alert('提示', '请输入密码');
      return;
    }

    clearError();

    if (isSignUp) {
      const result = await signUpWithEmail(email, password);
      if (result.success) {
        // After signup, auto login
        const loginResult = await signInWithEmail(email, password);
        if (loginResult.success) {
          router.replace('/(tabs)');
        }
      }
    } else {
      const result = await signInWithEmail(email, password);
      if (result.success) {
        router.replace('/(tabs)');
      }
    }
  };

  // Production mode: Phone OTP login
  const handleSendOtp = async () => {
    if (!phone.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    clearError();
    const result = await signInWithPhone(phone);

    if (result.needsVerification) {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('提示', '请输入验证码');
      return;
    }

    clearError();
    await verifyOtp(phone, otp);
    router.replace('/(tabs)');
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    clearError();
  };

  // Development mode: Email/Password form
  if (isDevelopment) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>探路</Text>
          <Text style={styles.subtitle}>智能旅行攻略助手</Text>

          <View style={styles.devBanner}>
            <Text style={styles.devText}>
              开发模式：使用邮箱密码登录本地 Supabase
            </Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          )}

          <Text style={styles.label}>邮箱</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入邮箱"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
            autoFocus
          />

          <Text style={styles.label}>密码</Text>
          <TextInput
            style={styles.input}
            placeholder="请输入密码"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? '注册' : '登录'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              clearError();
            }}
          >
            <Text style={styles.switchText}>
              {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Production mode: Phone OTP form
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
              placeholder="请输入验证码"
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
                <Text style={styles.buttonText}>验证</Text>
              )}
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
  devBanner: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
  },
  devText: {
    color: '#856404',
    fontSize: 12,
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
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
