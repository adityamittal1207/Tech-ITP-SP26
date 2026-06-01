import twilio from "twilio";
import { handleInboundSms } from "../services/inboundSmsService.js";

export async function twilioInboundSms(req, res, next) {
  try {
    if (process.env.SMS_DRY_RUN !== "true" && process.env.TWILIO_AUTH_TOKEN) {
      const signature = req.headers["x-twilio-signature"];
      const url =
        process.env.TWILIO_WEBHOOK_URL ||
        `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const valid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        req.body
      );
      if (!valid) return res.status(403).send("Forbidden");
    }

    const from = req.body.From;
    const body = req.body.Body;
    const result = await handleInboundSms(from, body);
    if (!result.handled) {
      console.warn("Inbound SMS not handled:", { from, body, result });
    } else {
      console.log("Inbound SMS handled:", { from, body, result });
    }

    res.type("text/xml").send("<Response></Response>");
  } catch (error) {
    next(error);
  }
}
