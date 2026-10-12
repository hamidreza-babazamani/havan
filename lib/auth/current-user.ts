import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { ApiError } from "../api-error";
import { connectToDatabase } from "../mongodb";
import { SessionModel } from "../models/Session";
import { verifyAccessToken } from "./tokens";

export interface CurrentSession {
  userId: string;
  sessionId: string;
}

export async function requireCurrentSession(request: NextRequest): Promise<CurrentSession> {
  const match = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i);
  if (!match) throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");

  let claims: { sub: string; sid: string };
  try {
    claims = await verifyAccessToken(match[1]);
  } catch {
    throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");
  }

  if (!mongoose.isValidObjectId(claims.sub) || !mongoose.isValidObjectId(claims.sid)) {
    throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");
  }

  await connectToDatabase();
  const session = await SessionModel.findOne({
    _id: claims.sid,
    userId: claims.sub,
    expiresAt: { $gt: new Date() },
    revokedAt: null,
  }).select("_id");
  if (!session) throw new ApiError(401, "AUTH_REQUIRED", "Authentication required.");

  return { userId: claims.sub, sessionId: claims.sid };
}

export async function requireCurrentUser(request: NextRequest): Promise<string> {
  const { userId } = await requireCurrentSession(request);
  return userId;
}
