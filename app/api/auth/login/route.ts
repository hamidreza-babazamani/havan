import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../lib/api-error";
import { login } from "../../../../lib/services/authentication";
import {
  REFRESH_COOKIE_NAME,
  SESSION_LIFETIME_MS,
} from "../../../../lib/auth/tokens";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } },
      { status: 415 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Malformed JSON request body." } },
      { status: 400 },
    );
  }

  try {
    const result = await login(body);
    const response = NextResponse.json(
      { accessToken: result.accessToken, user: result.user },
      { status: 200 },
    );
    response.cookies.set(REFRESH_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: SESSION_LIFETIME_MS / 1000,
    });
    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." } },
      { status: 500 },
    );
  }
}
