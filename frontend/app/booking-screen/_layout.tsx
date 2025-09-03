import { Stack } from "expo-router";

export default function BookingScreenLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="dates" />
      <Stack.Screen name="advertisement" />
      <Stack.Screen name="confirmation" />
    </Stack>
  );
}