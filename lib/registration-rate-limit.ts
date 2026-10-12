import { isIP } from "node:net";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_CLIENTS = 10_000;
const CLEANUP_INTERVAL_MS = 60 * 1000;

type RateLimitEntry = {
  requests: number[];
  expiresAt: number;
};

type RateLimitState = {
  clients: Map<string, RateLimitEntry>;
  nextCleanupAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  registrationRateLimitState?: RateLimitState;
};

const state = (globalForRateLimit.registrationRateLimitState ??= {
  clients: new Map(),
  nextCleanupAt: 0,
});

function removeExpiredEntries(now: number) {
  for (const [ip, entry] of state.clients) {
    if (entry.expiresAt <= now) state.clients.delete(ip);
  }
  state.nextCleanupAt = now + CLEANUP_INTERVAL_MS;
}

/**
 * Uses the IP calculated by Vercel's proxy (`x-real-ip`). Deployments outside
 * Vercel must only provide this header from a trusted proxy that overwrites it.
 */
export function getRegistrationClientIp(headers: Headers): string | null {
  // A local Next.js server has no trusted proxy IP; group dev requests together.
  if (process.env.NODE_ENV !== "production") return "127.0.0.1";

  const ip = headers.get("x-real-ip")?.trim();
  return ip && isIP(ip) !== 0 ? ip : null;
}

/** Returns true when the request should be rejected. Missing IPs fail closed. */
export function isRegistrationRateLimited(ip: string | null, now = Date.now()): boolean {
  if (!ip || isIP(ip) === 0) return true;

  if (now >= state.nextCleanupAt || state.clients.size >= MAX_CLIENTS) {
    removeExpiredEntries(now);
  }

  let entry = state.clients.get(ip);
  if (entry) {
    entry.requests = entry.requests.filter((timestamp: number) => timestamp > now - WINDOW_MS);
    if (entry.requests.length >= MAX_REQUESTS) return true;

    entry.requests.push(now);
    entry.expiresAt = now + WINDOW_MS;
    return false;
  }

  if (state.clients.size >= MAX_CLIENTS) return true;

  entry = { requests: [now], expiresAt: now + WINDOW_MS };
  state.clients.set(ip, entry);
  return false;
}
