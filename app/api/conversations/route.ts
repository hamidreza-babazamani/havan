import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../lib/api-error";
import { apiErrorResponse } from "../../../lib/api-error-response";
import { requireCurrentUser } from "../../../lib/auth/current-user";
import {
  createOrGetConversation,
  listConversations,
} from "../../../lib/services/conversations";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireCurrentUser(request);
    return NextResponse.json({ conversations: await listConversations(userId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(new ApiError(400, "INVALID_JSON", "Malformed JSON request body."));
  }

  try {
    const userId = await requireCurrentUser(request);
    const conversation = await createOrGetConversation(
      userId,
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>).participantId
        : undefined,
    );
    return NextResponse.json({ conversation }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
