import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { loginRateLimiter } from "./middleware/login-rate-limiter";
import routes from "./routes";

const app = express();
app.use(loginRateLimiter);
app.use(express.json());
app.use(routes);
app.use(errorHandler);

export default app;
