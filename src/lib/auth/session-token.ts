import { SignJWT, jwtVerify } from "jose";
import { cleanDisplayName } from "./display-name";
import { isControlPanelRole, type Role } from "./roles";

/**
 * What the panel knows about the signed-in user. Deliberately small: no phone number, no tokens.
 * Safe to read in the proxy (no server-only imports here).
 */
export interface SessionUser {
  userName: string;
  fullName: string;
  role: Role;
  masjidId: number | null;
  masjidName: string;
  organizationId: number | null;
  organizationName: string;
}

function getKey(): Uint8Array {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET is missing or shorter than 32 characters. Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser, expiresAt: Date): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getKey());
}

/** Returns the user when the token is genuine, unexpired and carries an allowed role; otherwise null. */
export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    if (!isControlPanelRole(payload.role) || typeof payload.userName !== "string") return null;

    return {
      userName: payload.userName,
      fullName: cleanDisplayName(typeof payload.fullName === "string" ? payload.fullName : null, payload.userName),
      role: payload.role,
      masjidId: typeof payload.masjidId === "number" ? payload.masjidId : null,
      masjidName: typeof payload.masjidName === "string" ? payload.masjidName : "",
      organizationId: typeof payload.organizationId === "number" ? payload.organizationId : null,
      organizationName: typeof payload.organizationName === "string" ? payload.organizationName : "",
    };
  } catch {
    return null;
  }
}
