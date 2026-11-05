import "server-only";
import { MmApiUnreachableError, mmFetch } from "./client";
import type { LoginRequest, LoginResponse, UserEnvelope } from "./types";

export type LoginFailure =
  /** Wrong email or password, or no such account (reported the same way on purpose). */
  | "invalid-credentials"
  /** Account exists but may not sign in yet (not activated, no masjid or organization). The API message explains. */
  | "not-allowed"
  | "locked"
  | "two-factor-required"
  | "unavailable"
  | "error";

export type LoginResult =
  | { ok: true; data: LoginResponse }
  | { ok: false; failure: LoginFailure; message?: string };

/** POST /api/account/login */
export async function login(request: LoginRequest): Promise<LoginResult> {
  let response: Response;
  try {
    response = await mmFetch("/api/account/login", { method: "POST", body: request });
  } catch (error) {
    if (error instanceof MmApiUnreachableError) return { ok: false, failure: "unavailable" };
    throw error;
  }

  // 429 comes from the API rate limiter; 5xx and anything else without a JSON envelope is a plain failure.
  if (response.status === 429) return { ok: false, failure: "error", message: "Too many attempts. Wait a moment and try again." };

  let body: UserEnvelope<LoginResponse>;
  try {
    body = (await response.json()) as UserEnvelope<LoginResponse>;
  } catch {
    return { ok: false, failure: "error" };
  }

  if (body.requiresTwoFactor) return { ok: false, failure: "two-factor-required" };

  if (body.hasError || !body.model) {
    switch (Number(body.statusCode)) {
      case 401:
      case 404:
        return { ok: false, failure: "invalid-credentials" };
      case 403:
        return { ok: false, failure: "not-allowed", message: body.message ?? undefined };
      case 423:
        return { ok: false, failure: "locked", message: body.message ?? undefined };
      default:
        return { ok: false, failure: "error", message: body.message ?? undefined };
    }
  }

  return { ok: true, data: body.model };
}

/** POST /api/account/logout. Best effort: the session cookies are cleared whatever this returns. */
export async function logout(accessToken: string): Promise<void> {
  try {
    await mmFetch("/api/account/logout", { method: "POST", accessToken });
  } catch {
    // Ignore: the panel session is ended locally either way.
  }
}
