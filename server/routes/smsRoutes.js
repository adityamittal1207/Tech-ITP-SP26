import express from "express";
import { sendOutreach, sendReminder } from "../controllers/smsController.js";

const router = express.Router();

router.post("/reminder", sendReminder);
router.post("/outreach", sendOutreach);

export default router;
