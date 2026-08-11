// Build a still JPG poster from a Cloudinary video delivery URL, for thumbnails.
// Returns null if the URL isn't a recognisable Cloudinary video URL.
//   .../video/upload/v1/clip.mp4  ->  .../video/upload/so_0/v1/clip.jpg
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
