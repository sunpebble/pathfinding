import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../providers/AuthProvider";

/**
 * Login screen - placeholder for auth UI
 */
export default function LoginScreen() {
  const { signInWithOAuth } = useAuth();

  const handleSignIn = async () => {
    // TODO: Implement actual sign in
    await signInWithOAuth("google");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>探路</Text>
        <Text style={styles.subtitle}>智能旅行攻略助手</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleSignIn}>
          <Text style={styles.buttonText}>使用 Google 登录</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
