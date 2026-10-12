import mongoose from "mongoose";
import * as argon2 from "argon2";
import { UserModel } from "../models/User";
import { ApiError } from "../utils/http-error";

export async function registerUser(body: unknown) {
  try {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new ApiError(400, "INVALID_REGISTRATION", "Invalid registration details.");
    }

    const { email, username, displayName, password } = body as Record<string, unknown>;
    if (
      typeof email !== "string" ||
      typeof username !== "string" ||
      typeof displayName !== "string" ||
      typeof password !== "string"
    ) {
      throw new ApiError(400, "INVALID_REGISTRATION", "Invalid registration details.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedDisplayName = displayName.trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !/^[a-z0-9_]{3,30}$/.test(normalizedUsername) ||
      !normalizedDisplayName ||
      [...password].length < 8 ||
      !/\p{L}/u.test(password) ||
      !/\p{N}/u.test(password) ||
      /\s/u.test(password)
    ) {
      throw new ApiError(400, "INVALID_REGISTRATION", "Invalid registration details.");
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    return await UserModel.create({
      email: normalizedEmail,
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      passwordHash,
      emailVerified: false,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      throw new ApiError(400, "INVALID_REGISTRATION", "Invalid registration details.");
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new ApiError(409, "ACCOUNT_CONFLICT", "Email or username is already registered.");
    }

    throw error;
  }
}
