import { StyleSheet, Text, View } from 'react-native';

/**
 * Explore tab - placeholder for community itineraries
 */
export default function Explore() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>发现攻略</Text>
      <Text style={styles.subtitle}>探索热门旅行攻略</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
