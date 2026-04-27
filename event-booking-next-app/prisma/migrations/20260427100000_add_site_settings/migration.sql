-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "themeMode" TEXT NOT NULL DEFAULT 'PRESET',
    "themePreset" TEXT NOT NULL DEFAULT 'amber',
    "themePrimaryHex" TEXT,
    "themeAccentHex" TEXT,
    "instagramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "instagramUrl" TEXT,
    "mapsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mapsEmbedUrl" TEXT,
    "mapsLinkUrl" TEXT,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
