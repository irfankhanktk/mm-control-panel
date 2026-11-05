import { NextResponse, type NextRequest } from "next/server";
import { FORBIDDEN_PATH, HOME_PATH, LOGIN_PATH, SESSION_COOKIE } from "@/lib/auth/constants";
import { canAccess } from "@/lib/auth/roles";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * Optimistic gate on every page request: sends signed-out visitors to the login page and users
 * without the right role to /forbidden. It only reads the signed cookie. Real authorization still
 * happens in server components (requireSession) and, above all, in the MM API itself.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname === LOGIN_PATH) return NextResponse.next();

    const loginUrl = new URL(LOGIN_PATH, request.url);
    const destination = `${pathname}${search}`;
    if (destination !== HOME_PATH) loginUrl.searchParams.set("next", destination);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === LOGIN_PATH) return NextResponse.redirect(new URL(HOME_PATH, request.url));

  if (pathname !== FORBIDDEN_PATH && !canAccess(session.role, pathname)) {
    return NextResponse.redirect(new URL(FORBIDDEN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals and static assets; API routes (if any are added later) authorize themselves.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
