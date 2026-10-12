import { NextResponse } from "next/server";
import { ApiError } from "./api-error";

export function apiErrorResponse(error: unknown) {
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
