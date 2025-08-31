// /mobile/src/app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(owners)" />
        <Stack.Screen name="(users)" />
        <Stack.Screen name="(auth)" />
      </Stack>
  );
}
