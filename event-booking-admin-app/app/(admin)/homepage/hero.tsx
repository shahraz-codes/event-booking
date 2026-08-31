import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import ActionButton from "@/components/ActionButton";
import MediaPicker from "@/components/MediaPicker";
import Section from "@/components/Section";
import {
  getHero,
  upsertHero,
  type HeroSection,
  type MediaFile,
} from "@/services/homepage";

export default function HeroEditorScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: hero, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hero"],
    queryFn: getHero,
  });

  const [subtitle, setSubtitle] = useState("");
  const [heading, setHeading] = useState("");
  const [highlight, setHighlight] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<MediaFile | null>(null);

  useEffect(() => {
    if (hero) {
      setSubtitle(hero.subtitle);
      setHeading(hero.heading);
      setHighlight(hero.headingHighlight);
      setDescription(hero.description);
      setLogo(hero.logoMedia ?? null);
    }
  }, [hero?.id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertHero({
        subtitle: subtitle.trim(),
        heading: heading.trim(),
        headingHighlight: highlight.trim(),
        description: description.trim(),
        logoUrl: logo?.url ?? null,
        logoMediaFileId: logo?.id ?? null,
      }),
    onSuccess: (saved: HeroSection) => {
      qc.setQueryData(["hero"], saved);
      Alert.alert("Saved", "Hero updated.");
      router.back();
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  function onSave() {
    if (
      !subtitle.trim() ||
      !heading.trim() ||
      !highlight.trim() ||
      !description.trim()
    ) {
      Alert.alert("Missing", "All text fields are required.");
      return;
    }
    saveMutation.mutate();
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-red-600 text-center mb-3">
          Couldn&apos;t load hero.{"\n"}
          {error instanceof Error ? error.message : "Unknown error"}
        </Text>
        <ActionButton label="Retry" variant="secondary" onPress={() => refetch()} />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false, title: "Hero" }} />
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
          <View className="flex-row items-center mb-3">
            <Pressable
              onPress={() => router.back()}
              className="px-2 py-1 rounded bg-gray-200 active:bg-gray-300"
            >
              <Text className="text-sm font-semibold text-gray-700">‹ Back</Text>
            </Pressable>
            <Text className="ml-3 text-sm font-semibold text-gray-700">
              Hero section
            </Text>
          </View>

          <Section title="Logo">
            <MediaPicker
              current={logo}
              onPicked={setLogo}
              label="Logo image (optional)"
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

          <Section title="Copy">
            <View className="gap-3">
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Subtitle
                </Text>
                <TextInput
                  value={subtitle}
                  onChangeText={setSubtitle}
                  placeholder="e.g. Banquet & Event Bookings"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Heading
                </Text>
                <TextInput
                  value={heading}
                  onChangeText={setHeading}
                  placeholder="e.g. Make Your Moments"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Heading highlight (coloured part)
                </Text>
                <TextInput
                  value={highlight}
                  onChangeText={setHighlight}
                  placeholder="e.g. Unforgettable"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                />
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-700 mb-1">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="A short paragraph under the heading."
                  multiline
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 min-h-[80px]"
                />
              </View>
            </View>
          </Section>

          <View className="h-3" />

          <ActionButton
            label="Save hero"
            variant="primary"
            onPress={onSave}
            loading={saveMutation.isPending}
            fullWidth
          />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
