import type express from "express";
import { ApiError } from "../utils/http-error";

export const errorHandler: express.ErrorRequestHandler = (error, _request, response, _next) => {
  if (response.headersSent) return;

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({
      error: { code: "INVALID_JSON", message: "Malformed JSON request body." },
    });
    return;
  }

  response.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." },
  });
};
