/**
 * Authenticated wrapper around fetch() for the Next.js admin API.
 * - Pulls the Supabase access token; proactively refreshes it if it's expired
 *   or about to expire, and retries once if the server still returns 401.
 * - Logs every request/response for on-device diagnostics.
 */

import { API_BASE_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { log } from "@/lib/logger";

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface RequestOpts {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query: RequestOpts["query"] | undefined): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${trimmed}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Returns a valid access token, refreshing if it's missing/expired/near expiry. */
async function getFreshToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  const expMs = session?.expires_at ? session.expires_at * 1000 : 0;
  const expiringSoon = !expMs || expMs - Date.now() < 60_000; // refresh within 60s of expiry
  if (session && expiringSoon) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session) {
      session = refreshed.session;
    } else {
      log.warn("auth", "refreshSession failed", { error: error?.message });
    }
  }
  return session?.access_token ?? null;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const { method = "GET", body, query, signal } = opts;

  let token = await getFreshToken();
  if (!token) {
    log.error("api", `${method} ${path} — no auth token`, {});
    throw new ApiError("Not authenticated", 401, null);
  }

  const url = buildUrl(path, query);

  const doRequest = async (bearer: string): Promise<Response> => {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), 15_000);
    if (signal) {
      if (signal.aborted) timeoutController.abort();
      else signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
    }
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      signal: timeoutController.signal,
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    try {
      return await fetch(url, init);
    } finally {
      clearTimeout(timeout);
    }
  };

  log.debug("api", `${method} ${path}`, { hasToken: true });

  let res: Response;
  try {
    res = await doRequest(token);
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    const message = aborted
      ? "The server took too long to respond. Check your connection and that the app is pointed at the right backend."
      : `Network error: ${err instanceof Error ? err.message : "request failed"}`;
    log.error("api", `${method} ${path} — network/timeout`, { message });
    throw new ApiError(message, 0, null);
  }

  // If the token was rejected, refresh once and retry.
  if (res.status === 401) {
    log.warn("api", `${method} ${path} — 401, refreshing token and retrying`, {});
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    token = refreshed.session?.access_token ?? null;
    if (error || !token) {
      log.error("api", `${method} ${path} — refresh after 401 failed`, { error: error?.message });
    } else {
      try {
        res = await doRequest(token);
      } catch (err) {
        const message = `Network error: ${err instanceof Error ? err.message : "request failed"}`;
        log.error("api", `${method} ${path} — retry network error`, { message });
        throw new ApiError(message, 0, null);
      }
    }
  }

  const text = await res.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (payload && typeof payload === "object") {
      const errField = (payload as { error?: unknown }).error;
      if (typeof errField === "string" && errField.length > 0) message = errField;
    }
    log.error("api", `${method} ${path} failed`, {
      status: res.status,
      body: typeof payload === "string" ? payload.slice(0, 300) : payload,
    });
    throw new ApiError(message, res.status, payload);
  }

  log.debug("api", `${method} ${path} ok`, { status: res.status });

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
