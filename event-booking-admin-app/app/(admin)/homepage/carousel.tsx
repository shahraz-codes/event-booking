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

  const { data: items, isLoading } = useQuery({
    queryKey: ["carousel"],
    queryFn: listCarousel,
  });

  const [picked, setPicked] = useState<MediaFile | null>(null);
  const [alt, setAlt] = useState("");

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
            </View>

            <Section title="Add a slide">
              <MediaPicker
                current={picked}
                onPicked={setPicked}
                label="Image"
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
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-2xl border border-gray-200 p-3 mb-2">
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: "100%", height: 140, borderRadius: 8 }}
              resizeMode="cover"
            />
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
              No slides yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
