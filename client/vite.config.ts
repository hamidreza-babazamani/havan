import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    https: {
      key: readFileSync("C:/Users/Asus/AppData/Local/chat-dev-certs/localhost-key.pem"),
      cert: readFileSync("C:/Users/Asus/AppData/Local/chat-dev-certs/localhost.pem"),
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: false,
      },
    },
  },
});
