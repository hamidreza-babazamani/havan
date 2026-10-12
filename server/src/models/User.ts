import mongoose, { Schema } from "mongoose";

export interface UserFields {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserFields>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]{3,30}$/,
    },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    emailVerified: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, returnedObject) => {
        const serialized = returnedObject as Record<string, unknown>;
        delete serialized.passwordHash;
        return serialized;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

export const UserModel =
  mongoose.models.User ?? mongoose.model<UserFields>("User", userSchema);

export default UserModel;
