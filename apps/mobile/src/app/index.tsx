import { Redirect } from "expo-router";
import { useAuth } from "../providers/AuthProvider";
import { ActivityIndicator, View } from "react-native";

/**
 * Root index - redirects to appropriate route based on auth state
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
