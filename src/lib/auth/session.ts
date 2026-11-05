import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeJwt } from "jose";
import {
  ACCESS_TOKEN_COOKIE,
  FALLBACK_SESSION_SECONDS,
  FORBIDDEN_PATH,
  LOGIN_PATH,
  SESSION_COOKIE,
} from "./constants";
import { type Role } from "./roles";
import { signSessionToken, verifySessionToken, type SessionUser } from "./session-token";

function cookieOptions(expires: Date | undefined) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // No expiry means a browser-session cookie ("remember me" unchecked).
    expires,
  };
}

function tokenExpiry(accessToken: string): Date | null {
  try {
    const { exp } = decodeJwt(accessToken);
    return typeof exp === "number" ? new Date(exp * 1000) : null;
  } catch {
    return null;
  }
}

/**
 * Starts a session after a successful MM API login. The access token and the signed user cookie
 * both end when the API token does; "remember me" only decides whether the cookies outlive the browser.
 */
export async function createSession(user: SessionUser, bearerToken: string, rememberMe: boolean): Promise<void> {
  const accessToken = bearerToken.replace(/^Bearer\s+/i, "");
  const expiresAt = tokenExpiry(accessToken) ?? new Date(Date.now() + FALLBACK_SESSION_SECONDS * 1000);
  const cookieStore = await cookies();
  const options = cookieOptions(rememberMe ? expiresAt : undefined);

  cookieStore.set(SESSION_COOKIE, await signSessionToken(user, expiresAt), options);
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, options);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
}

/** The signed-in user, or null. Deduplicated per request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
});

/** For pages and server actions: the signed-in user, otherwise redirect to the login page. */
export async function requireSession(allowedRoles?: readonly Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(LOGIN_PATH);
  if (allowedRoles && !allowedRoles.includes(session.role)) redirect(FORBIDDEN_PATH);
  return session;
}

/** The raw MM API token for server-side API calls. Never pass it to client components. */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}
