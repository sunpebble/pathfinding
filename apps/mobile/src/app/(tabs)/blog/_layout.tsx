import { Stack } from 'expo-router';

/**
 * Blog stack layout for nested navigation
 */
export default function BlogLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: '返回',
        headerTintColor: '#007AFF',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '旅行博文',
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: '博文详情',
        }}
      />
    </Stack>
  );
}
