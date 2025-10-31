import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = ["/projects", "/requirements", "/settings", "/api"];
const CSRF_COOKIE_NAME = "funcio-csrf";

const SECURITY_HEADERS: Array<[string, string]> = [
  ["X-Frame-Options", "SAMEORIGIN"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"],
  ["X-DNS-Prefetch-Control", "off"],
  [
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.atlassian.com https://*.atlassian.net; font-src 'self' data:; frame-ancestors 'self'; form-action 'self'; base-uri 'self'",
  ],
];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isAuthRoute = (pathname: string) =>
  AUTH_ROUTES.has(pathname) ||
  AUTH_ROUTES.has(pathname.replace(/\/$/, ""));

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/_next") || pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  const accessToken =
    req.cookies.get("sb-nqlnhrhazihuqtrvpbsj-auth-token")?.value ?? null;
  const hasSession = Boolean(accessToken);

  let response: NextResponse;

  if (!hasSession && isProtectedPath(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    response = NextResponse.redirect(redirectUrl);
  } else if (hasSession && isAuthRoute(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/projects";
    redirectUrl.search = "";
    response = NextResponse.redirect(redirectUrl);
  } else {
    response = NextResponse.next();
  }

  if (!req.cookies.get(CSRF_COOKIE_NAME)?.value) {
    const token = crypto.randomUUID();
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: token,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  for (const [key, value] of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/(.*)"],
};
