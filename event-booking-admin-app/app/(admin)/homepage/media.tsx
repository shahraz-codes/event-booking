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

  const { data: files, isLoading } = useQuery({
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
          </View>
        }
        renderItem={({ item }) => (
          <View className="bg-white rounded-xl border border-gray-200 p-2 mb-2 flex-1">
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
            <Pressable
              onPress={() => confirmDelete(item)}
              className="mt-1.5 px-2 py-1 rounded bg-red-100 active:bg-red-200 self-start"
            >
              <Text className="text-[10px] font-bold text-red-700">Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View className="py-10 items-center w-full">
              <ActivityIndicator />
            </View>
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
