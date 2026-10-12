import { Router } from "express";
import type { User } from "@chat/shared";

const router = Router();

const sampleUsers: User[] = [
  { id: "user-1", displayName: "Maya Chen" },
  { id: "user-2", displayName: "James Wilson" },
  { id: "user-3", displayName: "Olivia Parker" },
];

router.get("/", (_request, response) => {
  response.send("Realtime Chat API");
});

router.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

router.get("/api/users", (_request, response) => {
  response.json({ users: sampleUsers });
});

export default router;
