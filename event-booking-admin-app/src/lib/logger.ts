import { AppState, Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import Constants from "expo-constants";

type Level = "debug" | "info" | "warn" | "error";

const MAX_BYTES = 1_000_000; // ~1 MB before the current file rolls over to .prev
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 100; // flush after this many buffered lines
const REDACT_KEYS = [
  "authorization",
  "token",
  "access_token",
  "refresh_token",
  "password",
  "apikey",
  "api_key",
  "anon_key",
  "secret",
];

let dir: Directory | null = null;
let logFile: File | null = null;
let prevFile: File | null = null;
let fileBuffer = ""; // in-memory copy of the current log file's contents
let pending: string[] = [];
let ready = false;
let installed = false;
let timer: ReturnType<typeof setInterval> | null = null;

function ensureFiles() {
  if (dir && logFile && prevFile) return;
  dir = new Directory(Paths.document, "logs");
  try {
    dir.create({ intermediates: true, idempotent: true });
  } catch {
    // already exists
  }
  logFile = new File(dir, "app.log");
  prevFile = new File(dir, "app.prev.log");
  if (!logFile.exists) {
    try {
      logFile.create();
    } catch {
      // ignore
    }
  }
}

function redactValue(v: unknown): unknown {
  if (typeof v === "string") {
    let s = v.length > 500 ? `${v.slice(0, 500)}…` : v;
    s = s.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer …");
    return s;
  }
  if (Array.isArray(v)) return v.map(redactValue);
  if (v && typeof v === "object") return redact(v as Record<string, unknown>);
  return v;
}

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    out[k] = REDACT_KEYS.includes(k.toLowerCase()) ? "[redacted]" : redactValue(val);
  }
  return out;
}

function makeLine(level: Level, tag: string, msg: string, ctx?: Record<string, unknown>) {
  return JSON.stringify({
    t: new Date().toISOString(),
    lvl: level,
    tag,
    msg,
    ...(ctx ? { ctx: redact(ctx) } : {}),
  });
}

function push(level: Level, tag: string, msg: string, ctx?: Record<string, unknown>) {
  pending.push(makeLine(level, tag, msg, ctx));
  if (__DEV__) {
    const fn = level === "debug" ? "log" : level;
    // eslint-disable-next-line no-console
    (console[fn] as (...a: unknown[]) => void)(`[${tag}] ${msg}`, ctx ?? "");
  }
  if (pending.length >= FLUSH_THRESHOLD) flush();
}

export function flush() {
  if (!ready || pending.length === 0) return;
  try {
    ensureFiles();
    const chunk = `${pending.join("\n")}\n`;
    pending = [];
    fileBuffer += chunk;
    if (fileBuffer.length > MAX_BYTES) {
      // Roll the current file over to "previous", start the current file fresh.
      try {
        prevFile!.write(fileBuffer);
      } catch {
        // ignore
      }
      fileBuffer = "";
    }
    logFile!.write(fileBuffer);
  } catch {
    // Never let logging crash the app.
  }
}

export const log = {
  debug: (tag: string, msg: string, ctx?: Record<string, unknown>) => push("debug", tag, msg, ctx),
  info: (tag: string, msg: string, ctx?: Record<string, unknown>) => push("info", tag, msg, ctx),
  warn: (tag: string, msg: string, ctx?: Record<string, unknown>) => push("warn", tag, msg, ctx),
  error: (tag: string, msg: string, ctx?: Record<string, unknown>) => push("error", tag, msg, ctx),
};

export async function getRecentLines(n = 100): Promise<string[]> {
  flush();
  try {
    ensureFiles();
    const current = logFile!.exists ? await logFile!.text() : "";
    return current.trim().split("\n").filter(Boolean).slice(-n);
  } catch {
    return [];
  }
}

/** Writes a combined, shareable export file (previous + current) and returns it. */
export async function buildExportFile(): Promise<File | null> {
  flush();
  try {
    ensureFiles();
    const prev = prevFile!.exists ? await prevFile!.text() : "";
    const current = logFile!.exists ? await logFile!.text() : "";
    const header =
      `# AR Banquets Admin — diagnostic logs\n` +
      `# app=${Constants.expoConfig?.version ?? "?"} platform=${Platform.OS} exported=${new Date().toISOString()}\n\n`;
    const exportFile = new File(dir!, "app.export.log");
    if (exportFile.exists) {
      try {
        exportFile.delete();
      } catch {
        // ignore
      }
    }
    exportFile.create();
    exportFile.write(header + prev + current);
    return exportFile;
  } catch {
    return null;
  }
}

export function clearLogs() {
  try {
    ensureFiles();
    pending = [];
    fileBuffer = "";
    if (logFile!.exists) logFile!.write("");
    if (prevFile!.exists) {
      try {
        prevFile!.delete();
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export function installLogging() {
  if (installed) return;
  installed = true;
  ensureFiles();

  // Load existing current-file content so we append across launches, then allow flushing.
  (async () => {
    try {
      fileBuffer = logFile!.exists ? await logFile!.text() : "";
    } catch {
      fileBuffer = "";
    }
    ready = true;
    flush();
  })();

  log.info("app", "logging started", {
    version: Constants.expoConfig?.version ?? null,
    platform: Platform.OS,
  });

  timer = setInterval(flush, FLUSH_INTERVAL_MS);

  AppState.addEventListener("change", (state) => {
    if (state !== "active") flush();
  });

  // Capture fatal JS errors and flush synchronously before the app dies.
  const g = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler?: () => (e: unknown, fatal?: boolean) => void;
      setGlobalHandler?: (h: (e: unknown, fatal?: boolean) => void) => void;
    };
  };
  const prevHandler = g.ErrorUtils?.getGlobalHandler?.();
  g.ErrorUtils?.setGlobalHandler?.((err: unknown, isFatal?: boolean) => {
    try {
      const e = err as { message?: string; stack?: string };
      log.error("fatal", e?.message ?? "Unknown fatal error", {
        isFatal: !!isFatal,
        stack: e?.stack ? String(e.stack).slice(0, 1000) : undefined,
      });
      flush();
    } catch {
      // ignore
    }
    prevHandler?.(err, isFatal);
  });
}
