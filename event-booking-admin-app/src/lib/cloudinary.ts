/**
 * Direct (unsigned) upload to Cloudinary from React Native.
 *
 * Why unsigned + a Cloudinary upload preset?
 *   - The mobile client never sees the Cloudinary API secret.
 *   - The preset is configured in the Cloudinary dashboard to constrain
 *     folder, allowed formats, and access mode.
 *
 * After upload succeeds, we POST the response to /api/admin/homepage/media
 * to persist a MediaFile row server-side (see media.ts service).
 */

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from "@/lib/config";

export interface CloudinaryAsset {
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  resourceType: "image" | "video" | "raw";
  width: number | null;
  height: number | null;
}

export interface PickedAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  /** "image" | "video" — falls back to "image" */
  kind?: "image" | "video" | null;
}

function ensureConfigured() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env."
    );
  }
}

/**
 * Uploads a picked asset (from expo-image-picker) to Cloudinary using the
 * unsigned preset. Returns the data needed by /api/admin/homepage/media.
 */
export async function uploadToCloudinary(
  asset: PickedAsset
): Promise<CloudinaryAsset> {
  ensureConfigured();

  const kind = asset.kind === "video" ? "video" : "image";
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${kind}/upload`;

  const fileName =
    asset.fileName?.trim() ||
    asset.uri.split("/").pop() ||
    `upload-${Date.now()}`;
  const mimeType =
    asset.mimeType?.trim() ||
    (kind === "video" ? "video/mp4" : "image/jpeg");

  const form = new FormData();
  // React Native FormData supports the { uri, name, type } shape.
  form.append("file", {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Cloudinary returned a non-JSON response");
  }

  if (!res.ok) {
    const msg =
      json?.error?.message || `Cloudinary upload failed (${res.status})`;
    throw new Error(msg);
  }

  return {
    url: json.secure_url,
    publicId: json.public_id,
    fileName: json.original_filename || fileName,
    fileSize: Number(json.bytes ?? asset.fileSize ?? 0),
    mimeType: `${json.resource_type}/${json.format}`,
    resourceType: json.resource_type as "image" | "video" | "raw",
    width: typeof json.width === "number" ? json.width : null,
    height: typeof json.height === "number" ? json.height : null,
  };
}
