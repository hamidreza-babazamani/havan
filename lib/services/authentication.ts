import * as argon2 from "argon2";
import { ApiError } from "../api-error";
import { connectToDatabase } from "../mongodb";
import { SessionModel } from "../models/Session";
import { UserModel } from "../models/User";
import {
  createRefreshToken,
  hashRefreshToken,
  SESSION_LIFETIME_MS,
  signAccessToken,
} from "../auth/tokens";

const dummyPasswordHash = "$argon2id$v=19$m=65536,p=4,t=3$KEOA0Ij0j5JDBI8azl1eWQ$R76DZ9W9rsH3WjgNSOBXOqDa5qh26ny8cw5yjlJcLlQ";

export interface AuthenticatedUser {
  id: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export async function login(body: unknown): Promise<LoginResult> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_LOGIN", "Invalid login details.");
  }

  const { email, password } = body as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim().length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    !password ||
    [...password].length > 128
  ) {
    throw new ApiError(400, "INVALID_LOGIN", "Invalid login details.");
  }

  await connectToDatabase();
  const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  let passwordMatches = false;
  try {
    const hash = user?.passwordHash;
    passwordMatches = hash?.startsWith("$argon2id$")
      ? await argon2.verify(hash, password)
      : (await argon2.verify(dummyPasswordHash, password), false);
  } catch {
    passwordMatches = false;
  }

  if (!user || !passwordMatches) {
    throw new ApiError(401, "AUTH_FAILED", "Invalid email or password.");
  }

  const refreshToken = createRefreshToken();
  const session = new SessionModel({
    userId: user._id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    revokedAt: null,
  });
  const accessToken = await signAccessToken(user._id.toString(), session._id.toString());
  await session.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    },
  };
}

export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;

  await connectToDatabase();
  await SessionModel.updateOne(
    {
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: { $gt: new Date() },
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  await connectToDatabase();
  const session = await SessionModel.findOne({
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: { $gt: new Date() },
    revokedAt: null,
  }).select("_id userId");

  if (!session) return null;
  return signAccessToken(session.userId.toString(), session._id.toString());
}

