import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',
      }}
    >
      <Stack.Screen name="new" />
      <Stack.Screen name="[sessionId]" />
    </Stack>
  );
}
