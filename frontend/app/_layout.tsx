import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set");
  }

  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.finalneon.app" // Update with your merchant identifier
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(users)" />
        <Stack.Screen name="(owners)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </StripeProvider>
  );
}
