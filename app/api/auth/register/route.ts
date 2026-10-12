import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "../../../../lib/api-error";
import {
  getRegistrationClientIp,
  isRegistrationRateLimited,
} from "../../../../lib/registration-rate-limit";
import {
  MAX_REGISTRATION_BODY_BYTES,
  validateRegistrationInput,
} from "../../../../lib/registration-validation";
import { registerUser } from "../../../../lib/services/registration";

export const runtime = "nodejs";

type BodyReadResult =
  | { kind: "ok"; body: unknown }
  | { kind: "too-large" }
  | { kind: "invalid" };

async function readLimitedJson(request: NextRequest): Promise<BodyReadResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_REGISTRATION_BODY_BYTES) {
    return { kind: "too-large" };
  }

  if (!request.body) return { kind: "invalid" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > MAX_REGISTRATION_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        return { kind: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: "invalid" };
  } finally {
    reader.releaseLock();
  }

  try {
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { kind: "ok", body: JSON.parse(text) as unknown };
  } catch {
    return { kind: "invalid" };
  }
}

export async function POST(request: NextRequest) {
  if (isRegistrationRateLimited(getRegistrationClientIp(request.headers))) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 },
    );
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json(
      { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json." } },
      { status: 415 },
    );
  }

  const parsedBody = await readLimitedJson(request);
  if (parsedBody.kind === "too-large") {
    return NextResponse.json(
      { error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." } },
      { status: 413 },
    );
  }

  if (parsedBody.kind === "invalid") {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Malformed JSON request body." } },
      { status: 400 },
    );
  }

  const input = validateRegistrationInput(parsedBody.body);
  if (!input) {
    return NextResponse.json(
      { error: { code: "INVALID_REGISTRATION", message: "Invalid registration details." } },
      { status: 400 },
    );
  }

  try {
    const user = await registerUser(input);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError && error.code === "INVALID_REGISTRATION") {
      return NextResponse.json(
        { error: { code: "INVALID_REGISTRATION", message: "Invalid registration details." } },
        { status: 400 },
      );
    }

    if (error instanceof ApiError && error.code === "ACCOUNT_CONFLICT") {
      return NextResponse.json(
        { error: { code: "ACCOUNT_CONFLICT", message: "Email or username is already registered." } },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." } },
      { status: 500 },
    );
  }
}
