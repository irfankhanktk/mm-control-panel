/** Signed session cookie (user identity + role). Verified by the proxy and by server code. */
export const SESSION_COOKIE = "mm_session";

/** Raw MM API access token (JWT, without the "Bearer " prefix). Only ever read on the server. */
export const ACCESS_TOKEN_COOKIE = "mm_access_token";

export const LOGIN_PATH = "/login";
export const HOME_PATH = "/";
export const FORBIDDEN_PATH = "/forbidden";
/** Clears the session cookies, then sends the user to the login page (used when the API rejects the token). */
export const SESSION_EXPIRED_PATH = "/session-expired";

/** Used when the API token carries no readable expiry. The MM API issues 24 hour tokens. */
export const FALLBACK_SESSION_SECONDS = 24 * 60 * 60;
