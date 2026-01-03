import { Stack } from 'expo-router';
import { POIRecommendScreen } from '@/screens/poi/POIRecommendScreen';

export default function POIRecommendRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '推荐',
          headerBackTitle: '返回',
        }}
      />
      <POIRecommendScreen />
    </>
  );
}
