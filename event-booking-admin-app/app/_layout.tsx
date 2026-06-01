import "../global.css";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider, useAuth } from "@/lib/auth-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate() {
  const { session, isAdmin, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const segs = segments as readonly string[];
    const first = segs[0];
    const inAuthGroup = first === "(auth)";
    const inAdminGroup = first === "(admin)";
    const signedIn = !!session && isAdmin;

    if (!signedIn && inAdminGroup) {
      router.replace("/(auth)/login");
    } else if (signedIn && (inAuthGroup || segs.length === 0)) {
      router.replace("/(admin)");
    } else if (!!session && !isAdmin && inAdminGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, isAdmin, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthGate />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(admin)" />
            </Stack>
            <StatusBar style="dark" />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
