import { Router } from "express";
import { getAcquisitionStats, getClassStats, getDashboardStats, getRetentionStats } from "../controllers/analyticsController.js";

const router = Router();
router.get("/dashboard",   getDashboardStats);
router.get("/retention",   getRetentionStats);
router.get("/classes",     getClassStats);
router.get("/acquisition", getAcquisitionStats);
export default router;
