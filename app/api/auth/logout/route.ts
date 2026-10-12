import { NextResponse, type NextRequest } from "next/server";
import { logout } from "../../../../lib/services/authentication";
import {
  parseRefreshToken,
  REFRESH_COOKIE_NAME,
} from "../../../../lib/auth/tokens";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const cookies = request.cookies.getAll(REFRESH_COOKIE_NAME);
  const refreshToken = cookies.length === 1 ? parseRefreshToken(cookies[0].value) : null;

  try {
    await logout(refreshToken);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set(REFRESH_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." } },
      { status: 500 },
    );
  }
}
