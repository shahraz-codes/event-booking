import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import MediaPicker from "@/components/MediaPicker";
import Section from "@/components/Section";
import { APP_NAME } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import type { MediaFile } from "@/services/homepage";
import {
  PRESET_KEYS,
  getSiteSettings,
  isValidHex,
  updateSiteSettings,
  type PresetKey,
  type SiteSettings,
} from "@/services/site-settings";

interface Form {
  themeMode: "PRESET" | "CUSTOM";
  themePreset: PresetKey;
  themePrimaryHex: string;
  themeAccentHex: string;
  instagramEnabled: boolean;
  instagramUrl: string;
  mapsEnabled: boolean;
  mapsEmbedUrl: string;
  mapsLinkUrl: string;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  addressLine1: string;
  addressLine2: string;
  contactPhone: string;
  contactEmail: string;
  aboutBlurb: string;
  metaDescription: string;
  logoUrl: string | null;
  logoMediaFileId: string | null;
}

function logoStub(s: SiteSettings): MediaFile | null {
  if (!s.logoMediaFileId || !s.logoUrl) return null;
  return {
    id: s.logoMediaFileId,
    url: s.logoUrl,
    publicId: "",
    fileName: "",
    fileSize: 0,
    mimeType: "image/*",
    resourceType: "image",
    width: null,
    height: null,
    createdAt: "",
  };
}

function fromSettings(s: SiteSettings): Form {
  return {
    themeMode: s.themeMode,
    themePreset: s.themePreset,
    themePrimaryHex: s.themePrimaryHex ?? "",
    themeAccentHex: s.themeAccentHex ?? "",
    instagramEnabled: s.instagramEnabled,
    instagramUrl: s.instagramUrl ?? "",
    mapsEnabled: s.mapsEnabled,
    mapsEmbedUrl: s.mapsEmbedUrl ?? "",
    mapsLinkUrl: s.mapsLinkUrl ?? "",
    whatsappEnabled: s.whatsappEnabled,
    whatsappPhone: s.whatsappPhone ?? "",
    addressLine1: s.addressLine1 ?? "",
    addressLine2: s.addressLine2 ?? "",
    contactPhone: s.contactPhone ?? "",
    contactEmail: s.contactEmail ?? "",
    aboutBlurb: s.aboutBlurb ?? "",
    metaDescription: s.metaDescription ?? "",
    logoUrl: s.logoUrl ?? null,
    logoMediaFileId: s.logoMediaFileId ?? null,
  };
}

function toSettings(f: Form): SiteSettings {
  return {
    themeMode: f.themeMode,
    themePreset: f.themePreset,
    themePrimaryHex: f.themePrimaryHex.trim() || null,
    themeAccentHex: f.themeAccentHex.trim() || null,
    instagramEnabled: f.instagramEnabled,
    instagramUrl: f.instagramUrl.trim() || null,
    mapsEnabled: f.mapsEnabled,
    mapsEmbedUrl: f.mapsEmbedUrl.trim() || null,
    mapsLinkUrl: f.mapsLinkUrl.trim() || null,
    whatsappEnabled: f.whatsappEnabled,
    whatsappPhone: f.whatsappPhone.trim() || null,
    addressLine1: f.addressLine1.trim() || null,
    addressLine2: f.addressLine2.trim() || null,
    contactPhone: f.contactPhone.trim() || null,
    contactEmail: f.contactEmail.trim() || null,
    aboutBlurb: f.aboutBlurb.trim() || null,
    metaDescription: f.metaDescription.trim() || null,
    logoUrl: f.logoUrl,
    logoMediaFileId: f.logoMediaFileId,
  };
}

