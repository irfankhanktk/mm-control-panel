import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * The API rejected the access token while the panel's own cookie still looked valid (revoked or
 * expired early). Clear both cookies here, otherwise the proxy would keep bouncing the user
 * between /login and the page they were on.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  return response;
}
