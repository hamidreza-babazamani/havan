import { SignJWT, jwtVerify } from "jose";

const accessTokenIssuer = "realtime-chat-api";
const accessTokenAudience = "realtime-chat-client";
const accessTokenLifetimeSeconds = 10 * 60;
const accessTokenClaimNames = new Set(["sub", "sid", "iss", "aud", "exp"]);

function parseAccessTokenSecret(secret: string | undefined): Uint8Array | null {
  if (!secret || !/^[A-Za-z0-9_-]+={0,2}$/.test(secret)) return null;
  const unpaddedSecret = secret.replace(/=+$/, "");
  const key = Buffer.from(unpaddedSecret, "base64url");
  const canonicalSecret = key.toString("base64url");
  const paddedCanonicalSecret = canonicalSecret + "=".repeat((4 - canonicalSecret.length % 4) % 4);
  if (
    key.length < 32 ||
    unpaddedSecret !== canonicalSecret ||
    (secret !== canonicalSecret && secret !== paddedCanonicalSecret)
  ) return null;
  return key;
}

let accessTokenKey: Uint8Array | null = parseAccessTokenSecret(process.env.ACCESS_TOKEN_SECRET);

export function configureAccessTokenKey(secret: string | undefined): boolean {
  accessTokenKey = parseAccessTokenSecret(secret);
  return accessTokenKey !== null;
}

export async function signAccessToken(subject: string, sessionId: string): Promise<string> {
  if (!accessTokenKey) throw new Error("Access token signing key is not configured.");
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(accessTokenIssuer)
    .setAudience(accessTokenAudience)
    .setSubject(subject)
    .setExpirationTime(`${accessTokenLifetimeSeconds}s`)
    .sign(accessTokenKey);
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; sid: string }> {
  if (!accessTokenKey) throw new Error("Access token signing key is not configured.");
  const { payload } = await jwtVerify(token, accessTokenKey, {
    algorithms: ["HS256"],
    issuer: accessTokenIssuer,
    audience: accessTokenAudience,
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
