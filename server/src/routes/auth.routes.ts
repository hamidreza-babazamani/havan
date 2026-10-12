import { Router } from "express";
import { loginUser, refreshAuthentication } from "../controllers/auth.controller";

const router = Router();
router.post("/api/auth/login", loginUser);
router.post("/api/auth/refresh", refreshAuthentication);

export default router;
