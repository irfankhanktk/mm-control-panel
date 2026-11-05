import { FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH } from "./constants";

/**
 * Only same-site relative paths may be used as the post-login destination, so a crafted
 * `?next=https://evil.example` link cannot send a signed-in user elsewhere.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return HOME_PATH;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return HOME_PATH;
  if (value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`) || value === FORBIDDEN_PATH) return HOME_PATH;
  return value;
}
