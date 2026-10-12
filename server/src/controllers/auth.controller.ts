import type express from "express";
import { login, refreshSession } from "../services/auth.service";
import { hasSameOriginHttpsRequest, readRefreshToken, setRefreshTokenCookie } from "../utils/refresh-cookie";
import { ApiError } from "../utils/http-error";

const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000;

export const loginUser: express.RequestHandler = async (request, response, next) => {
  try {
    const { user, refreshToken, accessToken } = await login(request.body);
    setRefreshTokenCookie(response, refreshToken, sessionLifetimeMs);
    response.json({
      accessToken,
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(error);
  }
};

export const refreshAuthentication: express.RequestHandler = async (request, response, next) => {
  const unauthorized = () => new ApiError(401, "AUTH_FAILED", "Invalid or expired session.");
  try {
    if (!hasSameOriginHttpsRequest(request)) throw unauthorized();

    const currentRefreshToken = readRefreshToken(request);
    if (!currentRefreshToken) throw unauthorized();

    const { refreshToken, accessToken, maxAge } = await refreshSession(currentRefreshToken);
    setRefreshTokenCookie(response, refreshToken, maxAge);
    response.json({ accessToken });
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(error);
  }
};
