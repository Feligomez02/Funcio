import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = ["/projects", "/requirements", "/settings", "/api"];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isAuthRoute = (pathname: string) =>
  AUTH_ROUTES.has(pathname) ||
  AUTH_ROUTES.has(pathname.replace(/\/$/, ""));

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/_next") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  // Check for valid Supabase session cookie (set by Supabase, httpOnly, secure)
  const accessToken = req.cookies.get("sb-nqlnhrhazihuqtrvpbsj-auth-token")?.value;
  const hasSession = Boolean(accessToken);

  // Redirect unauthenticated users trying to access protected routes
  if (!hasSession && isProtectedPath(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && isAuthRoute(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/projects";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};
