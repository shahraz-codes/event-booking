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
import Svg, { Path } from "react-native-svg";

import ActionButton from "@/components/ActionButton";
import Section from "@/components/Section";
import {
  createServiceItem,
  deleteServiceItem,
  listServices,
  updateServiceItem,
  type ServiceItem,
} from "@/services/homepage";

const PRESET_ICONS: Record<string, string> = {
  gift: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  music: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z",
  book: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  heart: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
};

export default function ServicesScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: items, isLoading, isError, error } = useQuery({
    queryKey: ["services"],
    queryFn: listServices,
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const createMut = useMutation({
    mutationFn: () =>
      createServiceItem({
        title: title.trim(),
        desc: desc.trim(),
        iconSvg: iconSvg.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setTitle("");
      setDesc("");
      setIconSvg("");
      Alert.alert("Added", "Service added.");
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      updateServiceItem(id, { visible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteServiceItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await deleteServiceItem(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      setSelected(new Set());
      setSelectMode(false);
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function confirmDelete(item: ServiceItem) {
    Alert.alert("Remove service?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(item.id),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false, title: "Services" }} />
      <FlatList
        data={items ?? []}
        keyExtractor={(i) => i.id}
        extraData={{ selectMode, selected, deleteMut, toggleMut }}
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
                Services
              </Text>
              <Pressable
                onPress={() => {
                  setSelectMode((m) => !m);
                  setSelected(new Set());
                }}
                className="ml-auto px-3 py-1 rounded bg-gray-200 active:bg-gray-300"
              >
                <Text className="text-sm font-semibold text-gray-700">
                  {selectMode ? "Cancel" : "Select"}
                </Text>
              </Pressable>
            </View>

            <Section title="Add a service" subtitle="Pick an icon.">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title (e.g. Catering)"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
              />
              <View className="h-2" />
              <TextInput
                value={desc}
                onChangeText={setDesc}
                placeholder="Description"
                multiline
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 min-h-[60px]"
              />
              <View className="h-2" />
              <Text className="text-xs font-semibold text-gray-700 mb-1">Icon</Text>
              <View className="flex-row flex-wrap gap-2">
                {Object.entries(PRESET_ICONS).map(([name, d]) => (
                  <Pressable
                    key={name}
                    onPress={() => setIconSvg(d)}
                    className={`h-12 w-12 items-center justify-center rounded-lg border ${
                      iconSvg === d ? "border-brand-600 bg-brand-50" : "border-gray-300 bg-white"
                    }`}
                  >
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                      <Path
                        d={d}
                        stroke={iconSvg === d ? "#dd5616" : "#374151"}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </Pressable>
                ))}
              </View>
              <View className="h-2" />
              <ActionButton
                label="Add service"
                variant="primary"
                onPress={() => createMut.mutate()}
                loading={createMut.isPending}
                disabled={!title.trim() || !desc.trim() || !iconSvg.trim()}
                fullWidth
              />
            </Section>

            <View className="h-3" />
            <Text className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
              Services ({items?.length ?? 0})
            </Text>
            {selectMode && selected.size > 0 ? (
              <View className="mb-2">
                <ActionButton
                  label={`Delete ${selected.size} selected`}
                  variant="danger"
                  loading={bulkDeleteMut.isPending}
                  onPress={() =>
                    Alert.alert("Delete selected?", "This cannot be undone.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => bulkDeleteMut.mutate([...selected]),
                      },
                    ])
                  }
                  fullWidth
                />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => selectMode && toggleSelected(item.id)}
            className={`bg-white rounded-2xl border p-3 mb-2 ${
              selectMode && selected.has(item.id) ? "border-brand-600 bg-brand-50" : "border-gray-200"
            }`}
          >
            <View className="flex-row items-center">
              {item.iconSvg ? (
                <View className="mr-2">
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d={item.iconSvg}
                      stroke="#dd5616"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
              ) : null}
              <Text className="text-base font-bold text-gray-900 flex-1">
                {item.title}
              </Text>
            </View>
            <Text className="text-xs text-gray-600 mt-0.5">{item.desc}</Text>
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
              {selectMode ? (
                <Text className="text-xs font-bold text-brand-700">
                  {selected.has(item.id) ? "✓ Selected" : "Tap to select"}
                </Text>
              ) : (
                <ActionButton
                  label="Delete"
                  variant="danger"
                  size="sm"
                  onPress={() => confirmDelete(item)}
                  loading={deleteMut.isPending && deleteMut.variables === item.id}
                />
              )}
            </View>
          </Pressable>
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
              No services yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
