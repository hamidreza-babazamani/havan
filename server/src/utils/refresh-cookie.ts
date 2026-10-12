import type express from "express";

export const refreshCookieName = "refreshToken";
export const refreshCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/api/auth",
};

export function setRefreshTokenCookie(
  response: express.Response,
  token: string,
  maxAge: number,
): void {
  response.cookie(refreshCookieName, token, { ...refreshCookieOptions, maxAge });
}

export function clearRefreshTokenCookie(response: express.Response): void {
  response.clearCookie(refreshCookieName, refreshCookieOptions);
}

export function readRefreshToken(request: express.Request): string | null {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return null;

  const matchingCookies = cookieHeader.split(";").flatMap((cookie) => {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== refreshCookieName) return [];
    return [cookie.slice(separator + 1).trim()];
  });
  if (matchingCookies.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(matchingCookies[0])) return null;

  const tokenBytes = Buffer.from(matchingCookies[0], "base64url");
  return tokenBytes.length === 32 && tokenBytes.toString("base64url") === matchingCookies[0]
    ? matchingCookies[0]
    : null;
}

export function hasSameOriginHttpsRequest(request: express.Request): boolean {
  const origin = request.get("origin");
  const host = request.get("host");
  if (!origin || !host) return false;

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.protocol === "https:" && parsedOrigin.origin === origin &&
      parsedOrigin.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
