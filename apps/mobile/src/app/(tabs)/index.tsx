import { View, Text, StyleSheet } from "react-native";

/**
 * My Itineraries tab - placeholder for ItineraryListScreen
 */
export default function MyItineraries() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>我的攻略</Text>
      <Text style={styles.subtitle}>您还没有创建任何攻略</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
