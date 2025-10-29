import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
const AUTH_ROUTES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = ["/projects", "/requirements", "/settings", "/api"];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isAuthRoute = (pathname: string) =>
  AUTH_ROUTES.has(pathname) ||
  AUTH_ROUTES.has(pathname.replace(/\/$/, ""));

const validateToken = async (token: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return Boolean(data?.id);
  } catch (error) {
    console.error("Failed to validate Supabase token", error);
    return false;
  }
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/_next") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  const origin = req.headers.get("origin");
  const allowedOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    new URL(req.url).origin;

  if (origin && origin !== allowedOrigin) {
    return new NextResponse("Forbidden origin", { status: 403 });
  }

  const token =
    req.cookies.get("sb-access-token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  const hasValidToken = token ? await validateToken(token) : false;

  if (!hasValidToken && isProtectedPath(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (hasValidToken && isAuthRoute(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/projects";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"]
};
