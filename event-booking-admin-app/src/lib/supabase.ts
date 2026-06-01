import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * SecureStore caps each value at ~2KB. Supabase session JSON can occasionally
 * exceed that with provider metadata, so we fall back to AsyncStorage on
 * native when values are too large to avoid `set value` errors.
 */
const SECURE_STORE_BYTE_LIMIT = 2000;

const hybridStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) return value;
    } catch {
      // fall through to AsyncStorage
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (value.length < SECURE_STORE_BYTE_LIMIT) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch {
        // fall through
      }
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: hybridStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
