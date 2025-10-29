type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

type RateLimitResult = {
  success: boolean;
  retryAfter?: number;
};

declare global {
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store: Map<string, RateLimitEntry> =
  globalThis.__rateLimitStore ?? new Map<string, RateLimitEntry>();

globalThis.__rateLimitStore = store;

export const consumeRateLimit = (
  key: string,
  limit = 5,
  windowMs = 60_000
): RateLimitResult => {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.expiresAt <= now) {
    store.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return { success: true };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      retryAfter: Math.max(0, entry.expiresAt - now),
    };
  }

  entry.count += 1;
  store.set(key, entry);

  return { success: true };
};
