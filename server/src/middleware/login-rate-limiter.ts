import type express from "express";
import { ApiError } from "../utils/http-error";

const loginWindowMs = 10 * 60 * 1000;
const loginRequestLimit = 10;
const loginRequestsByIp = new Map<string, number[]>();

export const loginRateLimiter: express.RequestHandler = (request, _response, next) => {
  const path = request.path.toLowerCase().replace(/\/+$/, "");
  if (request.method !== "POST" || path !== "/api/auth/login") {
    next();
    return;
  }

  const now = Date.now();
  for (const [ip, timestamps] of loginRequestsByIp) {
    const activeTimestamps = timestamps.filter((timestamp) => now - timestamp < loginWindowMs);
    if (activeTimestamps.length) {
      loginRequestsByIp.set(ip, activeTimestamps);
    } else {
      loginRequestsByIp.delete(ip);
    }
  }

  const ip = request.ip ?? request.socket.remoteAddress ?? "unknown";
  const timestamps = loginRequestsByIp.get(ip) ?? [];
  timestamps.push(now);
  loginRequestsByIp.set(ip, timestamps);
  if (timestamps.length > loginRequestLimit) {
    next(new ApiError(429, "RATE_LIMITED", "Too many login attempts. Please try again later."));
    return;
  }

  next();
};
