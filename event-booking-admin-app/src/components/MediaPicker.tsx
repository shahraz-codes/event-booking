import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  cleanupOrphanedUpload,
  createMediaFile,
  type MediaFile,
} from "@/services/homepage";

interface Props {
  current?: MediaFile | null;
  onPicked: (media: MediaFile) => void;
  allowVideo?: boolean;
  label?: string;
  aspect?: "square" | "video";
}

/**
 * Picks an image/video from the device, uploads it to Cloudinary, then
 * persists a MediaFile row server-side and calls `onPicked` with the saved
 * MediaFile. Handles orphaned-upload cleanup if the server-side save fails.
 */
export default function MediaPicker({
  current,
  onPicked,
  allowVideo,
  label,
  aspect = "video",
}: Props) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<"idle" | "uploading" | "saving">(
    "idle"
  );

  const uploadMutation = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      setProgress("uploading");
      const cloud = await uploadToCloudinary({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        kind: asset.type === "video" ? "video" : "image",
      });
      setProgress("saving");
      try {
        return await createMediaFile(cloud);
      } catch (e) {
        try {
          await cleanupOrphanedUpload(cloud.publicId, cloud.resourceType);
        } catch {
          // best-effort
        }
        throw e;
      }
    },
    onSuccess: (media) => {
      setProgress("idle");
      qc.invalidateQueries({ queryKey: ["media"] });
      onPicked(media);
    },
    onError: (err: Error) => {
      setProgress("idle");
      Alert.alert("Upload failed", err.message);
    },
  });

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow access to your photo library to pick media."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: allowVideo ? ["images", "videos"] : ["images"],
      quality: 0.85,
      base64: false,
    });
    if (result.canceled || result.assets.length === 0) return;
    uploadMutation.mutate(result.assets[0]);
  }

  const busy = progress !== "idle";
  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";
  const isVideo = current?.resourceType === "video";

  return (
    <View>
      {label ? (
        <Text className="text-xs font-semibold text-gray-700 mb-1.5">
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={pick}
        disabled={busy}
        className={`${aspectClass} w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 items-center justify-center overflow-hidden`}
      >
        {current?.url ? (
          <View className="w-full h-full">
            {isVideo ? (
              // A video URL can't render in <Image>; show a placeholder instead.
              <View className="w-full h-full items-center justify-center bg-gray-800">
                <Text className="text-3xl">🎬</Text>
                <Text className="text-[10px] text-white/80 mt-1" numberOfLines={1}>
                  {current.fileName}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: current.url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            )}
            <View className="absolute bottom-1 right-1 bg-black/50 px-2 py-0.5 rounded">
              <Text className="text-[10px] text-white font-semibold">
                Tap to replace
              </Text>
            </View>
          </View>
        ) : busy ? (
          <>
            <ActivityIndicator />
            <Text className="text-xs text-gray-600 mt-2">
              {progress === "uploading" ? "Uploading…" : "Saving…"}
            </Text>
          </>
        ) : (
          <>
            <Text className="text-3xl">📷</Text>
            <Text className="text-xs text-gray-600 mt-1">
              Tap to upload {allowVideo ? "image or video" : "image"}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
