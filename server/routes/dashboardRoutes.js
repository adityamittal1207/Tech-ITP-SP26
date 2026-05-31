import { Router } from "express";
import { getHomeDashboard } from "../controllers/dashboardController.js";

const router = Router();
router.get("/", getHomeDashboard);
export default router;
