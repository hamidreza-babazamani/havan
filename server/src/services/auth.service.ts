import { createHash, randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { SessionModel } from "../models/Session";
import { UserModel } from "../models/User";
import { ApiError } from "../utils/http-error";
import { signAccessToken } from "../utils/jwt";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const dummyPasswordHash = "$argon2id$v=19$m=65536,p=4,t=3$KEOA0Ij0j5JDBI8azl1eWQ$R76DZ9W9rsH3WjgNSOBXOqDa5qh26ny8cw5yjlJcLlQ";

export async function login(body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_LOGIN", "Invalid login details.");
  }

  const { email, password } = body as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new ApiError(400, "INVALID_LOGIN", "Invalid login details.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail }).select("+passwordHash");
  const passwordMatches = user
    ? user.passwordHash.startsWith("$argon2id$") && await argon2.verify(user.passwordHash, password)
    : (await argon2.verify(dummyPasswordHash, password), false);

  if (!user || !passwordMatches || !user.emailVerified) {
    throw new ApiError(401, "AUTH_FAILED", "Invalid email or password.");
  }

  const refreshToken = randomBytes(32).toString("base64url");
  const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const session = await SessionModel.create({
    userId: user._id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + sessionLifetimeMs),
    revokedAt: null,
  });
  const accessToken = await signAccessToken(user._id.toString(), session._id.toString());
  return { user, refreshToken, accessToken };
}

export async function refreshSession(refreshToken: string) {
  const unauthorized = () => new ApiError(401, "AUTH_FAILED", "Invalid or expired session.");
  const currentTime = new Date();
  const currentRefreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const session = await SessionModel.findOne({
    refreshTokenHash: currentRefreshTokenHash,
    expiresAt: { $gt: currentTime },
    revokedAt: null,
  }).select("+refreshTokenHash");
  if (!session) throw unauthorized();

  const nextRefreshToken = randomBytes(32).toString("base64url");
  const nextRefreshTokenHash = createHash("sha256").update(nextRefreshToken).digest("hex");
  const accessToken = await signAccessToken(session.userId.toString(), session._id.toString());
  const updateTime = new Date();
  const rotatedSession = await SessionModel.findOneAndUpdate(
    {
      _id: session._id,
      refreshTokenHash: currentRefreshTokenHash,
      expiresAt: { $gt: updateTime },
      revokedAt: null,
    },
    { $set: { refreshTokenHash: nextRefreshTokenHash } },
    { new: true, runValidators: true },
  ).select("_id");
  if (!rotatedSession) throw unauthorized();

  const cookieTime = new Date();
  const maxAge = session.expiresAt.getTime() - cookieTime.getTime();
  if (maxAge <= 0) throw unauthorized();

  return { refreshToken: nextRefreshToken, accessToken, maxAge };
}
