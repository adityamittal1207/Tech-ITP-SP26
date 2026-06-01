import { Router } from "express";
import { getNotifications } from "../controllers/notificationsController.js";

const router = Router();
router.get("/", getNotifications);
export default router;