const PRESET_COLORS: Record<PresetKey, string> = {
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  teal: "#14b8a6",
};

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const qc = useQueryClient();

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["site-settings"],
    queryFn: getSiteSettings,
  });

  const [form, setForm] = useState<Form | null>(null);
  const [logo, setLogo] = useState<MediaFile | null>(null);

  useEffect(() => {
    if (settings) {
      setForm(fromSettings(settings));
      setLogo(logoStub(settings));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSiteSettings(
        toSettings({
          ...form!,
          logoUrl: logo?.url ?? null,
          logoMediaFileId: logo?.id ?? null,
        })
      ),
    onSuccess: (saved) => {
      qc.setQueryData(["site-settings"], saved);
      Alert.alert("Saved", "Site settings updated.");
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    if (!form) return;
    setForm({ ...form, [key]: value });
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "You will need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  function validate(): string | null {
    if (!form) return "Form not ready";
    if (form.themeMode === "CUSTOM") {
      if (!form.themePrimaryHex || !isValidHex(form.themePrimaryHex)) {
        return "Custom theme requires a valid primary hex (e.g. #dd5616)";
      }
      if (form.themeAccentHex && !isValidHex(form.themeAccentHex)) {
        return "Accent hex must be a valid colour";
      }
    }
    if (form.instagramEnabled && !form.instagramUrl.trim()) {
      return "Instagram URL is required when Instagram is enabled";
    }
    if (form.mapsEnabled && !form.mapsEmbedUrl.trim()) {
      return "Maps embed URL is required when Maps is enabled";
    }
    if (form.whatsappEnabled) {
      if (!form.whatsappPhone.trim() || !/^91\d{10}$/.test(form.whatsappPhone.trim())) {
        return "WhatsApp phone must be 91XXXXXXXXXX (12 digits)";
      }
    }
    if (
      form.contactPhone.trim() &&
      !/^\+91 \d{5} \d{5}$/.test(form.contactPhone.trim())
    ) {
      return "Contact phone must be formatted as +91 XXXXX XXXXX";
    }
    if (
      form.contactEmail.trim() &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail.trim())
    ) {
      return "Contact email must be a valid email";
    }
    return null;
  }

  function onSave() {
    const err = validate();
    if (err) {
      Alert.alert("Fix this first", err);
      return;
    }
    saveMutation.mutate();
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-red-600 text-center mb-3">
          Couldn&apos;t load settings.{"\n"}
          {error instanceof Error ? error.message : "Unknown error"}
        </Text>
        <ActionButton label="Retry" variant="secondary" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  if (isLoading || !form) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-200">
        <Text className="text-2xl font-extrabold text-gray-900">Settings</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{APP_NAME} admin</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
          <Section title="Signed in as">
            <Text className="text-sm text-gray-700">
              {session?.user?.email ?? "—"}
            </Text>
            <View className="h-3" />
            <ActionButton
              label="Sign out"
              variant="danger"
              onPress={confirmSignOut}
              fullWidth
            />
          </Section>

          <View className="h-3" />

          <Section
            title="Site logo"
            subtitle="Shown in the public site header. Falls back to the default when unset."
          >
            <MediaPicker
              current={logo}
              onPicked={setLogo}
              label="Header logo (optional)"
              aspect="square"
            />
            {logo ? (
              <Pressable
                onPress={() => setLogo(null)}
                className="self-start mt-2 px-3 py-1.5 rounded-lg bg-red-100 active:bg-red-200"
              >
                <Text className="text-xs font-bold text-red-700">
                  Remove logo
                </Text>
              </Pressable>
            ) : null}
          </Section>

          <View className="h-3" />

          <Section
            title="Theme"
            subtitle="Drives the public site's colour palette."
          >
            <View className="flex-row gap-2 mb-3">
              {(["PRESET", "CUSTOM"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => set("themeMode", mode)}
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    form.themeMode === mode
                      ? "bg-brand-600 border-brand-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold text-center ${
                      form.themeMode === mode ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {mode === "PRESET" ? "Use preset" : "Custom colours"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {form.themeMode === "PRESET" ? (
              <View className="flex-row flex-wrap gap-2">
                {PRESET_KEYS.map((k) => {
                  const active = form.themePreset === k;
                  return (
                    <Pressable
                      key={k}
                      onPress={() => set("themePreset", k)}
                      className={`px-3 py-2 rounded-lg flex-row items-center gap-2 border ${
                        active
                          ? "border-brand-600 bg-brand-50"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: PRESET_COLORS[k],
                        }}
                      />
                      <Text
                        className={`text-xs font-semibold ${
                          active ? "text-brand-700" : "text-gray-700"
                        }`}
                      >
                        {k}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="gap-2">
                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1">
                    Primary hex
                  </Text>
                  <TextInput
                    value={form.themePrimaryHex}
                    onChangeText={(t) => set("themePrimaryHex", t)}
                    placeholder="#dd5616"
                    autoCapitalize="none"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                  />
                </View>
                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1">
                    Accent hex (optional)
                  </Text>
                  <TextInput
                    value={form.themeAccentHex}
                    onChangeText={(t) => set("themeAccentHex", t)}
                    placeholder="#f08c44"
                    autoCapitalize="none"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                  />
                </View>
              </View>
            )}
          </Section>

          <View className="h-3" />

          <Section title="Contact info">
            <View className="gap-2">
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Address line 1
                </Text>
                <TextInput
                  value={form.addressLine1}
                  onChangeText={(t) => set("addressLine1", t)}
                  placeholder="123 Main St"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Address line 2
                </Text>
                <TextInput
                  value={form.addressLine2}
                  onChangeText={(t) => set("addressLine2", t)}
                  placeholder="City, State, PIN"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Phone (display format)
                </Text>
                <TextInput
                  value={form.contactPhone}
                  onChangeText={(t) => set("contactPhone", t)}
                  placeholder="+91 XXXXX XXXXX"
                  keyboardType="phone-pad"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Email
                </Text>
                <TextInput
                  value={form.contactEmail}
                  onChangeText={(t) => set("contactEmail", t)}
                  placeholder="bookings@arbanquets.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
            </View>
          </Section>

          <View className="h-3" />

          <Section title="WhatsApp">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-gray-700">
                Show WhatsApp floating button
              </Text>
              <Switch
                value={form.whatsappEnabled}
                onValueChange={(v) => set("whatsappEnabled", v)}
              />
            </View>
            {form.whatsappEnabled ? (
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  WhatsApp number (91XXXXXXXXXX, 12 digits)
                </Text>
                <TextInput
                  value={form.whatsappPhone}
                  onChangeText={(t) =>
                    set("whatsappPhone", t.replace(/[^0-9]/g, ""))
                  }
                  placeholder="919876543210"
                  keyboardType="number-pad"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
            ) : null}
          </Section>

          <View className="h-3" />

          <Section title="Instagram">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-gray-700">Show Instagram link</Text>
              <Switch
                value={form.instagramEnabled}
                onValueChange={(v) => set("instagramEnabled", v)}
              />
            </View>
            {form.instagramEnabled ? (
              <TextInput
                value={form.instagramUrl}
                onChangeText={(t) => set("instagramUrl", t)}
                placeholder="https://www.instagram.com/arbanquets/"
                autoCapitalize="none"
                keyboardType="url"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
              />
            ) : null}
          </Section>

          <View className="h-3" />

          <Section title="Google Maps">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-gray-700">Show map on site</Text>
              <Switch
                value={form.mapsEnabled}
                onValueChange={(v) => set("mapsEnabled", v)}
              />
            </View>
            {form.mapsEnabled ? (
              <View className="gap-2">
                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1">
                    Embed URL (from Google Maps → Share → Embed map)
                  </Text>
                  <TextInput
                    value={form.mapsEmbedUrl}
                    onChangeText={(t) => set("mapsEmbedUrl", t)}
                    placeholder="https://www.google.com/maps/embed?..."
                    autoCapitalize="none"
                    multiline
                    className="border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 min-h-[60px]"
                  />
                </View>
                <View>
                  <Text className="text-xs font-semibold text-gray-700 mb-1">
                    Directions URL (optional)
                  </Text>
                  <TextInput
                    value={form.mapsLinkUrl}
                    onChangeText={(t) => set("mapsLinkUrl", t)}
                    placeholder="https://maps.app.goo.gl/..."
                    autoCapitalize="none"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                  />
                </View>
              </View>
            ) : null}
          </Section>

          <View className="h-3" />

          <Section title="About & SEO">
            <View className="gap-2">
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  About blurb
                </Text>
                <TextInput
                  value={form.aboutBlurb}
                  onChangeText={(t) => set("aboutBlurb", t)}
                  placeholder="Short paragraph about the venue / business."
                  multiline
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 min-h-[100px]"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Meta description (for search engines)
                </Text>
                <TextInput
                  value={form.metaDescription}
                  onChangeText={(t) => set("metaDescription", t)}
                  placeholder="Plan weddings, receptions and corporate events at AR Banquets."
                  multiline
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 min-h-[80px]"
                />
              </View>
            </View>
          </Section>

          <View className="h-3" />

          <ActionButton
            label="Save all settings"
            variant="primary"
            onPress={onSave}
            loading={saveMutation.isPending}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
