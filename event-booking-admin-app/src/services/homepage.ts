/**
 * Homepage editor service — all reads/writes go through the Next.js
 * /api/admin/homepage/* endpoints. We could read directly from Supabase
 * for some of these tables, but using the API keeps validation, ordering
 * and revalidatePath() centralised.
 */

import { apiFetch } from "@/lib/api-client";
import type { CloudinaryAsset } from "@/lib/cloudinary";

export interface MediaFile {
  id: string;
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  resourceType: "image" | "video" | "raw";
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface HeroSection {
  id: string;
  subtitle: string;
  heading: string;
  headingHighlight: string;
  description: string;
  logoUrl: string | null;
  logoMediaFileId: string | null;
  logoMedia?: MediaFile | null;
}

export interface CarouselImage {
  id: string;
  imageUrl: string;
  alt: string | null;
  order: number;
  visible: boolean;
  mediaFile?: MediaFile | null;
}

export interface GalleryItem {
  id: string;
  title: string;
  desc: string;
  imageUrl: string;
  gradient: string | null;
  order: number;
  visible: boolean;
  mediaFile?: MediaFile | null;
}

export interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  iconSvg: string;
  order: number;
  visible: boolean;
}

export interface StatItem {
  id: string;
  value: number;
  suffix: string;
  label: string;
  order: number;
  visible: boolean;
}

// ── Media ──────────────────────────────────────────────────────────

export function listMediaFiles() {
  return apiFetch<MediaFile[]>("/api/admin/homepage/media");
}

export function createMediaFile(asset: CloudinaryAsset) {
  return apiFetch<MediaFile>("/api/admin/homepage/media", {
    method: "POST",
    body: asset,
  });
}

export function deleteMediaFile(id: string) {
  return apiFetch<{ success: true }>("/api/admin/homepage/media", {
    method: "DELETE",
    body: { id },
  });
}

export function cleanupOrphanedUpload(
  publicId: string,
  resourceType: string
) {
  return apiFetch<{ success: true }>("/api/admin/homepage/media/cleanup", {
    method: "POST",
    body: { publicId, resourceType },
  });
}

// ── Hero ──────────────────────────────────────────────────────────

export function getHero() {
  return apiFetch<HeroSection | null>("/api/admin/homepage/hero");
}

export function upsertHero(data: {
  subtitle: string;
  heading: string;
  headingHighlight: string;
  description: string;
  logoUrl?: string | null;
  logoMediaFileId?: string | null;
}) {
  return apiFetch<HeroSection>("/api/admin/homepage/hero", {
    method: "PUT",
    body: data,
  });
}

// ── Carousel ──────────────────────────────────────────────────────

export function listCarousel() {
  return apiFetch<CarouselImage[]>("/api/admin/homepage/carousel");
}

export function createCarouselImage(data: { mediaFileId: string; alt?: string }) {
  return apiFetch<CarouselImage>("/api/admin/homepage/carousel", {
    method: "POST",
    body: data,
  });
}

export function updateCarouselImage(
  id: string,
  data: Partial<{ alt: string; order: number; visible: boolean; mediaFileId: string }>
) {
  return apiFetch<CarouselImage>("/api/admin/homepage/carousel", {
    method: "PATCH",
    body: { id, ...data },
  });
}

export function deleteCarouselImage(id: string) {
  return apiFetch<{ success: true }>("/api/admin/homepage/carousel", {
    method: "DELETE",
    body: { id },
  });
}

// ── Gallery ──────────────────────────────────────────────────────

export function listGallery() {
  return apiFetch<GalleryItem[]>("/api/admin/homepage/gallery");
}

export function createGalleryItem(data: {
  title: string;
  desc: string;
  mediaFileId: string;
  gradient?: string;
}) {
  return apiFetch<GalleryItem>("/api/admin/homepage/gallery", {
    method: "POST",
    body: data,
  });
}

export function updateGalleryItem(
  id: string,
  data: Partial<{
    title: string;
    desc: string;
    mediaFileId: string;
    gradient: string;
    order: number;
    visible: boolean;
  }>
) {
  return apiFetch<GalleryItem>("/api/admin/homepage/gallery", {
    method: "PATCH",
    body: { id, ...data },
  });
}

export function deleteGalleryItem(id: string) {
  return apiFetch<{ success: true }>("/api/admin/homepage/gallery", {
    method: "DELETE",
    body: { id },
  });
}

// ── Services ──────────────────────────────────────────────────────

export function listServices() {
  return apiFetch<ServiceItem[]>("/api/admin/homepage/services");
}

export function createServiceItem(data: { title: string; desc: string; iconSvg: string }) {
  return apiFetch<ServiceItem>("/api/admin/homepage/services", {
    method: "POST",
    body: data,
  });
}

export function updateServiceItem(
  id: string,
  data: Partial<{
    title: string;
    desc: string;
    iconSvg: string;
    order: number;
    visible: boolean;
  }>
) {
  return apiFetch<ServiceItem>("/api/admin/homepage/services", {
    method: "PATCH",
    body: { id, ...data },
  });
}

export function deleteServiceItem(id: string) {
  return apiFetch<{ success: true }>("/api/admin/homepage/services", {
    method: "DELETE",
    body: { id },
  });
}

// ── Stats ──────────────────────────────────────────────────────

export function listStats() {
  return apiFetch<StatItem[]>("/api/admin/homepage/stats");
}

export function createStatItem(data: { value: number; suffix?: string; label: string }) {
  return apiFetch<StatItem>("/api/admin/homepage/stats", {
    method: "POST",
    body: data,
  });
}

export function updateStatItem(
  id: string,
  data: Partial<{
    value: number;
    suffix: string;
    label: string;
    order: number;
    visible: boolean;
  }>
) {
  return apiFetch<StatItem>("/api/admin/homepage/stats", {
    method: "PATCH",
    body: { id, ...data },
  });
}

export function deleteStatItem(id: string) {
  return apiFetch<{ success: true }>("/api/admin/homepage/stats", {
    method: "DELETE",
    body: { id },
  });
}
