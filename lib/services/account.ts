import * as argon2 from "argon2";
import mongoose from "mongoose";
import { ApiError } from "../api-error";
import { connectToDatabase } from "../mongodb";
import { SessionModel } from "../models/Session";
import { UserModel } from "../models/User";

const MAX_DISPLAY_NAME_LENGTH = 80;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function invalidProfile() {
  return new ApiError(400, "INVALID_PROFILE", "Enter a valid username and display name.");
}

function safeProfile(user: {
  _id: mongoose.Types.ObjectId;
  email: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
  createdAt: Date;
}) {
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export async function getAccountProfile(userId: string) {
  await connectToDatabase();
  const user = await UserModel.findById(userId)
    .select("_id email username displayName emailVerified createdAt");
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");
  return safeProfile(user);
}

export async function updateAccountProfile(userId: string, body: unknown) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw invalidProfile();
  const { username, displayName } = body as Record<string, unknown>;
  if (typeof username !== "string" || typeof displayName !== "string") throw invalidProfile();

  const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase();
  const normalizedDisplayName = displayName.trim();
  if (
    !/^[a-z0-9_]{3,30}$/.test(normalizedUsername) ||
    !normalizedDisplayName ||
    [...normalizedDisplayName].length > MAX_DISPLAY_NAME_LENGTH
  ) throw invalidProfile();

  await connectToDatabase();
  try {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { username: normalizedUsername, displayName: normalizedDisplayName } },
      { new: true, runValidators: true },
    ).select("_id email username displayName emailVerified createdAt");
    if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");
    return safeProfile(user);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof mongoose.Error.ValidationError) throw invalidProfile();
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new ApiError(409, "USERNAME_TAKEN", "That username is already in use.");
    }
    throw error;
  }
}

export async function changeAccountPassword(userId: string, body: unknown): Promise<void> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiError(400, "INVALID_PASSWORD", "Enter your current password and a valid new password.");
  }
  const { currentPassword, newPassword } = body as Record<string, unknown>;
  const validNewPassword = typeof newPassword === "string" &&
    [...newPassword].length >= MIN_PASSWORD_LENGTH &&
    [...newPassword].length <= MAX_PASSWORD_LENGTH &&
    /\p{L}/u.test(newPassword) && /\p{N}/u.test(newPassword) && !/\s/u.test(newPassword);
  if (typeof currentPassword !== "string" || !currentPassword || !validNewPassword) {
    throw new ApiError(400, "INVALID_PASSWORD", "New password must be 8–128 characters and include a letter and a number.");
  }

  await connectToDatabase();
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");
  let matches = false;
  try {
    matches = await argon2.verify(user.passwordHash, currentPassword);
  } catch {
    matches = false;
  }
  if (!matches) throw new ApiError(400, "CURRENT_PASSWORD_INVALID", "Current password is incorrect.");

  user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await user.save();
}

export async function listActiveSessions(userId: string, currentSessionId: string) {
  await connectToDatabase();
  const sessions = await SessionModel.find({
    userId,
    expiresAt: { $gt: new Date() },
    revokedAt: null,
  }).sort({ createdAt: -1 }).limit(20).select("_id createdAt expiresAt");
  return sessions.map((session) => ({
    current: session._id.toString() === currentSessionId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  }));
}

export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  await connectToDatabase();
  const result = await SessionModel.updateMany(
    {
      userId,
      _id: { $ne: currentSessionId },
      expiresAt: { $gt: new Date() },
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount;
}
