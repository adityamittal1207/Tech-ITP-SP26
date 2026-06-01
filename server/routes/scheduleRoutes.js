import { Router } from "express";
import { getSchedule, getScheduleRoster } from "../controllers/scheduleController.js";

const router = Router();

router.get("/", getSchedule);
router.get("/:classId/roster", getScheduleRoster);

export default router;
