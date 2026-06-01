import { Router } from "express";
import { getSettings, patchSettings, testTwilio } from "../controllers/settingsController.js";

const router = Router();
router.get("/", getSettings);
router.patch("/", patchSettings);
router.post("/twilio/test", testTwilio);

export default router;
