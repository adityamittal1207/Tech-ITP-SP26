import { Router } from "express";
import { twilioInboundSms } from "../controllers/webhookController.js";

const router = Router();

router.post("/twilio/sms", twilioInboundSms);

export default router;
