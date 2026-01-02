import { Stack } from "expo-router";

/**
 * Itinerary stack layout for nested navigation
 */
export default function ItineraryLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "返回",
        headerTintColor: "#007AFF",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "我的攻略",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "创建行程",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "行程详情",
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: "编辑行程",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="add-poi"
        options={{
          title: "添加景点",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
