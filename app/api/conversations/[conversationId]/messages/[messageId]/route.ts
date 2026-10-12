import * as Ably from "ably";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../../../lib/api-error";
import { apiErrorResponse } from "../../../../../../lib/api-error-response";
import { requireCurrentUser } from "../../../../../../lib/auth/current-user";
import { deleteMessage, setMessagePinned } from "../../../../../../lib/services/conversations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ conversationId: string; messageId: string }> };

async function publishUpdate(conversationId: string, eventName: string, data: unknown) {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return false;
  try {
    const ably = new Ably.Rest({ key: apiKey });
    await ably.channels.get(`private-conversation:${conversationId.toLowerCase()}`).publish(eventName, data);
    return true;
  } catch {
    return false;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const userId = await requireCurrentUser(request);
    const { conversationId, messageId } = await params;
    const deleted = await deleteMessage(userId, conversationId, messageId);
    const realtimePublished = await publishUpdate(conversationId, "message-deleted", deleted);
    return NextResponse.json({ deleted, realtimePublished }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiErrorResponse(new ApiError(400, "INVALID_JSON", "Malformed JSON request body."));
  }

  const pinned = typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).pinned
    : undefined;
  if (typeof pinned !== "boolean") {
    return apiErrorResponse(new ApiError(400, "INVALID_PIN_STATE", "Choose whether to pin or unpin this message."));
  }

  try {
    const userId = await requireCurrentUser(request);
    const { conversationId, messageId } = await params;
    const result = await setMessagePinned(userId, conversationId, messageId, pinned);
    const realtimePublished = result.changed
      ? await publishUpdate(conversationId, "message-pin-updated", result.message)
      : true;
    return NextResponse.json({ message: result.message, realtimePublished }, { status: 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
