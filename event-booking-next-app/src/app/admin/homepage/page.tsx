"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import Link from "next/link";
import { ToastProvider, useToast } from "@/components/Toast";
import { ConfirmProvider, useConfirm } from "@/components/ConfirmDialog";
import { APP_NAME } from "@/lib/config";
import {
  PRESET_KEYS,
  PRESETS,
  derivePaletteFromHex,
  isValidHex,
  normaliseHex,
  type Palette,
} from "@/lib/palette";

// ── Types ───────────────────────────────────────────────────────────

interface MediaFile {
  id: string;
  url: string;
  publicId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  resourceType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

interface MediaUsage {
  usedBytes: number;
  limitBytes: number;
  availableBytes: number;
}

interface HeroData {
  id?: string;
  subtitle: string;
  heading: string;
  headingHighlight: string;
  description: string;
  logoUrl: string | null;
  logoMediaFileId: string | null;
  logoMedia: MediaFile | null;
}

interface GalleryItem {
  id: string;
  title: string;
  desc: string;
  imageUrl: string;
  gradient: string;
  order: number;
  visible: boolean;
  mediaFileId: string | null;
  mediaFile: MediaFile | null;
}

interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  iconSvg: string;
  order: number;
  visible: boolean;
}

interface StatItem {
  id: string;
  value: number;
  suffix: string;
  label: string;
  order: number;
  visible: boolean;
}

interface CarouselImage {
  id: string;
  imageUrl: string;
  alt: string;
  order: number;
  visible: boolean;
  mediaFileId: string | null;
  mediaFile: MediaFile | null;
}

type Tab =
  | "media"
  | "hero"
  | "carousel"
  | "gallery"
  | "services"
  | "stats"
  | "colors"
  | "social"
  | "contact";

const GRADIENT_OPTIONS = [
  { value: "from-brand-600 to-brand-800", label: "Brand" },
  { value: "from-emerald-600 to-emerald-800", label: "Emerald" },
  { value: "from-rose-600 to-rose-800", label: "Rose" },
  { value: "from-violet-600 to-violet-800", label: "Violet" },
  { value: "from-blue-600 to-blue-800", label: "Blue" },
  { value: "from-cyan-600 to-cyan-800", label: "Cyan" },
  { value: "from-pink-600 to-pink-800", label: "Pink" },
  { value: "from-teal-600 to-teal-800", label: "Teal" },
];

const PRESET_ICONS: Record<string, string> = {
  gift: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  music:
    "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z",
  book: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  camera:
    "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  heart:
    "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  sparkles:
    "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
};

// ── Component ───────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  media: "Media Library",
  hero: "Hero",
  carousel: "Carousel",
  gallery: "Gallery",
  services: "Services",
  stats: "Stats",
  colors: "Colors",
  social: "Social Apps",
  contact: "Contact & About",
};

export default function AdminHomepagePage() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminHomepageContent />
      </ConfirmProvider>
    </ToastProvider>
  );
}

const ALL_TABS: Tab[] = [
  "media",
  "hero",
  "carousel",
  "gallery",
  "services",
  "stats",
  "colors",
  "social",
  "contact",
];

function AdminHomepageContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("media");

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const currentIndex = ALL_TABS.indexOf(activeTab);
  const goPrev = () => {
    if (currentIndex > 0) setActiveTab(ALL_TABS[currentIndex - 1]);
  };
  const goNext = () => {
    if (currentIndex < ALL_TABS.length - 1)
      setActiveTab(ALL_TABS[currentIndex + 1]);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Homepage Manager
          </h1>
          <p className="mt-1 text-sm text-gray-600 sm:text-base">
            Manage hero section, gallery, and services displayed on the home
            page
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Link
            href="/admin"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:px-4"
          >
            Bookings
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:px-4"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile: Prev / Current / Next stepper */}
      <div className="mb-6 flex items-center gap-2 rounded-xl bg-gray-100 p-1 sm:hidden">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          aria-label="Previous section"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-900 shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-300 disabled:shadow-none"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <span className="text-sm font-semibold text-brand-900">
            {TAB_LABELS[activeTab]}
          </span>
          <span className="text-[11px] font-medium text-gray-500">
            {currentIndex + 1} of {ALL_TABS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === ALL_TABS.length - 1}
          aria-label="Next section"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-900 shadow-sm transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-gray-300 disabled:shadow-none"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Desktop: Horizontal tabs */}
      <div className="mb-6 hidden sm:block">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {ALL_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "media" && <MediaLibraryEditor />}
      {activeTab === "hero" && <HeroEditor />}
      {activeTab === "carousel" && <CarouselEditor />}
      {activeTab === "gallery" && <GalleryEditor />}
      {activeTab === "services" && <ServicesEditor />}
      {activeTab === "stats" && <StatsEditor />}
      {activeTab === "colors" && <ColorsEditor />}
      {activeTab === "social" && <SocialEditor />}
      {activeTab === "contact" && <ContactEditor />}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i >= 2 ? 2 : 0)} ${sizes[i]}`;
}

// ── Media Library Editor ────────────────────────────────────────────

function MediaLibraryEditor() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [usage, setUsage] = useState<MediaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [filesRes, usageRes] = await Promise.all([
        fetch("/api/admin/homepage/media"),
        fetch("/api/admin/homepage/media/usage"),
      ]);
      const [filesJson, usageJson] = await Promise.all([
        filesRes.json(),
        usageRes.json(),
      ]);
      if (filesJson.success) setFiles(filesJson.data);
      if (usageJson.success) setUsage(usageJson.data);
    } catch {
      toast("error", "Failed to load media library");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadSuccess = async (result: unknown) => {
    const res = result as { info?: Record<string, unknown> } | undefined;
    const info = res?.info;
    if (typeof info !== "object" || info === null || !("secure_url" in info))
      return;

    const data = info as Record<string, unknown>;
    setUploading(true);
    setUploadProgress(90);
    try {
      const res = await fetch("/api/admin/homepage/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.secure_url,
          publicId: data.public_id,
          fileName: data.original_filename || "untitled",
          fileSize: data.bytes,
          mimeType: `${data.resource_type}/${data.format}`,
          resourceType: data.resource_type,
          width: data.width ?? null,
          height: data.height ?? null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setUploadProgress(100);
        toast("success", "File uploaded");
        fetchData();
      } else {
        toast("error", json.error || "Failed to save file record");
        await cleanupOrphanedUpload(data.public_id as string, data.resource_type as string);
      }
    } catch {
      toast("error", "Failed to save file record");
      await cleanupOrphanedUpload(data.public_id as string, data.resource_type as string);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const cleanupOrphanedUpload = async (publicId: string, resourceType: string) => {
    try {
      await fetch("/api/admin/homepage/media/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, resourceType }),
      });
    } catch {
      // Best-effort cleanup
    }
  };

  const handleCopyUrl = async (file: MediaFile) => {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopied(file.id);
      toast("success", "URL copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast("error", "Failed to copy URL");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete media file",
      message: "This file will be permanently removed from storage. Files currently in use cannot be deleted.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/homepage/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "File deleted");
        fetchData();
      } else {
        toast("error", json.error || "Failed to delete");
      }
    } catch {
      toast("error", "Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const getVideoThumbnail = (publicId: string) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_400,h_225,c_fill/${publicId}.jpg`;
  };

  if (loading) return <Spinner />;

  const usedPercent = usage
    ? Math.min((usage.usedBytes / usage.limitBytes) * 100, 100)
    : 0;
  const storageFull = usedPercent >= 100;

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.fileName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || file.resourceType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Storage bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Storage</h2>
          {usage && (
            <span className="text-sm text-gray-500">
              {formatBytes(usage.usedBytes)} / {formatBytes(usage.limitBytes)}{" "}
              used
            </span>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              usedPercent > 90
                ? "bg-red-500"
                : usedPercent > 70
                  ? "bg-brand-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {usage && (
          <p className="mt-2 text-xs text-gray-400">
            {formatBytes(usage.availableBytes)} available
          </p>
        )}
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Upload Media
        </h2>
        {storageFull ? (
          <div className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-red-300 bg-red-50 px-6 py-8 text-center">
            <svg
              className="h-6 w-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm font-medium text-red-600">
              Storage is full
            </p>
            <p className="text-xs text-red-500">
              Delete some files to free up space before uploading.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              options={{ maxFiles: 5, resourceType: "auto" }}
              onSuccess={handleUploadSuccess}
              onUploadAdded={() => {
                setUploading(true);
                setUploadProgress(30);
              }}
              onError={() => {
                setUploading(false);
                setUploadProgress(0);
              }}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-sm font-medium text-gray-500 transition-colors hover:border-brand-400 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-50"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5"
                    />
                  </svg>
                  {uploading ? "Uploading..." : "Click to upload images or videos"}
                </button>
              )}
            </CldUploadWidget>
            {uploading && (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-right">
                  {uploadProgress < 90 ? "Uploading to cloud..." : uploadProgress < 100 ? "Saving record..." : "Done!"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & Filter */}
      {files.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by file name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            {(["all", "image", "video"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  typeFilter === type
                    ? "bg-brand-100 text-brand-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {type === "all" ? "All" : type === "image" ? "Images" : "Videos"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      {files.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No media files yet. Upload some above.
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No files match your search.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="relative aspect-video bg-gray-50">
                {file.resourceType === "video" ? (
                  <Image
                    src={getVideoThumbnail(file.publicId)}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                  />
                ) : (
                  <Image
                    src={file.url}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )}
                {file.resourceType === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-black/50 p-2">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-gray-800">
                  {file.fileName}
                </p>
                <p className="text-xs text-gray-400">
                  {formatBytes(file.fileSize)} &middot; {file.resourceType}
                  {file.width && file.height && (
                    <> &middot; {file.width}&times;{file.height}</>
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleCopyUrl(file)}
                    className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    {copied === file.id ? "Copied!" : "Copy URL"}
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deleting === file.id}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    {deleting === file.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Media Picker Modal ──────────────────────────────────────────────

function MediaPickerModal({
  open,
  onClose,
  onSelect,
  filterType,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  filterType?: "image" | "video";
}) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">(
    filterType ?? "all"
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/admin/homepage/media")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setFiles(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const filtered =
    typeFilter === "all"
      ? files
      : files.filter((f) => f.resourceType === typeFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Select Media
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Filter */}
        {!filterType && (
          <div className="flex gap-1 border-b border-gray-100 px-6 py-3">
            {(["all", "image", "video"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-brand-100 text-brand-800"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t === "all" ? "All" : `${t}s`}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              No media files found. Upload some in the Media Library tab first.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    onSelect(file);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-gray-200 text-left transition-all hover:border-brand-400 hover:shadow-md"
                >
                  <div className="relative aspect-video bg-gray-50">
                    {file.resourceType === "video" ? (
                      <div className="flex h-full items-center justify-center">
                        <svg
                          className="h-8 w-8 text-gray-300 group-hover:text-brand-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <Image
                        src={file.url}
                        alt={file.fileName}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-gray-700">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(file.fileSize)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hero Editor ─────────────────────────────────────────────────────

function HeroEditor() {
  const { toast } = useToast();
  const [hero, setHero] = useState<HeroData>({
    subtitle: "",
    heading: "",
    headingHighlight: "",
    description: "",
    logoUrl: null,
    logoMediaFileId: null,
    logoMedia: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch("/api/admin/homepage/hero")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setHero(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtitle: hero.subtitle,
          heading: hero.heading,
          headingHighlight: hero.headingHighlight,
          description: hero.description,
          logoUrl: hero.logoMedia?.url ?? hero.logoUrl,
          logoMediaFileId: hero.logoMediaFileId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setHero(json.data);
        toast("success", "Hero section saved");
      } else {
        toast("error", json.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save hero section");
    } finally {
      setSaving(false);
    }
  };

  const logoPreviewUrl = hero.logoMedia?.url ?? hero.logoUrl;

  if (loading) return <Spinner />;

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Hero Section
          </h2>
          <div className="space-y-4">
            <Field
              label="Subtitle"
              value={hero.subtitle}
              onChange={(v) => setHero({ ...hero, subtitle: v })}
              placeholder="Premium Event Venue • Tolichowki, Hyderabad"
            />
            <Field
              label="Heading"
              value={hero.heading}
              onChange={(v) => setHero({ ...hero, heading: v })}
              placeholder="Welcome to"
            />
            <Field
              label="Heading Highlight"
              value={hero.headingHighlight}
              onChange={(v) => setHero({ ...hero, headingHighlight: v })}
              placeholder={APP_NAME}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={hero.description}
                onChange={(e) =>
                  setHero({ ...hero, description: e.target.value })
                }
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                placeholder="Your premier destination for..."
              />
            </div>

            {/* Logo from Media Library */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreviewUrl && (
                  <div className="relative h-16 w-16 overflow-hidden rounded-full border border-gray-200">
                    <Image
                      src={logoPreviewUrl}
                      alt="Logo preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {logoPreviewUrl ? "Change Logo" : "Select Logo"}
                </button>
                {logoPreviewUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setHero({
                        ...hero,
                        logoUrl: null,
                        logoMediaFileId: null,
                        logoMedia: null,
                      })
                    }
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Hero Section"}
        </button>
      </form>

      <MediaPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        filterType="image"
        onSelect={(file) =>
          setHero({
            ...hero,
            logoMediaFileId: file.id,
            logoMedia: file,
            logoUrl: file.url,
          })
        }
      />
    </>
  );
}

// ── Carousel Editor ─────────────────────────────────────────────────

function CarouselEditor() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/carousel");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      toast("error", "Failed to load carousel images");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete carousel image",
      message: "This image will be removed from the hero carousel.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/homepage/carousel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "Carousel image deleted");
        fetchItems();
      } else {
        toast("error", json.error || "Failed to delete");
      }
    } catch {
      toast("error", "Failed to delete carousel image");
    }
  };

  const handleToggleVisibility = async (item: CarouselImage) => {
    try {
      const res = await fetch("/api/admin/homepage/carousel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, visible: !item.visible }),
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      } else {
        toast("error", json.error || "Failed to update");
      }
    } catch {
      toast("error", "Failed to update carousel image");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Hero Carousel Images
          </h2>
          <p className="text-sm text-gray-500">
            These images rotate behind the hero text. Add at least 2 for a
            carousel effect.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
          className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 sm:self-auto"
        >
          Add Image
        </button>
      </div>

      {showAddForm && (
        <CarouselImageForm
          onSave={() => {
            setShowAddForm(false);
            fetchItems();
            toast("success", "Carousel image added");
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {items.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No carousel images yet. The hero will use the default gradient
          background until you add images here.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) =>
            editingId === item.id ? (
              <CarouselImageForm
                key={item.id}
                item={item}
                onSave={() => {
                  setEditingId(null);
                  fetchItems();
                  toast("success", "Carousel image updated");
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={item.id}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                  item.visible ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="relative aspect-video bg-gray-100">
                  {(item.mediaFile?.url || item.imageUrl?.startsWith("http")) ? (
                    <Image
                      src={item.mediaFile?.url ?? item.imageUrl}
                      alt={item.alt || "Carousel image"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="mb-2 truncate text-sm text-gray-600">
                    {item.alt || "No alt text"}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleVisibility(item)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        item.visible
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {item.visible ? "Visible" : "Hidden"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setShowAddForm(false);
                      }}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function CarouselImageForm({
  item,
  onSave,
  onCancel,
}: {
  item?: CarouselImage;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(
    item?.mediaFile ?? null
  );
  const [alt, setAlt] = useState(item?.alt ?? "");
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const previewUrl = selectedMedia?.url ?? item?.imageUrl;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMedia && !item?.mediaFileId) {
      toast("error", "Please select an image from the media library");
      return;
    }
    setSaving(true);
    try {
      const method = item ? "PATCH" : "POST";
      const body = item
        ? {
            id: item.id,
            mediaFileId: selectedMedia?.id ?? item.mediaFileId,
            imageUrl: selectedMedia?.url ?? item.imageUrl,
            alt,
          }
        : {
            mediaFileId: selectedMedia!.id,
            imageUrl: selectedMedia!.url,
            alt,
          };

      const res = await fetch("/api/admin/homepage/carousel", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        onSave();
      } else {
        toast("error", json.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save carousel image");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm"
      >
        <h3 className="mb-4 font-semibold text-gray-900">
          {item ? "Edit Carousel Image" : "New Carousel Image"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Image
            </label>
            <div className="flex items-center gap-3">
              {previewUrl && (
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {previewUrl ? "Change Image" : "Select from Media Library"}
              </button>
            </div>
          </div>
          <Field
            label="Alt Text (optional)"
            value={alt}
            onChange={setAlt}
            placeholder="Describe the image for accessibility"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : item ? "Update" : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      <MediaPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={setSelectedMedia}
      />
    </>
  );
}

// ── Gallery Editor ──────────────────────────────────────────────────

function GalleryEditor() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/gallery");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      toast("error", "Failed to load gallery items");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete gallery item",
      message: "This gallery item will be permanently removed from the homepage.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/homepage/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "Gallery item deleted");
        fetchItems();
      } else {
        toast("error", json.error || "Failed to delete");
      }
    } catch {
      toast("error", "Failed to delete gallery item");
    }
  };

  const handleToggleVisibility = async (item: GalleryItem) => {
    try {
      const res = await fetch("/api/admin/homepage/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, visible: !item.visible }),
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      } else {
        toast("error", json.error || "Failed to update");
      }
    } catch {
      toast("error", "Failed to update gallery item");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Gallery Items</h2>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Add Item
        </button>
      </div>

      {showAddForm && (
        <GalleryItemForm
          onSave={() => {
            setShowAddForm(false);
            fetchItems();
            toast("success", "Gallery item added");
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {items.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No gallery items yet. Click &quot;Add Item&quot; to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <GalleryItemForm
                key={item.id}
                item={item}
                onSave={() => {
                  setEditingId(null);
                  fetchItems();
                  toast("success", "Gallery item updated");
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 ${
                  item.visible ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 sm:contents">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {(item.mediaFile?.url || item.imageUrl?.startsWith("http")) ? (
                      <Image
                        src={item.mediaFile?.url ?? item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="truncate text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(item)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.visible
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {item.visible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setShowAddForm(false);
                    }}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function GalleryItemForm({
  item,
  onSave,
  onCancel,
}: {
  item?: GalleryItem;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [desc, setDesc] = useState(item?.desc ?? "");
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(
    item?.mediaFile ?? null
  );
  const [gradient, setGradient] = useState(
    item?.gradient ?? "from-brand-600 to-brand-800"
  );
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const previewUrl = selectedMedia?.url ?? item?.imageUrl;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMedia && !item?.mediaFileId) {
      toast("error", "Please select an image from the media library");
      return;
    }
    setSaving(true);
    try {
      const method = item ? "PATCH" : "POST";
      const body = item
        ? {
            id: item.id,
            title,
            desc,
            mediaFileId: selectedMedia?.id ?? item.mediaFileId,
            imageUrl: selectedMedia?.url ?? item.imageUrl,
            gradient,
          }
        : {
            title,
            desc,
            mediaFileId: selectedMedia!.id,
            imageUrl: selectedMedia!.url,
            gradient,
          };

      const res = await fetch("/api/admin/homepage/gallery", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        onSave();
      } else {
        toast("error", json.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save gallery item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm"
      >
        <h3 className="mb-4 font-semibold text-gray-900">
          {item ? "Edit Gallery Item" : "New Gallery Item"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Banquet Hall"
            required
          />
          <Field
            label="Description"
            value={desc}
            onChange={setDesc}
            placeholder="Accommodates up to 600 guests"
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Gradient Color
            </label>
            <select
              value={gradient}
              onChange={(e) => setGradient(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            >
              {GRADIENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Image
            </label>
            <div className="flex items-center gap-3">
              {previewUrl && (
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {previewUrl ? "Change" : "Select from Media Library"}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : item ? "Update" : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      <MediaPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={setSelectedMedia}
      />
    </>
  );
}

// ── Services Editor ─────────────────────────────────────────────────

function ServicesEditor() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/services");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      toast("error", "Failed to load service items");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete service",
      message: "This service will be permanently removed from the homepage.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/homepage/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "Service deleted");
        fetchItems();
      } else {
        toast("error", json.error || "Failed to delete");
      }
    } catch {
      toast("error", "Failed to delete service");
    }
  };

  const handleToggleVisibility = async (item: ServiceItem) => {
    try {
      const res = await fetch("/api/admin/homepage/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, visible: !item.visible }),
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      } else {
        toast("error", json.error || "Failed to update");
      }
    } catch {
      toast("error", "Failed to update service");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Services</h2>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Add Service
        </button>
      </div>

      {showAddForm && (
        <ServiceItemForm
          onSave={() => {
            setShowAddForm(false);
            fetchItems();
            toast("success", "Service added");
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {items.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No services yet. Click &quot;Add Service&quot; to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <ServiceItemForm
                key={item.id}
                item={item}
                onSave={() => {
                  setEditingId(null);
                  fetchItems();
                  toast("success", "Service updated");
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 ${
                  item.visible ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 sm:contents">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={item.iconSvg}
                      />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="truncate text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(item)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.visible
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {item.visible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setShowAddForm(false);
                    }}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ServiceItemForm({
  item,
  onSave,
  onCancel,
}: {
  item?: ServiceItem;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(item?.title ?? "");
  const [desc, setDesc] = useState(item?.desc ?? "");
  const [iconSvg, setIconSvg] = useState(item?.iconSvg ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!iconSvg) {
      toast("error", "Please select an icon");
      return;
    }
    setSaving(true);
    try {
      const method = item ? "PATCH" : "POST";
      const body = item
        ? { id: item.id, title, desc, iconSvg }
        : { title, desc, iconSvg };

      const res = await fetch("/api/admin/homepage/services", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        onSave();
      } else {
        toast("error", json.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm"
    >
      <h3 className="mb-4 font-semibold text-gray-900">
        {item ? "Edit Service" : "New Service"}
      </h3>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Event Planning & Décor"
            required
          />
          <Field
            label="Description"
            value={desc}
            onChange={setDesc}
            placeholder="End-to-end event coordination..."
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESET_ICONS).map(([name, path]) => (
              <button
                key={name}
                type="button"
                onClick={() => setIconSvg(path)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                  iconSvg === path
                    ? "border-brand-500 bg-brand-100 text-brand-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
                title={name}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d={path}
                  />
                </svg>
              </button>
            ))}
          </div>
          <div className="mt-2">
            <input
              type="text"
              value={iconSvg}
              onChange={(e) => setIconSvg(e.target.value)}
              placeholder="Or paste custom SVG path data (d attribute)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-600 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : item ? "Update" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Stats Editor ────────────────────────────────────────────────────

function StatsEditor() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<StatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/homepage/stats");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch {
      toast("error", "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete stat",
      message: "This stat will be permanently removed from the homepage.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/admin/homepage/stats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        toast("success", "Stat deleted");
        fetchItems();
      } else {
        toast("error", json.error || "Failed to delete");
      }
    } catch {
      toast("error", "Failed to delete stat");
    }
  };

  const handleToggleVisibility = async (item: StatItem) => {
    try {
      const res = await fetch("/api/admin/homepage/stats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, visible: !item.visible }),
      });
      const json = await res.json();
      if (json.success) {
        fetchItems();
      } else {
        toast("error", json.error || "Failed to update");
      }
    } catch {
      toast("error", "Failed to update stat");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Stats</h2>
          <p className="text-sm text-gray-600">
            Numbers displayed on the homepage stats strip (e.g. guest capacity,
            events hosted).
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Add Stat
        </button>
      </div>

      {showAddForm && (
        <StatItemForm
          onSave={() => {
            setShowAddForm(false);
            fetchItems();
            toast("success", "Stat added");
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {items.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          No stats yet. Click &quot;Add Stat&quot; to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            editingId === item.id ? (
              <StatItemForm
                key={item.id}
                item={item}
                onSave={() => {
                  setEditingId(null);
                  fetchItems();
                  toast("success", "Stat updated");
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={item.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4 ${
                  item.visible ? "border-gray-200" : "border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 sm:contents">
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-base font-bold text-brand-700">
                    {item.value}
                    {item.suffix}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {item.label}
                    </h3>
                    <p className="text-xs text-gray-500">Order: {item.order}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <button
                    onClick={() => handleToggleVisibility(item)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      item.visible
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {item.visible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setShowAddForm(false);
                    }}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function StatItemForm({
  item,
  onSave,
  onCancel,
}: {
  item?: StatItem;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState<string>(
    item?.value !== undefined ? String(item.value) : ""
  );
  const [suffix, setSuffix] = useState(item?.suffix ?? "");
  const [label, setLabel] = useState(item?.label ?? "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      toast("error", "Value must be a number");
      return;
    }
    if (!label.trim()) {
      toast("error", "Label is required");
      return;
    }
    setSaving(true);
    try {
      const method = item ? "PATCH" : "POST";
      const body = item
        ? {
            id: item.id,
            value: Math.trunc(numericValue),
            suffix,
            label: label.trim(),
          }
        : {
            value: Math.trunc(numericValue),
            suffix,
            label: label.trim(),
          };

      const res = await fetch("/api/admin/homepage/stats", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        onSave();
      } else {
        toast("error", json.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save stat");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-brand-200 bg-brand-50/50 p-5 shadow-sm"
    >
      <h3 className="mb-4 font-semibold text-gray-900">
        {item ? "Edit Stat" : "New Stat"}
      </h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Value
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="600"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Suffix
          </label>
          <input
            type="text"
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            placeholder="+"
            maxLength={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>
        <Field
          label="Label"
          value={label}
          onChange={setLabel}
          placeholder="Guest Capacity"
          required
        />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : item ? "Update" : "Add"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Shared Components ───────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
      />
    </div>
  );
}

// India-only phone input: locked "+91" prefix + 10-digit numeric input.
// `storageFormat` controls the canonical value held in state:
//   - "digits" → "91XXXXXXXXXX"   (used for WhatsApp, where wa.me wants digits only)
//   - "pretty" → "+91 XXXXX XXXXX" (used for the contact phone shown in the footer)
function PhoneField({
  label,
  value,
  onChange,
  required,
  storageFormat = "digits",
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
  storageFormat?: "digits" | "pretty";
}) {
  const allDigits = (value ?? "").replace(/\D+/g, "");
  let local = "";
  if (allDigits.length === 12 && allDigits.startsWith("91")) {
    local = allDigits.slice(2);
  } else if (allDigits.length <= 10) {
    local = allDigits;
  } else {
    local = allDigits.slice(-10);
  }

  const handleChange = (next: string) => {
    const digits = next.replace(/\D+/g, "").slice(0, 10);
    if (digits.length === 0) {
      onChange(null);
      return;
    }
    if (storageFormat === "digits") {
      onChange(`91${digits}`);
      return;
    }
    const formatted =
      digits.length === 10
        ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
        : `+91 ${digits}`;
    onChange(formatted);
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-300 transition-colors focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20">
        <span
          aria-hidden="true"
          className="flex select-none items-center border-r border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-600"
        >
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="9876543210"
          maxLength={10}
          pattern="\d{10}"
          required={required}
          aria-label={label}
          className="w-full bg-transparent px-3 py-2 text-sm tracking-wider outline-none"
        />
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>
  );
}

// ── Site Settings (Colors + Social) ─────────────────────────────────

interface SiteSettingsData {
  themeMode: "PRESET" | "CUSTOM";
  themePreset: string;
  themePrimaryHex: string | null;
  themeAccentHex: string | null;
  instagramEnabled: boolean;
  instagramUrl: string | null;
  mapsEnabled: boolean;
  mapsEmbedUrl: string | null;
  mapsLinkUrl: string | null;
  whatsappEnabled: boolean;
  whatsappPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  aboutBlurb: string | null;
  metaDescription: string | null;
}

const DEFAULT_SETTINGS: SiteSettingsData = {
  themeMode: "PRESET",
  themePreset: "amber",
  themePrimaryHex: null,
  themeAccentHex: null,
  instagramEnabled: true,
  instagramUrl: null,
  mapsEnabled: true,
  mapsEmbedUrl: null,
  mapsLinkUrl: null,
  whatsappEnabled: false,
  whatsappPhone: null,
  addressLine1: null,
  addressLine2: null,
  contactPhone: null,
  contactEmail: null,
  aboutBlurb: null,
  metaDescription: null,
};

function useSiteSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SiteSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/site-settings");
      const json = await res.json();
      if (json.success && json.data) {
        setSettings({
          themeMode:
            json.data.themeMode === "CUSTOM" ? "CUSTOM" : "PRESET",
          themePreset: json.data.themePreset ?? "amber",
          themePrimaryHex: json.data.themePrimaryHex ?? null,
          themeAccentHex: json.data.themeAccentHex ?? null,
          instagramEnabled: !!json.data.instagramEnabled,
          instagramUrl: json.data.instagramUrl ?? null,
          mapsEnabled: !!json.data.mapsEnabled,
          mapsEmbedUrl: json.data.mapsEmbedUrl ?? null,
          mapsLinkUrl: json.data.mapsLinkUrl ?? null,
          whatsappEnabled: !!json.data.whatsappEnabled,
          whatsappPhone: json.data.whatsappPhone ?? null,
          addressLine1: json.data.addressLine1 ?? null,
          addressLine2: json.data.addressLine2 ?? null,
          contactPhone: json.data.contactPhone ?? null,
          contactEmail: json.data.contactEmail ?? null,
          aboutBlurb: json.data.aboutBlurb ?? null,
          metaDescription: json.data.metaDescription ?? null,
        });
      } else {
        setSettings({ ...DEFAULT_SETTINGS });
      }
    } catch {
      toast("error", "Failed to load site settings");
      setSettings({ ...DEFAULT_SETTINGS });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { settings, setSettings, loading, refetch };
}

async function saveSettings(payload: SiteSettingsData) {
  const res = await fetch("/api/admin/site-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as { success: boolean; error?: string };
}

// ── Colors Editor ───────────────────────────────────────────────────

function ColorsEditor() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, setSettings, loading } = useSiteSettings();
  const [saving, setSaving] = useState(false);

  if (loading || !settings) return <Spinner />;

  const update = <K extends keyof SiteSettingsData>(
    key: K,
    value: SiteSettingsData[K]
  ) => setSettings({ ...settings, [key]: value });

  const previewPalette: Palette =
    settings.themeMode === "CUSTOM" &&
    settings.themePrimaryHex &&
    isValidHex(settings.themePrimaryHex)
      ? derivePaletteFromHex(settings.themePrimaryHex)
      : PRESETS[
          (PRESET_KEYS as readonly string[]).includes(settings.themePreset)
            ? (settings.themePreset as (typeof PRESET_KEYS)[number])
            : "amber"
        ];

  const previewAccent: Palette | null =
    settings.themeAccentHex && isValidHex(settings.themeAccentHex)
      ? derivePaletteFromHex(settings.themeAccentHex)
      : null;

  const previewStyle = {
    "--brand-50": previewPalette["50"],
    "--brand-100": previewPalette["100"],
    "--brand-200": previewPalette["200"],
    "--brand-300": previewPalette["300"],
    "--brand-400": previewPalette["400"],
    "--brand-500": previewPalette["500"],
    "--brand-600": previewPalette["600"],
    "--brand-700": previewPalette["700"],
    "--brand-800": previewPalette["800"],
    "--brand-900": previewPalette["900"],
    "--brand-950": previewPalette["950"],
    "--accent-500": (previewAccent ?? previewPalette)["500"],
    "--accent-700": (previewAccent ?? previewPalette)["700"],
  } as React.CSSProperties;

  const handleSave = async () => {
    if (
      settings.themeMode === "CUSTOM" &&
      (!settings.themePrimaryHex || !isValidHex(settings.themePrimaryHex))
    ) {
      toast("error", "Please pick a valid primary colour");
      return;
    }
    setSaving(true);
    try {
      const res = await saveSettings(settings);
      if (res.success) {
        toast("success", "Theme saved");
        router.refresh();
      } else {
        toast("error", res.error || "Failed to save theme");
      }
    } catch {
      toast("error", "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Brand Colour</h2>
        <p className="mb-5 text-sm text-gray-600">
          Pick a curated preset or define your own primary colour. Selected colours apply across every page.
        </p>

        <div className="mb-5 inline-flex rounded-lg bg-gray-100 p-1">
          {(["PRESET", "CUSTOM"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update("themeMode", mode)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                settings.themeMode === mode
                  ? "bg-white text-brand-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {mode === "PRESET" ? "Preset" : "Custom"}
            </button>
          ))}
        </div>

        {settings.themeMode === "PRESET" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PRESET_KEYS.map((key) => {
              const palette = PRESETS[key];
              const selected = settings.themePreset === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => update("themePreset", key)}
                  className={`group rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-brand-500 ring-2 ring-brand-500/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2 flex h-10 overflow-hidden rounded-md">
                    <span
                      className="flex-1"
                      style={{ background: palette["300"] }}
                    />
                    <span
                      className="flex-1"
                      style={{ background: palette["500"] }}
                    />
                    <span
                      className="flex-1"
                      style={{ background: palette["700"] }}
                    />
                    <span
                      className="flex-1"
                      style={{ background: palette["900"] }}
                    />
                  </div>
                  <p className="text-sm font-medium capitalize text-gray-900">
                    {key}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-5">
            <CustomColourField
              label="Primary colour"
              hint="Used for buttons, links, brand surfaces. Shades 50–950 are derived automatically."
              value={settings.themePrimaryHex}
              onChange={(v) => update("themePrimaryHex", v)}
              defaultHex="#b45309"
            />
            <CustomColourField
              label="Accent colour (optional)"
              hint="Used for highlights/CTAs. Leave empty to fall back to the brand colour."
              value={settings.themeAccentHex}
              onChange={(v) => update("themeAccentHex", v)}
              allowClear
              defaultHex="#d97706"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Preview</h2>
        <div
          style={previewStyle}
          className="rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-600">
            Sample section
          </p>
          <h3 className="mb-3 text-2xl font-bold text-brand-900">
            {APP_NAME}
          </h3>
          <p className="mb-4 max-w-md text-sm text-brand-800/80">
            This is what your buttons, badges, and surfaces look like with the selected palette.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-brand-700"
            >
              Primary action
            </button>
            <button
              type="button"
              className="rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              Secondary
            </button>
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
              Badge
            </span>
            <span
              className="inline-block h-10 w-32 rounded-lg bg-gradient-to-r from-brand-600 to-brand-900"
              aria-hidden="true"
            />
          </div>
          <div className="mt-4 grid grid-cols-11 gap-1">
            {(
              ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const
            ).map((step) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <span
                  className="h-8 w-full rounded"
                  style={{ background: previewPalette[step] }}
                />
                <span className="text-[10px] text-brand-800/70">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Theme"}
        </button>
      </div>
    </div>
  );
}

function CustomColourField({
  label,
  hint,
  value,
  onChange,
  allowClear,
  defaultHex,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (v: string | null) => void;
  allowClear?: boolean;
  defaultHex: string;
}) {
  const [textValue, setTextValue] = useState(value ?? "");

  useEffect(() => {
    setTextValue(value ?? "");
  }, [value]);

  const previewHex = value && isValidHex(value) ? normaliseHex(value) : null;
  const previewPalette: Palette | null = previewHex
    ? derivePaletteFromHex(previewHex)
    : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            Use brand colour
          </button>
        )}
      </div>
      {hint && <p className="mb-3 text-xs text-gray-500">{hint}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="color"
          value={previewHex ?? defaultHex}
          onChange={(e) => onChange(normaliseHex(e.target.value))}
          className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
          aria-label={`${label} colour picker`}
        />
        <input
          type="text"
          value={textValue}
          onChange={(e) => {
            const v = e.target.value;
            setTextValue(v);
            const trimmed = v.trim();
            if (!trimmed) {
              if (allowClear) onChange(null);
              return;
            }
            if (isValidHex(trimmed)) onChange(normaliseHex(trimmed));
          }}
          placeholder="#b45309"
          className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
        />
        {previewPalette && (
          <div className="flex items-center gap-1">
            {(["50", "300", "500", "700", "900"] as const).map((step) => (
              <span
                key={step}
                className="h-7 w-7 rounded-md border border-black/10"
                style={{ background: previewPalette[step] }}
                title={`${step}: ${previewPalette[step]}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Social Apps Editor ──────────────────────────────────────────────

function SocialEditor() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, setSettings, loading } = useSiteSettings();
  const [saving, setSaving] = useState(false);

  if (loading || !settings) return <Spinner />;

  const update = <K extends keyof SiteSettingsData>(
    key: K,
    value: SiteSettingsData[K]
  ) => setSettings({ ...settings, [key]: value });

  const validate = () => {
    if (settings.instagramEnabled) {
      const url = settings.instagramUrl?.trim();
      if (!url) return "Instagram URL is required when Instagram is enabled";
      try {
        new URL(url);
      } catch {
        return "Instagram URL must be a valid URL";
      }
    }
    if (settings.mapsEnabled) {
      const url = settings.mapsEmbedUrl?.trim();
      if (!url) return "Google Maps embed URL is required when Maps is enabled";
      try {
        new URL(url);
      } catch {
        return "Google Maps embed URL must be a valid URL";
      }
      if (settings.mapsLinkUrl?.trim()) {
        try {
          new URL(settings.mapsLinkUrl);
        } catch {
          return "Directions URL must be a valid URL";
        }
      }
    }
    if (settings.whatsappEnabled) {
      const phone = settings.whatsappPhone?.trim();
      if (!phone) return "WhatsApp phone number is required when WhatsApp is enabled";
      if (!/^91\d{10}$/.test(phone))
        return "WhatsApp phone must be a 10-digit Indian number";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast("error", err);
      return;
    }
    setSaving(true);
    try {
      const payload: SiteSettingsData = {
        ...settings,
        instagramUrl: settings.instagramUrl?.trim() || null,
        mapsEmbedUrl: settings.mapsEmbedUrl?.trim() || null,
        mapsLinkUrl: settings.mapsLinkUrl?.trim() || null,
        whatsappPhone: settings.whatsappPhone?.trim() || null,
      };
      const res = await saveSettings(payload);
      if (res.success) {
        toast("success", "Social settings saved");
        router.refresh();
      } else {
        toast("error", res.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Instagram */}
      <SocialCard
        title="Instagram"
        description="Show the Instagram highlight section on the homepage and a footer quick-link."
        enabled={settings.instagramEnabled}
        onToggle={(v) => update("instagramEnabled", v)}
      >
        <Field
          label="Profile URL"
          value={settings.instagramUrl ?? ""}
          onChange={(v) => update("instagramUrl", v)}
          placeholder="https://www.instagram.com/yourhandle"
          required
        />
      </SocialCard>

      {/* Google Maps */}
      <SocialCard
        title="Google Maps"
        description="Show the location section on the homepage and a footer quick-link."
        enabled={settings.mapsEnabled}
        onToggle={(v) => update("mapsEnabled", v)}
      >
        <div className="space-y-3">
          <Field
            label="Embed URL"
            value={settings.mapsEmbedUrl ?? ""}
            onChange={(v) => update("mapsEmbedUrl", v)}
            placeholder="https://www.google.com/maps/embed?pb=..."
            required
          />
          <p className="-mt-1 text-xs text-gray-500">
            From Google Maps → Share → Embed a map → copy the <code>src</code> from the iframe.
          </p>
          <Field
            label="Directions URL (optional)"
            value={settings.mapsLinkUrl ?? ""}
            onChange={(v) => update("mapsLinkUrl", v)}
            placeholder="https://maps.app.goo.gl/..."
          />
        </div>
      </SocialCard>

      {/* WhatsApp */}
      <SocialCard
        title="WhatsApp Float Button"
        description="A circular WhatsApp FAB on the homepage that opens a chat with the configured number."
        enabled={settings.whatsappEnabled}
        onToggle={(v) => update("whatsappEnabled", v)}
      >
        <PhoneField
          label="Phone number"
          value={settings.whatsappPhone}
          onChange={(v) => update("whatsappPhone", v)}
          storageFormat="digits"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Indian mobile number, 10 digits — the +91 country code is added
          automatically.
        </p>
      </SocialCard>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Social Settings"}
        </button>
      </div>
    </div>
  );
}

function SocialCard({
  title,
  description,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-brand-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
          <span className="sr-only">
            {enabled ? "Disable" : "Enable"} {title}
          </span>
        </button>
      </div>
      {enabled && <div>{children}</div>}
    </div>
  );
}

// ── Contact / About Editor ─────────────────────────────────────────

function ContactEditor() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, setSettings, loading } = useSiteSettings();
  const [saving, setSaving] = useState(false);

  if (loading || !settings) return <Spinner />;

  const update = <K extends keyof SiteSettingsData>(
    key: K,
    value: SiteSettingsData[K]
  ) => setSettings({ ...settings, [key]: value });

  const validate = () => {
    const email = settings.contactEmail?.trim();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return "Contact email must be a valid email";
    }
    const phone = settings.contactPhone?.trim();
    if (phone && !/^\+91 \d{5} \d{5}$/.test(phone)) {
      return "Contact phone must be a 10-digit Indian number";
    }
    if (settings.aboutBlurb && settings.aboutBlurb.length > 800) {
      return "About blurb must be 800 characters or fewer";
    }
    if (settings.metaDescription && settings.metaDescription.length > 300) {
      return "Meta description must be 300 characters or fewer";
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      toast("error", err);
      return;
    }
    setSaving(true);
    try {
      const payload: SiteSettingsData = {
        ...settings,
        addressLine1: settings.addressLine1?.trim() || null,
        addressLine2: settings.addressLine2?.trim() || null,
        contactPhone: settings.contactPhone?.trim() || null,
        contactEmail: settings.contactEmail?.trim() || null,
        aboutBlurb: settings.aboutBlurb?.trim() || null,
        metaDescription: settings.metaDescription?.trim() || null,
      };
      const res = await saveSettings(payload);
      if (res.success) {
        toast("success", "Contact details saved");
        router.refresh();
      } else {
        toast("error", res.error || "Failed to save");
      }
    } catch {
      toast("error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Address</h2>
          <p className="mt-1 text-sm text-gray-600">
            Used in the homepage location section and the footer contact
            column. Leave both lines empty to hide the address.
          </p>
        </div>
        <div className="space-y-3">
          <Field
            label="Address line 1"
            value={settings.addressLine1 ?? ""}
            onChange={(v) => update("addressLine1", v)}
            placeholder="9-4-86/227, AR Center, 5th & 6th Floor"
          />
          <Field
            label="Address line 2"
            value={settings.addressLine2 ?? ""}
            onChange={(v) => update("addressLine2", v)}
            placeholder="Tolichowki Road, Hyderabad, Telangana 500008"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Contact details
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Phone and email shown in the footer contact column. Leave empty
            to hide.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField
            label="Phone"
            value={settings.contactPhone}
            onChange={(v) => update("contactPhone", v)}
            storageFormat="pretty"
          />
          <Field
            label="Email"
            value={settings.contactEmail ?? ""}
            onChange={(v) => update("contactEmail", v)}
            placeholder="info@arbanquet.com"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">About</h2>
          <p className="mt-1 text-sm text-gray-600">
            Short blurb shown in the footer next to the brand name.
          </p>
        </div>
        <TextareaField
          label="About blurb"
          value={settings.aboutBlurb ?? ""}
          onChange={(v) => update("aboutBlurb", v)}
          placeholder="Hyderabad's premier banquet hall for weddings, receptions, engagements, and celebrations..."
          rows={4}
          maxLength={800}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">SEO</h2>
          <p className="mt-1 text-sm text-gray-600">
            Description used as the site&apos;s HTML meta description for
            search engines and link previews.
          </p>
        </div>
        <TextareaField
          label="Meta description"
          value={settings.metaDescription ?? ""}
          onChange={(v) => update("metaDescription", v)}
          placeholder="A short, compelling sentence (under 160 characters works best)."
          rows={3}
          maxLength={300}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Contact Details"}
        </button>
      </div>
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {maxLength !== undefined && (
          <span
            className={`text-xs ${
              value.length > maxLength ? "text-red-600" : "text-gray-500"
            }`}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
      />
    </div>
  );
}
