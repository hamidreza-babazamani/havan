import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../lib/api-error";
import { apiErrorResponse } from "../../../../lib/api-error-response";
import { requireCurrentUser } from "../../../../lib/auth/current-user";
import { getAccountProfile, updateAccountProfile } from "../../../../lib/services/account";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireCurrentUser(request);
    return NextResponse.json({ user: await getAccountProfile(userId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(new ApiError(400, "INVALID_JSON", "Malformed JSON request body."));
  }

  try {
    const userId = await requireCurrentUser(request);
    return NextResponse.json({ user: await updateAccountProfile(userId, body) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
