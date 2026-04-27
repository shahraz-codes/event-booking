import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/services/site-settings.service";
import { PRESET_KEYS, isValidHex, normaliseHex } from "@/lib/palette";
import { getZodErrorMessage } from "@/types";

const UNAUTHORIZED = () =>
  Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

const hexSchema = z
  .string()
  .trim()
  .refine(isValidHex, "Invalid hex colour")
  .transform(normaliseHex);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

const settingsSchema = z
  .object({
    themeMode: z.enum(["PRESET", "CUSTOM"]),
    themePreset: z.enum([...PRESET_KEYS]),
    themePrimaryHex: hexSchema.nullable(),
    themeAccentHex: hexSchema.nullable(),
    instagramEnabled: z.boolean(),
    instagramUrl: z
      .string()
      .trim()
      .url("Instagram URL must be a valid URL")
      .nullable(),
    mapsEnabled: z.boolean(),
    mapsEmbedUrl: z
      .string()
      .trim()
      .url("Google Maps embed URL must be a valid URL")
      .nullable(),
    mapsLinkUrl: z
      .string()
      .trim()
      .url("Directions URL must be a valid URL")
      .nullable(),
    whatsappEnabled: z.boolean(),
    whatsappPhone: z
      .string()
      .trim()
      .regex(
        /^91\d{10}$/,
        "WhatsApp phone must be a 10-digit Indian number (stored as 91XXXXXXXXXX)"
      )
      .nullable(),
    addressLine1: optionalText(200, "Address line 1"),
    addressLine2: optionalText(200, "Address line 2"),
    contactPhone: z
      .string()
      .trim()
      .nullable()
      .refine(
        (v) => !v || /^\+91 \d{5} \d{5}$/.test(v),
        "Contact phone must be a 10-digit Indian number (formatted as +91 XXXXX XXXXX)"
      )
      .transform((v) => (v && v.length > 0 ? v : null)),
    contactEmail: z
      .string()
      .trim()
      .nullable()
      .refine(
        (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
        "Contact email must be a valid email"
      )
      .transform((v) => (v && v.length > 0 ? v : null)),
    aboutBlurb: optionalText(800, "About blurb"),
    metaDescription: optionalText(300, "Meta description"),
  })
  .superRefine((data, ctx) => {
    if (data.themeMode === "CUSTOM" && !data.themePrimaryHex) {
      ctx.addIssue({
        code: "custom",
        path: ["themePrimaryHex"],
        message: "Custom theme requires a primary colour",
      });
    }
    if (data.instagramEnabled && !data.instagramUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["instagramUrl"],
        message: "Instagram URL is required when Instagram is enabled",
      });
    }
    if (data.mapsEnabled && !data.mapsEmbedUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["mapsEmbedUrl"],
        message: "Google Maps embed URL is required when Maps is enabled",
      });
    }
    if (data.whatsappEnabled && !data.whatsappPhone) {
      ctx.addIssue({
        code: "custom",
        path: ["whatsappPhone"],
        message: "WhatsApp phone number is required when WhatsApp is enabled",
      });
    }
  });

export async function GET() {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const settings = await getSiteSettings();
    return Response.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get site settings error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch site settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await getAdminSession())) return UNAUTHORIZED();
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: getZodErrorMessage(parsed.error) },
        { status: 400 }
      );
    }

    const settings = await updateSiteSettings(parsed.data);

    revalidatePath("/", "layout");
    return Response.json({ success: true, data: settings });
  } catch (error) {
    console.error("Update site settings error:", error);
    return Response.json(
      { success: false, error: "Failed to update site settings" },
      { status: 500 }
    );
  }
}
