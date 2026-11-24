import GlobalIncomingCall from "@/components/global-incoming-call";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />

      <GlobalIncomingCall />
    </>
  );
}
