import * as Ably from "ably";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../../lib/api-error";
import { apiErrorResponse } from "../../../../../lib/api-error-response";
import { requireCurrentUser } from "../../../../../lib/auth/current-user";
import {
  getConversationMessages,
  sendMessage,
} from "../../../../../lib/services/conversations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = await requireCurrentUser(request);
    const { conversationId } = await params;
    return NextResponse.json(await getConversationMessages(userId, conversationId));
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(new ApiError(400, "INVALID_JSON", "Malformed JSON request body."));
  }

  try {
    const userId = await requireCurrentUser(request);
    const { conversationId } = await params;
    const message = await sendMessage(userId, conversationId, body);
    let realtimePublished = false;
    const apiKey = process.env.ABLY_API_KEY;
    if (apiKey) {
      try {
        const ably = new Ably.Rest({ key: apiKey });
        await ably.channels
          .get(`private-conversation:${conversationId.toLowerCase()}`)
          .publish("new-message", message);
        realtimePublished = true;
      } catch {
        // The message is already persisted. The response reports failed live delivery.
      }
    }
    return NextResponse.json({ message, realtimePublished }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
