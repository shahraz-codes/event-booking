// Palette utilities for the customisable site theme.
// Provides curated Tailwind-default presets and an OKLCH-based hex derivation
// so a single primary colour expands into the same 50–950 scale shape
// Tailwind itself uses, with no runtime dependencies.

export type PaletteStep =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950";

export type Palette = Record<PaletteStep, string>;

export const PALETTE_STEPS: PaletteStep[] = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

export const PRESET_KEYS = [
  "amber",
  "emerald",
  "rose",
  "violet",
  "blue",
  "teal",
] as const;

export type PresetKey = (typeof PRESET_KEYS)[number];

// Tailwind v4 default palette hex values (copied — no runtime tailwind dep).
export const PRESETS: Record<PresetKey, Palette> = {
  amber: {
    "50": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
    "950": "#451a03",
  },
  emerald: {
    "50": "#ecfdf5",
    "100": "#d1fae5",
    "200": "#a7f3d0",
    "300": "#6ee7b7",
    "400": "#34d399",
    "500": "#10b981",
    "600": "#059669",
    "700": "#047857",
    "800": "#065f46",
    "900": "#064e3b",
    "950": "#022c22",
  },
  rose: {
    "50": "#fff1f2",
    "100": "#ffe4e6",
    "200": "#fecdd3",
    "300": "#fda4af",
    "400": "#fb7185",
    "500": "#f43f5e",
    "600": "#e11d48",
    "700": "#be123c",
    "800": "#9f1239",
    "900": "#881337",
    "950": "#4c0519",
  },
  violet: {
    "50": "#f5f3ff",
    "100": "#ede9fe",
    "200": "#ddd6fe",
    "300": "#c4b5fd",
    "400": "#a78bfa",
    "500": "#8b5cf6",
    "600": "#7c3aed",
    "700": "#6d28d9",
    "800": "#5b21b6",
    "900": "#4c1d95",
    "950": "#2e1065",
  },
  blue: {
    "50": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
    "950": "#172554",
  },
  teal: {
    "50": "#f0fdfa",
    "100": "#ccfbf1",
    "200": "#99f6e4",
    "300": "#5eead4",
    "400": "#2dd4bf",
    "500": "#14b8a6",
    "600": "#0d9488",
    "700": "#0f766e",
    "800": "#115e59",
    "900": "#134e4a",
    "950": "#042f2e",
  },
};

// Per-step lightness targets (in OKLCH lightness space, 0..1) that approximate
// Tailwind's modern colour scale shape. Steps go from very light (50) to very
// dark (950).
const LIGHTNESS_BY_STEP: Record<PaletteStep, number> = {
  "50": 0.97,
  "100": 0.93,
  "200": 0.86,
  "300": 0.76,
  "400": 0.65,
  "500": 0.55,
  "600": 0.47,
  "700": 0.4,
  "800": 0.34,
  "900": 0.27,
  "950": 0.2,
};

// Per-step chroma scaling. Mid-range steps stay close to the base chroma;
// very light/dark steps reduce chroma so they don't look neon.
const CHROMA_SCALE_BY_STEP: Record<PaletteStep, number> = {
  "50": 0.18,
  "100": 0.32,
  "200": 0.55,
  "300": 0.78,
  "400": 0.94,
  "500": 1,
  "600": 0.96,
  "700": 0.88,
  "800": 0.78,
  "900": 0.66,
  "950": 0.5,
};

// ── Colour conversions (sRGB ⇄ OKLab/OKLCH) ─────────────────────────

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.trim().replace(/^#/, "");
  const expanded = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m;
  if (expanded.length !== 6) {
    throw new Error(`Invalid hex colour: ${hex}`);
  }
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return [r / 255, g / 255, b / 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// Reference: https://bottosson.github.io/posts/oklab/
function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function oklabToLinearRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function hexToOklch(hex: string): { L: number; C: number; h: number } {
  const [r, g, b] = hexToRgb(hex);
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const [L, a, bb] = linearRgbToOklab(lr, lg, lb);
  const C = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

function oklchToHex(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const [lr, lg, lb] = oklabToLinearRgb(L, a, b);
  return rgbToHex(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb));
}

// ── Public API ──────────────────────────────────────────────────────

export function isValidHex(value: string): boolean {
  return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value.trim());
}

export function normaliseHex(value: string): string {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (withHash.length === 4) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return withHash.toLowerCase();
}

// Derive a full 50–950 scale from a primary hex by walking the OKLCH lightness
// curve while keeping hue constant. Chroma is scaled per step so the lightest
// and darkest ends don't oversaturate.
export function derivePaletteFromHex(hex: string): Palette {
  const { C, h } = hexToOklch(normaliseHex(hex));
  const result = {} as Palette;
  for (const step of PALETTE_STEPS) {
    const L = LIGHTNESS_BY_STEP[step];
    const c = C * CHROMA_SCALE_BY_STEP[step];
    result[step] = oklchToHex(L, c, h);
  }
  return result;
}

export function getPresetPalette(key: string): Palette {
  if ((PRESET_KEYS as readonly string[]).includes(key)) {
    return PRESETS[key as PresetKey];
  }
  return PRESETS.amber;
}

// Resolve the brand + (optional) accent palette for a given settings record.
export interface ResolvedTheme {
  brand: Palette;
  accent: Palette | null;
}

export interface ThemeInput {
  themeMode: string;
  themePreset: string;
  themePrimaryHex: string | null;
  themeAccentHex: string | null;
}

export function resolveTheme(input: ThemeInput): ResolvedTheme {
  const brand =
    input.themeMode === "CUSTOM" && input.themePrimaryHex && isValidHex(input.themePrimaryHex)
      ? derivePaletteFromHex(input.themePrimaryHex)
      : getPresetPalette(input.themePreset);

  const accent =
    input.themeAccentHex && isValidHex(input.themeAccentHex)
      ? derivePaletteFromHex(input.themeAccentHex)
      : null;

  return { brand, accent };
}

// Build the inline <style> body that overrides :root CSS variables.
export function buildThemeCss(theme: ResolvedTheme): string {
  const lines: string[] = [":root {"];
  for (const step of PALETTE_STEPS) {
    lines.push(`  --brand-${step}: ${theme.brand[step]};`);
  }
  if (theme.accent) {
    for (const step of PALETTE_STEPS) {
      lines.push(`  --accent-${step}: ${theme.accent[step]};`);
    }
  } else {
    // Fall back to brand for accent so any `accent-*` utilities still resolve.
    for (const step of PALETTE_STEPS) {
      lines.push(`  --accent-${step}: ${theme.brand[step]};`);
    }
  }
  lines.push("}");
  return lines.join("\n");
}
