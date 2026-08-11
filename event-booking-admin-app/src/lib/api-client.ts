/**
 * Authenticated wrapper around fetch() for the Next.js admin API.
 *
 * All writes (approve, reject, comments, quotations, homepage, settings,
 * blocked dates) go through `/api/admin/*` on the Next.js app. Reads use
 * supabase-js directly (RLS-gated).
 *
 * Pattern:
 *   - Pulls the current Supabase access token from `supabase.auth.getSession()`
 *   - Sends it as `Authorization: Bearer <jwt>`
 *   - Server (src/lib/auth.ts) verifies the JWT + admin_users membership
 */

import { API_BASE_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";

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

function buildUrl(
  path: string,
  query: RequestOpts["query"] | undefined
): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${trimmed}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const { method = "GET", body, query, signal } = opts;

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new ApiError("Not authenticated", 401, null);
  }

  const url = buildUrl(path, query);

  // Fail fast (15s) so an unreachable API surfaces an error instead of hanging.
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), 15_000);
  // If the caller passed their own signal, abort our request when theirs aborts.
  if (signal) {
    if (signal.aborted) timeoutController.abort();
    else signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
  }

  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: timeoutController.signal,
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    clearTimeout(timeout);
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ApiError(
      aborted
        ? "The server took too long to respond. Check your connection and that the app is pointed at the right backend."
        : `Network error: ${err instanceof Error ? err.message : "request failed"}`,
      0,
      null
    );
  }
  clearTimeout(timeout);

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
      if (typeof errField === "string" && errField.length > 0) {
        message = errField;
      }
    }
    throw new ApiError(message, res.status, payload);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}
