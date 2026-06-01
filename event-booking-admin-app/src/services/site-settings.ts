import { apiFetch } from "@/lib/api-client";

export const PRESET_KEYS = [
  "amber",
  "emerald",
  "rose",
  "violet",
  "blue",
  "teal",
] as const;
export type PresetKey = (typeof PRESET_KEYS)[number];

export interface SiteSettings {
  themeMode: "PRESET" | "CUSTOM";
  themePreset: PresetKey;
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

export function getSiteSettings() {
  return apiFetch<SiteSettings>("/api/admin/site-settings");
}

export function updateSiteSettings(settings: SiteSettings) {
  return apiFetch<SiteSettings>("/api/admin/site-settings", {
    method: "PUT",
    body: settings,
  });
}

export function isValidHex(value: string): boolean {
  return /^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value.trim());
}
