import Message from "../models/Message.js";
import { getOwnerUid, ownerFilter } from "../utils/tenant.js";

export async function getMessages(req, res, next) {
  try {
    const filter = { ...ownerFilter(getOwnerUid(req)) };
    if (req.query.memberId) filter.memberId = req.query.memberId;
    const messages = await Message.find(filter)
      .populate("memberId", "name email")
      .sort({ sentAt: -1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
}
