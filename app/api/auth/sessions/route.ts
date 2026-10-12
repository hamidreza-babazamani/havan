import { NextResponse, type NextRequest } from "next/server";
import { apiErrorResponse } from "../../../../lib/api-error-response";
import { requireCurrentSession } from "../../../../lib/auth/current-user";
import { listActiveSessions, revokeOtherSessions } from "../../../../lib/services/account";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionId } = await requireCurrentSession(request);
    return NextResponse.json({ sessions: await listActiveSessions(userId, sessionId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionId } = await requireCurrentSession(request);
    const revoked = await revokeOtherSessions(userId, sessionId);
    return NextResponse.json({ revoked });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
