"use server";

import { cookies } from "next/headers";
import {
  CSRF_HEADER_NAME,
  CSRF_COOKIE_NAME,
  extractCsrfTokenFromCookieHeader,
} from "./csrf";

export async function assertValidCsrf(request: Request) {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  let cookieToken = extractCsrfTokenFromCookieHeader(
    request.headers.get("cookie"),
  );

  if (!cookieToken) {
    try {
      const cookieStore = await cookies();
      cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value ?? null;
    } catch {
      cookieToken = null;
    }
  }

  const hasMatchingToken =
    headerToken != null &&
    cookieToken != null &&
    headerToken === cookieToken;

  const originHeader = request.headers.get("origin");
  const hostHeader =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  let sameOrigin = false;
  if (originHeader && hostHeader) {
    try {
      const originHost = new URL(originHeader).host;
      sameOrigin = originHost === hostHeader;
    } catch {
      sameOrigin = false;
    }
  }

  const isXmlHttpRequest =
    request.headers.get("x-requested-with") === "XMLHttpRequest";

  if (!hasMatchingToken && !(sameOrigin && isXmlHttpRequest)) {
    throw new Error("Invalid CSRF token");
  }
}
