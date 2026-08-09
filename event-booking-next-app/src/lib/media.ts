// Helpers for distinguishing image vs video media on the public site.

export type MediaKind = "image" | "video";

// Matches common video file extensions (with optional query/hash).
const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?(#.*)?$/i;

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  if (VIDEO_EXT.test(url)) return true;
  // Cloudinary delivers videos under a /video/upload/ path segment.
  if (url.includes("/video/upload/")) return true;
  return false;
}

/**
 * Decide whether a media item is a video. Prefer the stored Cloudinary
 * resourceType ("image" | "video" | "raw"); fall back to sniffing the URL for
 * legacy rows that only have a plain imageUrl string.
 */
export function mediaKindOf(
  resourceType?: string | null,
  url?: string | null
): MediaKind {
  if (resourceType === "video") return "video";
  if (isVideoUrl(url)) return "video";
  return "image";
}

/**
 * Build a still JPG "poster" frame from a Cloudinary video delivery URL, used
 * for the gallery grid thumbnail. Returns null if the URL isn't a recognisable
 * Cloudinary video URL (in which case the caller just omits the poster).
 * Example:
 *   .../video/upload/v123/clip.mp4  ->  .../video/upload/so_0/v123/clip.jpg
 */
export function cloudinaryVideoPoster(url?: string | null): string | null {
  if (!url) return null;
  const marker = "/video/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const head = url.slice(0, idx + marker.length);
  let tail = url.slice(idx + marker.length).replace(/[?#].*$/, "");
  tail = tail.replace(/\.(mp4|webm|ogg|ogv|mov|m4v)$/i, ".jpg");
  return `${head}so_0/${tail}`;
}
