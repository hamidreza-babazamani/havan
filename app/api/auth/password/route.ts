import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../lib/api-error";
import { apiErrorResponse } from "../../../../lib/api-error-response";
import { requireCurrentUser } from "../../../../lib/auth/current-user";
import { changeAccountPassword } from "../../../../lib/services/account";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(new ApiError(400, "INVALID_JSON", "Malformed JSON request body."));
  }

  try {
    const userId = await requireCurrentUser(request);
    await changeAccountPassword(userId, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
