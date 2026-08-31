import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import MediaPicker from "@/components/MediaPicker";
import Section from "@/components/Section";
import { cloudinaryVideoPoster } from "@/lib/media";
import {
  createCarouselImage,
  deleteCarouselImage,
  listCarousel,
  updateCarouselImage,
  type CarouselImage,
  type MediaFile,
} from "@/services/homepage";

export default function CarouselScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: items, isLoading, isError, error } = useQuery({
    queryKey: ["carousel"],
    queryFn: listCarousel,
  });

  const [picked, setPicked] = useState<MediaFile | null>(null);
  const [alt, setAlt] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const createMut = useMutation({
    mutationFn: (m: MediaFile) =>
      createCarouselImage({ mediaFileId: m.id, alt: alt || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel"] });
      setPicked(null);
      setAlt("");
      Alert.alert("Added", "Carousel slide added.");
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      updateCarouselImage(id, { visible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carousel"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCarouselImage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["carousel"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await deleteCarouselImage(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carousel"] });
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

  function confirmDelete(item: CarouselImage) {
    Alert.alert("Remove slide?", "This cannot be undone.", [
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
      <Stack.Screen options={{ headerShown: false, title: "Carousel" }} />
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
                Hero carousel
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

            <Section title="Add a slide">
              <MediaPicker
                current={picked}
                onPicked={setPicked}
                label="Media"
                aspect="video"
              />
              <View className="h-2" />
              <TextInput
                value={alt}
                onChangeText={setAlt}
                placeholder="Alt text (optional, for accessibility)"
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
              />
              <View className="h-2" />
              <ActionButton
                label="Add to carousel"
                variant="primary"
                onPress={() => picked && createMut.mutate(picked)}
                loading={createMut.isPending}
                disabled={!picked}
                fullWidth
              />
            </Section>

            <View className="h-3" />
            <Text className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
              Slides ({items?.length ?? 0})
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
            {item.mediaFile?.resourceType === "video" ? (
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: cloudinaryVideoPoster(item.imageUrl) ?? item.imageUrl }}
                  style={{ width: "100%", height: 140, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <View
                  style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  className="items-center justify-center"
                >
                  <View className="h-10 w-10 rounded-full bg-black/50 items-center justify-center">
                    <Text className="text-white text-base">▶</Text>
                  </View>
                </View>
              </View>
            ) : (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: "100%", height: 140, borderRadius: 8 }}
                resizeMode="cover"
              />
            )}
            <Text className="text-xs text-gray-600 mt-2">{item.alt ?? "—"}</Text>
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
              No slides yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
