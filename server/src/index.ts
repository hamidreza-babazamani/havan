import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app";
import { connectDatabase } from "./config/database";
import { configureAccessTokenKey } from "./utils/jwt";

export { signAccessToken, verifyAccessToken } from "./utils/jwt";
export { requireAuthentication } from "./middleware/authenticate";

const httpServer = createServer(app);
new Server(httpServer);

const port = Number(process.env.PORT ?? 3000);

async function start(): Promise<void> {
  if (!configureAccessTokenKey(process.env.ACCESS_TOKEN_SECRET)) {
    console.error("ACCESS_TOKEN_SECRET must be a base64url-encoded key of at least 32 bytes; server not started.");
    process.exitCode = 1;
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri?.trim()) {
    console.error("MONGODB_URI is required; server not started.");
    process.exitCode = 1;
    return;
  }

  try {
    await connectDatabase(mongoUri);
  } catch {
    console.error("MongoDB connection failed; server not started.");
    process.exitCode = 1;
    return;
  }

  httpServer.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

if (require.main === module) void start();
