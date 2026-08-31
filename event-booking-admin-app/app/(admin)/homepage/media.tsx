import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import ActionButton from "@/components/ActionButton";
import Section from "@/components/Section";
import {
  cleanupOrphanedUpload,
  createMediaFile,
  deleteMediaFile,
  listMediaFiles,
  type MediaFile,
} from "@/services/homepage";
import { uploadToCloudinary } from "@/lib/cloudinary";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function MediaLibraryScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: files, isLoading, isError, error } = useQuery({
    queryKey: ["media"],
    queryFn: listMediaFiles,
  });

  const uploadMut = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const cloud = await uploadToCloudinary({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        kind: asset.type === "video" ? "video" : "image",
      });
      try {
        return await createMediaFile(cloud);
      } catch (e) {
        try {
          await cleanupOrphanedUpload(cloud.publicId, cloud.resourceType);
        } catch {}
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
    onError: (e: Error) => Alert.alert("Upload failed", e.message),
    onSettled: () => setUploading(false),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMediaFile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media"] }),
    onError: (e: Error) => Alert.alert("Cannot delete", e.message),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await deleteMediaFile(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media"] });
      setSelected(new Set());
      setSelectMode(false);
    },
    onError: (e: Error) => Alert.alert("Cannot delete", e.message),
  });

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      base64: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    setUploading(true);
    uploadMut.mutate(result.assets[0]);
  }

  function confirmDelete(file: MediaFile) {
    Alert.alert("Delete file?", `${file.fileName}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMut.mutate(file.id),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false, title: "Media" }} />
      <FlatList
        data={files ?? []}
        keyExtractor={(f) => f.id}
        extraData={{ selectMode, selected, deleteMut }}
        contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
        numColumns={2}
        columnWrapperStyle={{ gap: 8 }}
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
                Media library
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

            <Section
              title="Upload"
              subtitle="Files are uploaded directly to Cloudinary, then linked here."
            >
              <ActionButton
                label={uploading ? "Uploading…" : "Pick file to upload"}
                variant="primary"
                onPress={pickAndUpload}
                loading={uploading}
                fullWidth
              />
            </Section>

            <View className="h-3" />
            <Text className="text-xs uppercase tracking-wider font-bold text-gray-500 mb-2">
              Files ({files?.length ?? 0})
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
            className={`bg-white rounded-xl border p-2 mb-2 flex-1 ${
              selectMode && selected.has(item.id) ? "border-brand-600 bg-brand-50" : "border-gray-200"
            }`}
          >
            {item.resourceType === "image" ? (
              <Image
                source={{ uri: item.url }}
                style={{ width: "100%", aspectRatio: 1, borderRadius: 6 }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  aspectRatio: 1,
                  borderRadius: 6,
                }}
                className="bg-gray-200 items-center justify-center"
              >
                <Text className="text-3xl">
                  {item.resourceType === "video" ? "🎬" : "📄"}
                </Text>
              </View>
            )}
            <Text
              className="text-[11px] text-gray-700 mt-1.5"
              numberOfLines={1}
            >
              {item.fileName}
            </Text>
            <Text className="text-[10px] text-gray-500">
              {formatBytes(item.fileSize)}
            </Text>
            {selectMode ? (
              <Text className="text-[10px] font-bold text-brand-700 mt-1.5">
                {selected.has(item.id) ? "✓ Selected" : "Tap to select"}
              </Text>
            ) : (
              <Pressable
                onPress={() => confirmDelete(item)}
                disabled={deleteMut.isPending && deleteMut.variables === item.id}
                className="mt-1.5 px-2 py-1 rounded bg-red-100 active:bg-red-200 self-start"
              >
                <Text className="text-[10px] font-bold text-red-700">
                  {deleteMut.isPending && deleteMut.variables === item.id
                    ? "Deleting…"
                    : "Delete"}
                </Text>
              </Pressable>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="py-10 items-center w-full">
              <ActivityIndicator />
            </View>
          ) : isError ? (
            <Text className="text-sm text-red-600 px-2">
              Couldn&apos;t load: {error instanceof Error ? error.message : "Unknown error"}
            </Text>
          ) : (
            <Text className="text-sm text-gray-500 italic px-2">
              No files uploaded yet.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}
