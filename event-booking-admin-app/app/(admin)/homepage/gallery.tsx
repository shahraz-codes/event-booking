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
  createGalleryItem,
  deleteGalleryItem,
  listGallery,
  updateGalleryItem,
  type GalleryItem,
  type MediaFile,
} from "@/services/homepage";

export default function GalleryScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: items, isLoading, isError, error } = useQuery({
    queryKey: ["gallery"],
    queryFn: listGallery,
  });

  const [media, setMedia] = useState<MediaFile | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createGalleryItem({
        title: title.trim(),
        desc: desc.trim(),
        mediaFileId: media!.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery"] });
      setTitle("");
      setDesc("");
      setMedia(null);
      Alert.alert("Added", "Gallery item added.");
    },
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      updateGalleryItem(id, { visible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteGalleryItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gallery"] }),
    onError: (e: Error) => Alert.alert("Failed", e.message),
  });

  function confirmDelete(item: GalleryItem) {
    Alert.alert("Remove gallery item?", "This cannot be undone.", [
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
      <Stack.Screen options={{ headerShown: false, title: "Gallery" }} />
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
                Gallery
              </Text>
            </View>

            <Section title="Add an item">
              <MediaPicker
                current={media}
                onPicked={setMedia}
                label="Media"
                aspect="video"
              />
              <View className="h-2" />
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title (e.g. Wedding Reception)"
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
              <ActionButton
                label="Add gallery item"
                variant="primary"
                onPress={() => createMut.mutate()}
                loading={createMut.isPending}
                disabled={!media || !title.trim() || !desc.trim()}
                fullWidth
              />
            </Section>

            <View className="h-3" />
            <Text className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
              Items ({items?.length ?? 0})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl border border-gray-200 p-3 mb-2">
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
            <Text className="text-base font-bold text-gray-900 mt-2">
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
          ) : isError ? (
            <Text className="text-sm text-red-600 px-2">
              Couldn&apos;t load: {error instanceof Error ? error.message : "Unknown error"}
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 italic px-2">
              No gallery items yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
