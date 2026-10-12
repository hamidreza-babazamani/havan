import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const issuer = "realtime-chat-api";
const audience = "realtime-chat-client";
const accessTokenClaimNames = new Set(["sub", "sid", "iss", "aud", "exp"]);

function accessTokenKey(): Uint8Array {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]+={0,2}$/.test(secret)) {
    throw new Error("Access token signing key is not configured.");
  }

  const unpadded = secret.replace(/=+$/, "");
  const key = Buffer.from(unpadded, "base64url");
  const canonical = key.toString("base64url");
  const padded = canonical + "=".repeat((4 - (canonical.length % 4)) % 4);
  if (key.length < 32 || (secret !== canonical && secret !== padded)) {
    throw new Error("Access token signing key is not configured.");
  }
  return key;
}

export function createRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setExpirationTime("10m")
    .sign(accessTokenKey());
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; sid: string }> {
  const { payload } = await jwtVerify(token, accessTokenKey(), {
    algorithms: ["HS256"],
    issuer,
    audience,
    requiredClaims: ["sub", "sid", "exp"],
  });
  if (
    Object.keys(payload).some((claim) => !accessTokenClaimNames.has(claim)) ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string"
  ) {
    throw new Error("Invalid access token claims.");
  }
  return { sub: payload.sub, sid: payload.sid };
}

export const REFRESH_COOKIE_NAME = "refreshToken";
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export function parseRefreshToken(value: string | undefined): string | null {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  const bytes = Buffer.from(value, "base64url");
  return bytes.length === 32 && bytes.toString("base64url") === value ? value : null;
}
