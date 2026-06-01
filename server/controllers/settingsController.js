import Member from "../models/Member.js";
import { OWNER_PROFILE } from "../data/operationalSeed.js";
import { getEffectiveConfig, updateSettings } from "../services/configService.js";
import { sendTemplate } from "../services/messageService.js";
import { getOwnerUid } from "../utils/tenant.js";

export async function patchSettings(req, res, next) {
  try {
    const config = await updateSettings(getOwnerUid(req), req.body);
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function getSettings(_req, res, next) {
  try {
    const config = await getEffectiveConfig();
    res.json(config);
  } catch (error) {
    next(error);
  }
}

export async function testTwilio(req, res, next) {
  try {
    const ownerUid = getOwnerUid(req);
    let member = await Member.findOne({ ownerUid, email: OWNER_PROFILE.email });
    if (!member) {
      member = await Member.findOne({ ownerUid, phone: OWNER_PROFILE.phone });
    }
    if (!member) {
      return res.status(404).json({ message: "Owner profile not found. Run npm run seed." });
    }

    const message = await sendTemplate(member._id, "welcome");
    res.json({ success: true, message, sentTo: member.phone });
  } catch (error) {
    if (error.statusCode === 502 || error.message?.includes("Twilio")) {
      return res.status(502).json({ message: error.message });
    }
    next(error);
  }
}
