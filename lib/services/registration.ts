import mongoose from "mongoose";
import * as argon2 from "argon2";
import { ApiError } from "../api-error";
import { connectToDatabase } from "../mongodb";
import { UserModel } from "../models/User";
import { validateRegistrationInput } from "../registration-validation";

export interface RegisteredUser {
  id: string;
  username: string;
  displayName: string;
  emailVerified: false;
}

export async function registerUser(body: unknown): Promise<RegisteredUser> {
  try {
    const input = validateRegistrationInput(body);
    if (!input) {
      throw new ApiError(400, "INVALID_REGISTRATION", "Invalid registration details.");
    }

    await connectToDatabase();

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await UserModel.create({
      email: input.email,
      username: input.username,
      displayName: input.displayName,
      passwordHash,
      emailVerified: false,
    });

    return {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName,
      emailVerified: false,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof mongoose.Error.ValidationError) {
      throw new ApiError(400, "INVALID_REGISTRATION", "Invalid registration details.");
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new ApiError(409, "ACCOUNT_CONFLICT", "Email or username is already registered.");
    }

    throw error;
  }
}
