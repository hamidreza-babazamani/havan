import type express from "express";
import mongoose from "mongoose";
import { SessionModel } from "../models/Session";
import { ApiError } from "../utils/http-error";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuthentication: express.RequestHandler = async (request, response, next) => {
  const unauthorized = () => new ApiError(401, "AUTH_REQUIRED", "Authentication required.");
  const authorization = request.get("authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match) {
    next(unauthorized());
    return;
  }

  let claims: { sub: string; sid: string };
  try {
    claims = await verifyAccessToken(match[1]);
    if (!mongoose.isValidObjectId(claims.sub) || !mongoose.isValidObjectId(claims.sid)) {
      next(unauthorized());
      return;
    }
  } catch {
    next(unauthorized());
    return;
  }

  try {
    const activeSession = await SessionModel.findOne({
      _id: claims.sid,
      userId: claims.sub,
      expiresAt: { $gt: new Date() },
      revokedAt: null,
    }).select("_id");
    if (!activeSession) {
      next(unauthorized());
      return;
    }

    response.locals.auth = { userId: claims.sub, sessionId: claims.sid };
    next();
  } catch (error) {
    next(error);
  }
};
