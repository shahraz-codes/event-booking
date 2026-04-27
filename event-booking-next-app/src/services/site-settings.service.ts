import { prisma } from "@/lib/prisma";
import { resolveTheme, type ResolvedTheme } from "@/lib/palette";

const SETTINGS_ID = "default";

export interface SiteSettingsRecord {
  id: string;
  themeMode: string;
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
  updatedAt: Date;
}

const DEFAULTS: Omit<SiteSettingsRecord, "updatedAt"> = {
  id: SETTINGS_ID,
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

export async function getSiteSettings(): Promise<SiteSettingsRecord> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (!row) {
    return { ...DEFAULTS, updatedAt: new Date(0) };
  }
  return row as SiteSettingsRecord;
}

export interface UpdatableSettings {
  themeMode?: string;
  themePreset?: string;
  themePrimaryHex?: string | null;
  themeAccentHex?: string | null;
  instagramEnabled?: boolean;
  instagramUrl?: string | null;
  mapsEnabled?: boolean;
  mapsEmbedUrl?: string | null;
  mapsLinkUrl?: string | null;
  whatsappEnabled?: boolean;
  whatsappPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  aboutBlurb?: string | null;
  metaDescription?: string | null;
}

export async function updateSiteSettings(
  data: UpdatableSettings
): Promise<SiteSettingsRecord> {
  const { id: _id, ...defaultsWithoutId } = DEFAULTS;
  void _id;
  const row = await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...defaultsWithoutId, ...data },
    update: data,
  });
  return row as SiteSettingsRecord;
}

export function getResolvedTheme(settings: SiteSettingsRecord): ResolvedTheme {
  return resolveTheme({
    themeMode: settings.themeMode,
    themePreset: settings.themePreset,
    themePrimaryHex: settings.themePrimaryHex,
    themeAccentHex: settings.themeAccentHex,
  });
}
