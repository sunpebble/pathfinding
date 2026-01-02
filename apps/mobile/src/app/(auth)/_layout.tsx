import { Stack } from 'expo-router';

/**
 * Auth routes layout - no header, modal presentation
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
  );
}
