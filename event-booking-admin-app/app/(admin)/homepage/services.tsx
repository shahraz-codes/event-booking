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
  createServiceItem,
  deleteServiceItem,
  listServices,
  updateServiceItem,
  type ServiceItem,
} from "@/services/homepage";

export default function ServicesScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: listServices,
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [iconSvg, setIconSvg] = useState("");

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
            </View>

            <Section
              title="Add a service"
              subtitle="Icon must be inline SVG markup (paste from heroicons.com or similar)."
            >
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
              <TextInput
                value={iconSvg}
                onChangeText={setIconSvg}
                placeholder='<svg ...>...</svg>'
                multiline
                autoCapitalize="none"
                className="border border-gray-300 rounded-md px-3 py-2 text-xs text-gray-900 min-h-[80px] font-mono"
              />
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
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl border border-gray-200 p-3 mb-2">
            <Text className="text-base font-bold text-gray-900">
              {item.title}
            </Text>
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
