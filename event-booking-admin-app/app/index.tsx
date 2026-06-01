import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/lib/auth-context";

export default function IndexRedirect() {
  const { session, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session && isAdmin) {
      router.replace("/(admin)");
    } else {
      router.replace("/(auth)/login");
    }
  }, [session, isAdmin, loading, router]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" />
    </View>
  );
}
