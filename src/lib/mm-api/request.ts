import "server-only";
import { redirect } from "next/navigation";
import { FORBIDDEN_PATH, SESSION_EXPIRED_PATH } from "@/lib/auth/constants";
import { getAccessToken } from "@/lib/auth/session";
import { mmFetch } from "./client";
import type { ProblemDetails } from "./masjid-types";

/** A non-success answer from the API that the page can show (as opposed to sign-in problems, which redirect). */
export class MmApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetails | null,
  ) {
    super(problem?.detail ?? problem?.title ?? `The MM API answered ${status}.`);
    this.name = "MmApiError";
  }
}

export async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return null;
  }
}

/**
 * Calls the API as the signed-in user. A rejected token (401) ends the session through
 * /session-expired, and a role the API refuses (403) goes to /forbidden; both throw a redirect,
 * so callers that catch errors must call unstable_rethrow first.
 */
export async function authorized(
  path: string,
  options: { method?: "GET" | "POST"; searchParams?: Record<string, string | number | boolean | undefined> } = {},
): Promise<Response> {
  const accessToken = await getAccessToken();
  if (!accessToken) redirect(SESSION_EXPIRED_PATH);

  const response = await mmFetch(path, { ...options, accessToken });
  if (response.status === 401) redirect(SESSION_EXPIRED_PATH);
  if (response.status === 403) redirect(FORBIDDEN_PATH);
  return response;
}

export async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new MmApiError(response.status, await readProblem(response));
  return (await response.json()) as T;
}
