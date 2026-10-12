import type express from "express";
import { registerUser } from "../services/user.service";
import { ApiError } from "../utils/http-error";

export const createUser: express.RequestHandler = async (request, response, next) => {
  try {
    const user = await registerUser(request.body);
    response.status(201).json({
      user: {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(error);
  }
};
