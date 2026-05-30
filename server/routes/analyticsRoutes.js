import { Router } from "express";
import { getClassStats, getDashboardStats, getRetentionStats } from "../controllers/analyticsController.js";

const router = Router();
router.get("/dashboard", getDashboardStats);
router.get("/retention", getRetentionStats);
router.get("/classes",   getClassStats);
export default router;
