import mongoose, { Schema } from "mongoose";

export interface SessionFields {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

const sessionSchema = new Schema<SessionFields>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    refreshTokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ refreshTokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel =
  mongoose.models.Session ?? mongoose.model<SessionFields>("Session", sessionSchema);

export default SessionModel;
