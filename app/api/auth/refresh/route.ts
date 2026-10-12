import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../lib/api-error";
import { apiErrorResponse } from "../../../../lib/api-error-response";
import {
  parseRefreshToken,
  REFRESH_COOKIE_NAME,
} from "../../../../lib/auth/tokens";
import { refreshAccessToken } from "../../../../lib/services/authentication";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cookies = request.cookies.getAll(REFRESH_COOKIE_NAME);
  const refreshToken = cookies.length === 1 ? parseRefreshToken(cookies[0].value) : null;
  if (!refreshToken) {
    return apiErrorResponse(new ApiError(401, "AUTH_REQUIRED", "Authentication required."));
  }

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    if (!accessToken) {
      return apiErrorResponse(new ApiError(401, "AUTH_REQUIRED", "Authentication required."));
    }
    return NextResponse.json({ accessToken });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
