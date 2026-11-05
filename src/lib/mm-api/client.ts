import "server-only";
import { getMmApiBaseUrl } from "@/lib/env";

const REQUEST_TIMEOUT_MS = 15_000;

/** The API could not be reached (network error, timeout, DNS, TLS). */
export class MmApiUnreachableError extends Error {
  constructor(cause: unknown) {
    super("The MM API could not be reached.", { cause });
    this.name = "MmApiUnreachableError";
  }
}

interface MmFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Sent as JSON. */
  body?: unknown;
  /** Raw JWT without the "Bearer " prefix. */
  accessToken?: string;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

/**
 * Thin server-side fetch for the MM API. The base URL comes from MM_API_BASE_URL and responses are
 * never cached. Callers decide how to read the body, because v1 and v2 answer differently.
 */
export async function mmFetch(path: string, options: MmFetchOptions = {}): Promise<Response> {
  const url = new URL(`${getMmApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(options.searchParams ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  try {
    return await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new MmApiUnreachableError(error);
  }
}
