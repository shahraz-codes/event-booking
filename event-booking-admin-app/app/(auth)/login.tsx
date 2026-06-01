import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ActionButton from "@/components/ActionButton";
import { APP_NAME } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign in failed. Please retry."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-6">
            <Text className="text-3xl font-extrabold text-gray-900">
              {APP_NAME}
            </Text>
            <Text className="text-base text-gray-600 mt-1">
              Admin sign in
            </Text>

            <View className="mt-8 gap-4">
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                  Email
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  placeholder="you@arbanquets.com"
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1.5">
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="current-password"
                  textContentType="password"
                  placeholder="••••••••"
                  className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                />
              </View>

              {error ? (
                <Text className="text-red-600 text-sm">{error}</Text>
              ) : null}

              <ActionButton
                label="Sign in"
                onPress={handleSubmit}
                loading={submitting}
                fullWidth
              />
            </View>

            <Text className="text-xs text-gray-500 mt-6 text-center">
              You must already be added to the admin_users table in Supabase.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
