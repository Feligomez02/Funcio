const CSRF_COOKIE_NAME = "funcio-csrf";
const CSRF_HEADER_NAME = "x-funcio-csrf";

const COOKIE_MATCHER = new RegExp(
  `(?:^|;\\s*)${CSRF_COOKIE_NAME.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}=([^;]*)`,
);

function readBrowserCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(COOKIE_MATCHER);
  return match ? decodeURIComponent(match[1]) : null;
}

export function withCsrf(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers ?? {});
  const token = readBrowserCsrfToken();

  if (token) {
    headers.set(CSRF_HEADER_NAME, token);
  }
  headers.set("X-Requested-With", "XMLHttpRequest");

  return {
    ...init,
    credentials: init.credentials ?? "same-origin",
    headers,
  };
}

export function fetchWithCsrf(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, withCsrf(init));
}

export const extractCsrfTokenFromCookieHeader = (
  cookieHeader: string | null,
): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader.match(COOKIE_MATCHER);
  return match ? decodeURIComponent(match[1]) : null;
};

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
