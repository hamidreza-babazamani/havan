import { Router } from "express";
import authRoutes from "./auth.routes";
import systemRoutes from "./system.routes";
import userRoutes from "./users.routes";

const router = Router();
router.use(systemRoutes);
router.use(userRoutes);
router.use(authRoutes);

export default router;
