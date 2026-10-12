import * as Ably from "ably";
import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../lib/api-error";
import { apiErrorResponse } from "../../../../lib/api-error-response";
import { requireCurrentUser } from "../../../../lib/auth/current-user";
import { connectToDatabase } from "../../../../lib/mongodb";
import { ConversationModel } from "../../../../lib/models/Conversation";

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
    const conversationId =
      typeof body === "object" && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>).conversationId
        : undefined;
    if (typeof conversationId !== "string" || !mongoose.isValidObjectId(conversationId)) {
      throw new ApiError(400, "INVALID_CONVERSATION", "Invalid conversation details.");
    }

    await connectToDatabase();
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      members: userId,
    }).select("_id");
    if (!conversation) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Conversation not found.");
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new ApiError(503, "REALTIME_NOT_CONFIGURED", "Real-time messaging is not configured.");
    }

    const channelName = `private-conversation:${conversation._id.toString()}`;
    const ably = new Ably.Rest({ key: apiKey });
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId,
      capability: { [channelName]: ["subscribe"] },
      ttl: 10 * 60 * 1000,
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
