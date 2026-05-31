import twilio from "twilio";

function isDryRun() {
  const flag = process.env.SMS_DRY_RUN?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export async function sendSMS(to, body) {
  if (isDryRun()) {
    console.log(`[SMS dry-run] to=${to} body=${body.slice(0, 80)}…`);
    return { sid: "dry-run", status: "sent" };
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error("Twilio not configured. Set SMS_DRY_RUN=true for demo mode.");
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client.messages.create({ body, from: TWILIO_PHONE_NUMBER, to });
}