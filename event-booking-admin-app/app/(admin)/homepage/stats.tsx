import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import Section from "@/components/Section";
import {
  createStatItem,
  deleteStatItem,
  listStats,
  updateStatItem,
  type StatItem,
} from "@/services/homepage";

export default function StatsScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: items, isLoading, isError, error } = useQuery({
    queryKey: ["stats"],
    queryFn: listStats,
  });

  const [value, setValue] = useState("");
  const [suffix, setSuffix] = useState("");
  const [label, setLabel] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createStatItem({
        value: parseInt(value, 10),
        suffix: suffix.trim(),
        label: label.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stats"] });
      setValue("");
      setSuffix("");
      setLabel("");
      Alert.alert("Added", "Stat added.");
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      updateStatItem(id, { visible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStatItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stats"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  function confirmDelete(item: StatItem) {
    Alert.alert("Remove stat?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(item.id),
      },
    ]);
  }

  const numericValue = Number(value);
  const canAdd =
    !!value &&
    !Number.isNaN(numericValue) &&
    Number.isFinite(numericValue) &&
    label.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false, title: "Stats" }} />
      <FlatList
        data={items ?? []}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        ListHeaderComponent={
          <View>
            <View className="flex-row items-center mb-3">
              <Pressable
                onPress={() => router.back()}
                className="px-2 py-1 rounded bg-gray-200 active:bg-gray-300"
              >
                <Text className="text-sm font-semibold text-gray-700">
                  ‹ Back
                </Text>
              </Pressable>
              <Text className="ml-3 text-sm font-semibold text-gray-700">
                Stats
              </Text>
            </View>

            <Section
              title="Add a stat"
              subtitle="Renders like '500+ Happy Couples' on the homepage."
            >
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <TextInput
                    value={value}
                    onChangeText={(t) => setValue(t.replace(/[^0-9-]/g, ""))}
                    placeholder="500"
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                  />
                </View>
                <View className="w-20">
                  <TextInput
                    value={suffix}
                    onChangeText={setSuffix}
                    placeholder="+"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                  />
                </View>
              </View>
              <View className="h-2" />
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Label (e.g. Happy Couples)"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
              />
              <View className="h-2" />
              <ActionButton
                label="Add stat"
                variant="primary"
                onPress={() => createMut.mutate()}
                loading={createMut.isPending}
                disabled={!canAdd}
                fullWidth
              />
            </Section>

            <View className="h-3" />
            <Text className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
              Stats ({items?.length ?? 0})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl border border-gray-200 p-3 mb-2">
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-extrabold text-brand-700">
                {item.value}
              </Text>
              <Text className="text-2xl font-extrabold text-brand-700">
                {item.suffix}
              </Text>
              <Text className="ml-3 text-sm font-semibold text-gray-700">
                {item.label}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Pressable
                onPress={() =>
                  toggleMut.mutate({ id: item.id, visible: !item.visible })
                }
                className={`px-3 py-1.5 rounded-lg ${
                  item.visible ? "bg-green-100" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    item.visible ? "text-green-800" : "text-gray-700"
                  }`}
                >
                  {item.visible ? "Visible" : "Hidden"}
                </Text>
              </Pressable>
              <ActionButton
                label="Delete"
                variant="danger"
                size="sm"
                onPress={() => confirmDelete(item)}
                loading={deleteMut.isPending}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
            </View>
          ) : isError ? (
            <Text className="text-sm text-red-600 px-2">
              Couldn&apos;t load: {error instanceof Error ? error.message : "Unknown error"}
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 italic px-2">
              No stats yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
